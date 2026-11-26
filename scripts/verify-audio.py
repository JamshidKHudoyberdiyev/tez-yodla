#!/usr/bin/env python3
"""
Official Azure Speech-to-Text Audio Verification Script for "Tez Yodla".

- Recognizes audio files via Azure STT (en-US, en-GB, uz-UZ).
- Compares recognized text with expected word (case-insensitive, punctuation-stripped).
- Logs mismatches to scripts/audio-check.csv: slug, kutilgan, tanilgan, ishonch (confidence).
- For mismatches, attempts a retry regeneration at rate="-20%" and re-verifies.
- Parallel processing via ThreadPoolExecutor.
- Resumable: saves progress to scripts/audio-verify-progress.json so already verified files aren't re-run.
- Reports audio minutes consumed for STT.
"""

import os
import re
import sys
import csv
import json
import time
import argparse
import tempfile
import threading
import concurrent.futures
import numpy as np
import scipy.signal as signal
import soundfile as sf
import dotenv
import azure.cognitiveservices.speech as speechsdk

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_PATH = os.path.join(ROOT, ".env")
WORDS_UZ_JSON = os.path.join(ROOT, "scripts", "words-uz.json")
AUDIO_CHECK_CSV = os.path.join(ROOT, "scripts", "audio-check.csv")
PROGRESS_FILE = os.path.join(ROOT, "scripts", "audio-verify-progress.json")

PROD_US_DIR = os.path.join(ROOT, "assets", "audio", "us")
PROD_UK_DIR = os.path.join(ROOT, "assets", "audio", "uk")
PROD_UZ_DIR = os.path.join(ROOT, "assets", "audio", "uz")

TEST_US_DIR = os.path.join(ROOT, "assets", "audio", "en_test2", "us")
TEST_UK_DIR = os.path.join(ROOT, "assets", "audio", "en_test2", "uk")

from audio_quality import process_azure_pcm_to_mp3

_thread_local = threading.local()


def get_slug(word: str) -> str:
    """Inglizcha so'zdan fayl slug'i."""
    return re.sub(r"[^a-z0-9]+", "-", word.lower().strip()).strip("-")


def load_env_credentials():
    """Load credentials from .env safely without printing the key."""
    if not os.path.exists(ENV_PATH):
        print(f"XATOLIK: {ENV_PATH} fayli topilmadi!")
        sys.exit(1)

    dotenv.load_dotenv(ENV_PATH)
    key = os.getenv("AZURE_SPEECH_KEY", "").strip()
    region = os.getenv("AZURE_SPEECH_REGION", "").strip()

    if not key or not region:
        print("XATOLIK: .env faylida AZURE_SPEECH_KEY yoki AZURE_SPEECH_REGION topilmadi!")
        sys.exit(1)

    return key, region


def get_thread_synthesizer(key: str, region: str):
    """Thread-local synthesizer instance."""
    if not hasattr(_thread_local, "synthesizer"):
        speech_config = speechsdk.SpeechConfig(subscription=key, region=region)
        speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Riff48Khz16BitMonoPcm)
        _thread_local.synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
    return _thread_local.synthesizer


def clean_text(s: str) -> str:
    """Lowercase and remove all punctuation and extra spaces."""
    return re.sub(r"[^a-zA-Z0-9\u0400-\u04FFʻʼ]+", " ", s.lower()).strip()


def load_word_maps():
    """Load slug -> expected en word and slug -> expected uz translation maps."""
    en_map = {}
    uz_map = {}
    if os.path.exists(WORDS_UZ_JSON):
        with open(WORDS_UZ_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        for item in data:
            w = item["word"].strip()
            tr = item.get("translation", "").strip()
            s = get_slug(w)
            if s:
                en_map[s] = w
                uz_map[s] = tr

    test_10 = [
        ("apple", "olma"),
        ("passport", "pasport"),
        ("beautiful", "chiroyli"),
        ("weather", "ob-havo"),
        ("school", "maktab"),
        ("take off", "yechmoq; uchib ketmoq"),
        ("look for", "qidirmoq"),
        ("thought", "fikr"),
        ("through", "orqali"),
        ("comfortable", "qulay"),
    ]
    for tw, tr in test_10:
        s = get_slug(tw)
        if s not in en_map:
            en_map[s] = tw
        if s not in uz_map:
            uz_map[s] = tr

    return en_map, uz_map


def recognize_single_file(key: str, region: str, audio_path: str, lang: str) -> tuple[str, float, float, str]:
    """Recognize single MP3 file via Azure STT."""
    try:
        data, sr = sf.read(audio_path)
        if data.ndim > 1:
            data = data.mean(axis=1)
        duration_sec = len(data) / sr

        # Resample to 16kHz for STT
        if sr != 16000:
            import math
            gcd = math.gcd(16000, sr)
            up = 16000 // gcd
            down = sr // gcd
            d16 = signal.resample_poly(data, up=up, down=down)
        else:
            d16 = data
    except Exception as e:
        return f"[READ_ERROR: {e}]", 0.0, 0.0, "Error"

    tmp_path = os.path.join(tempfile.gettempdir(), f"stt_{os.getpid()}_{threading.get_ident()}_{time.time_ns()}.wav")
    sf.write(tmp_path, d16, 16000, format="WAV", subtype="PCM_16")

    recognized_text = ""
    confidence = 0.0
    reason_str = "NoMatch"

    for attempt in range(6):
        try:
            stt_config = speechsdk.SpeechConfig(subscription=key, region=region)
            stt_config.output_format = speechsdk.OutputFormat.Detailed
            audio_config = speechsdk.AudioConfig(filename=tmp_path)
            recognizer = speechsdk.SpeechRecognizer(speech_config=stt_config, audio_config=audio_config, language=lang)
            result = recognizer.recognize_once_async().get()

            reason_str = str(result.reason)
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                try:
                    j = json.loads(result.json)
                    nbest = j.get("NBest", [{}])[0]
                    recognized_text = nbest.get("Lexical", "") or nbest.get("Display", "")
                    confidence = float(nbest.get("Confidence", 1.0))
                except Exception:
                    recognized_text = result.text or ""
                    confidence = 1.0
                break
            elif result.reason == speechsdk.ResultReason.NoMatch:
                recognized_text = ""
                confidence = 0.0
                break
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation = speechsdk.CancellationDetails(result)
                err_details = cancellation.error_details or ""
                if "4429" in err_details or "concurrent" in err_details.lower():
                    time.sleep(1.5 + attempt * 2.0)
                    continue
                if "401" in err_details or "authentication" in err_details.lower():
                    time.sleep(2.0 + attempt * 2.5)
                    continue
                recognized_text = f"[CANCELED: {err_details}]"
                confidence = 0.0
                break
        except Exception as e:
            if attempt < 5:
                time.sleep(1.5 + attempt * 1.5)
                continue
            recognized_text = f"[EXCEPTION: {e}]"
            confidence = 0.0
            break
        finally:
            try:
                del recognizer
                del audio_config
            except Exception:
                pass

    try:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    except Exception:
        pass

    return recognized_text, confidence, duration_sec, reason_str


def retry_synthesize_word(synthesizer, text: str, lang: str, voice: str, dest_path: str, rate: str = "-20%"):
    """Regenerates audio at slower speed (rate='-20%') for retry."""
    try:
        escaped = (
            text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        )
        ssml = (
            f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{lang}">'
            f'<voice name="{voice}">'
            f'<prosody rate="{rate}">'
            f"{escaped}"
            f"</prosody>"
            f"</voice>"
            f"</speak>"
        )
        res = synthesizer.speak_ssml_async(ssml).get()
        if res.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            mp3_bytes, _ = process_azure_pcm_to_mp3(res.audio_data)
            with open(dest_path, "wb") as f:
                f.write(mp3_bytes)
            return True
    except Exception:
        pass
    return False


def verify_task_worker(task: dict, key: str, region: str, no_retry: bool):
    """Worker function for single file verification."""
    fpath = task["path"]
    slug = task["slug"]
    expected = task["expected"]
    lang = task["lang"]
    voice = task["voice"]

    rec_text, conf, dur, reason = recognize_single_file(key, region, fpath, lang)

    c_rec = clean_text(rec_text)
    c_exp = clean_text(expected)

    is_match = (c_rec == c_exp)
    # Uzbek multi-meanings match
    if not is_match and lang == "uz-UZ":
        parts = [clean_text(p) for p in re.split(r"[;,]+", expected) if clean_text(p)]
        if c_rec in parts or any(p in c_rec for p in parts) or any(c_rec in p for p in parts):
            is_match = True

    if not is_match and not no_retry and not rec_text.startswith("["):
        synthesizer = get_thread_synthesizer(key, region)
        retry_ok = retry_synthesize_word(synthesizer, expected, lang, voice, fpath, rate="-20%")
        if retry_ok:
            rec_text2, conf2, dur2, _ = recognize_single_file(key, region, fpath, lang)
            dur += dur2
            c_rec2 = clean_text(rec_text2)
            if c_rec2 == c_exp:
                is_match = True
                rec_text = rec_text2
                conf = conf2
            elif lang == "uz-UZ":
                parts = [clean_text(p) for p in re.split(r"[;,]+", expected) if clean_text(p)]
                if c_rec2 in parts or any(p in c_rec2 for p in parts) or any(c_rec2 in p for p in parts):
                    is_match = True
                    rec_text = rec_text2
                    conf = conf2
            else:
                rec_text = rec_text2
                conf = conf2

    return {
        "slug": slug,
        "kutilgan": expected,
        "tanilgan": rec_text,
        "ishonch": conf,
        "lang": lang,
        "fayl": fpath,
        "dur": dur,
        "match": is_match,
    }


def main():
    parser = argparse.ArgumentParser(description="Azure STT Verification for Tez Yodla Audio")
    parser.add_argument("--test-10", action="store_true", help="1-qadam test papkalarini tekshirish (en_test2)")
    parser.add_argument("--all", action="store_true", help="Barcha ishlab chiqarish fayllarini tekshirish (us, uk, uz)")
    parser.add_argument("--en", action="store_true", help="Faqat inglizcha ishlab chiqarish fayllarini tekshirish (us, uk)")
    parser.add_argument("--new-only", action="store_true", help="Faqat yangi qo'shilgan so'zlarni tekshirish")
    parser.add_argument("--canceled-only", action="store_true", help="Faqat CANCELED/xato bergan so'zlarni qayta tekshirish")
    parser.add_argument("--dir", type=str, default=None, help="Bitta papkani tekshirish")
    parser.add_argument("--lang", type=str, default=None, help="STT tili (en-US, en-GB, uz-UZ)")
    parser.add_argument("--no-retry", action="store_true", help="Mos kelmaganlarni qayta sintez qilmaslik")
    parser.add_argument("--resume", action="store_true", default=True, help="Avval tekshirilganlarni o'tkazib yuborish")
    parser.add_argument("--workers", type=int, default=3, help="Parallel ishchilar soni (sukut: 3)")
    args = parser.parse_args()

    key, region = load_env_credentials()
    en_map, uz_map = load_word_maps()

    new_slugs = set()
    if os.path.exists(WORDS_UZ_JSON):
        try:
            with open(WORDS_UZ_JSON, "r", encoding="utf-8") as f:
                w_list = json.load(f)
            # 1461 old words, items beyond 1461 are new
            if len(w_list) > 1461:
                for item in w_list[1461:]:
                    s = get_slug(item["word"])
                    if s:
                        new_slugs.add(s)
        except Exception:
            pass

    is_default = not args.test_10 and not args.all and not args.dir and not args.en
    only_new = args.new_only or is_default

    dir_targets = []
    if args.test_10:
        dir_targets = [
            (TEST_US_DIR, "en-US", "en-US-AvaNeural", en_map),
            (TEST_UK_DIR, "en-GB", "en-GB-SoniaNeural", en_map),
        ]
    elif args.all:
        dir_targets = [
            (PROD_US_DIR, "en-US", "en-US-AvaNeural", en_map),
            (PROD_UK_DIR, "en-GB", "en-GB-SoniaNeural", en_map),
            (PROD_UZ_DIR, "uz-UZ", "uz-UZ-MadinaNeural", uz_map),
        ]
    elif args.en or is_default:
        dir_targets = [
            (PROD_US_DIR, "en-US", "en-US-AvaNeural", en_map),
            (PROD_UK_DIR, "en-GB", "en-GB-SoniaNeural", en_map),
        ]
    elif args.dir:
        lang = args.lang or ("en-US" if "us" in args.dir.lower() else "en-GB" if "uk" in args.dir.lower() else "uz-UZ")
        voice = "en-US-AvaNeural" if lang == "en-US" else "en-GB-SoniaNeural" if lang == "en-GB" else "uz-UZ-MadinaNeural"
        wmap = uz_map if lang == "uz-UZ" else en_map
        dir_targets = [(args.dir, lang, voice, wmap)]

    # Load existing progress if resuming
    verified_cache = {}
    if args.resume and os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                verified_cache = json.load(f)
            print(f"Oldingi progress yuklandi: {len(verified_cache)} ta fayl allaqachon tekshirilgan.")
        except Exception:
            verified_cache = {}

    tasks = []
    skipped_count = 0

    if args.canceled_only:
        for fpath, item in list(verified_cache.items()):
            rec = item.get("tanilgan", "")
            if rec.startswith("[CANCELED") or rec.startswith("[EXCEPTION") or "401" in rec or "4429" in rec:
                tasks.append({
                    "path": fpath,
                    "slug": item.get("slug") or os.path.splitext(os.path.basename(fpath))[0],
                    "expected": item.get("kutilgan", ""),
                    "lang": item.get("lang", "en-US"),
                    "voice": "en-US-AvaNeural" if item.get("lang") == "en-US" else "en-GB-SoniaNeural" if item.get("lang") == "en-GB" else "uz-UZ-MadinaNeural",
                })
                del verified_cache[fpath]
        skipped_count = len(verified_cache)
        total_all_files = len(tasks) + skipped_count
        print(f"Qayta tekshiriladigan CANCELED so'zlar soni: {len(tasks)} ta")
    else:
        for d, lang, voice, wmap in dir_targets:
            if not os.path.exists(d):
                print(f"OGOHLANTIRISH: Papka mavjud emas: {d}")
                continue
            files = sorted([f for f in os.listdir(d) if f.endswith(".mp3")])
            for f in files:
                slug = os.path.splitext(f)[0]
                if only_new and new_slugs and slug not in new_slugs:
                    continue
                fpath = os.path.join(d, f)
                if fpath in verified_cache:
                    skipped_count += 1
                    continue
                expected = wmap.get(slug, slug.replace("-", " "))
                tasks.append({
                    "path": fpath,
                    "slug": slug,
                    "expected": expected,
                    "lang": lang,
                    "voice": voice,
                })
        total_all_files = len(tasks) + skipped_count
    print("=== AZURE SPEECH-TO-TEXT AVTOMATIK TEKSHIRUV ===")
    print(f"Jami fayllar: {total_all_files} ta")
    print(f"O'tkazib yuborildi (avval tekshirilgan): {skipped_count} ta")
    print(f"Tekshirilishi kerak bo'lgan: {len(tasks)} ta")
    print(f"Parallel ishchilar: {args.workers}")
    sys.stdout.flush()

    if not tasks and not verified_cache:
        print("Hech qanday fayl topilmadi.")
        return

    # Count previous cache stats
    matched_count = sum(1 for v in verified_cache.values() if v.get("match"))
    mismatched_count = sum(1 for v in verified_cache.values() if not v.get("match"))
    total_audio_sec = sum(v.get("dur", 0.0) for v in verified_cache.values())

    t0 = time.time()
    save_lock = threading.Lock()

    def save_progress():
        with save_lock:
            with open(PROGRESS_FILE, "w", encoding="utf-8") as pf:
                json.dump(verified_cache, pf, ensure_ascii=False)

    if tasks:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(verify_task_worker, task, key, region, args.no_retry): task
                for task in tasks
            }

            for idx, fut in enumerate(concurrent.futures.as_completed(futures), 1):
                try:
                    res = fut.result()
                    total_audio_sec += res["dur"]
                    if res["match"]:
                        matched_count += 1
                    else:
                        mismatched_count += 1

                    verified_cache[res["fayl"]] = res
                except Exception as e:
                    print(f"\nXatolik: {e}")

                if args.workers == 1:
                    time.sleep(0.25)

                if idx % 10 == 0 or idx == len(tasks):
                    save_progress()
                    percent = (idx / len(tasks)) * 100
                    total_done = skipped_count + idx
                    total_pct = (total_done / total_all_files) * 100
                    print(f"[{idx}/{len(tasks)}] ({percent:.1f}% | Jami: {total_pct:.1f}%) tekshirildi... (Mos: {matched_count}, Farq: {mismatched_count})")
                    sys.stdout.flush()

    save_progress()

    # Reconstruct audio-check.csv from all verified cache
    mismatch_rows = []
    for fpath, item in verified_cache.items():
        if not item.get("match"):
            mismatch_rows.append({
                "slug": item["slug"],
                "kutilgan": item["kutilgan"],
                "tanilgan": item["tanilgan"],
                "ishonch": f"{item['ishonch']:.4f}",
                "lang": item["lang"],
                "fayl": item["fayl"],
            })

    with open(AUDIO_CHECK_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["slug", "kutilgan", "tanilgan", "ishonch", "lang", "fayl"])
        writer.writeheader()
        for row in mismatch_rows:
            writer.writerow(row)

    elapsed = time.time() - t0
    total_minutes = total_audio_sec / 60.0

    print("\n" + "=" * 60)
    print("TEKSHIRUV YAKUNI")
    print("=" * 60)
    print(f"Jami tekshirilgan fayllar: {len(verified_cache)}")
    print(f"Mos kelganlar: {matched_count} ({matched_count / len(verified_cache) * 100:.1f}%)")
    print(f"Mos kelmaganlar: {mismatched_count}")
    print(f"STT uchun sarflangan audio vaqti: {total_minutes:.2f} daqiqa ({total_audio_sec:.1f} soniya)")
    print(f"Ketgan vaqt: {elapsed:.2f} soniya ({elapsed / 60.0:.2f} daqiqa)")
    print(f"Hisobot fayli: {AUDIO_CHECK_CSV}")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
