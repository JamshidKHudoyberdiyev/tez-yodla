#!/usr/bin/env python3
"""
Official Azure Cognitive Services Speech Audio Generator for "Tez Yodla".
Generates offline local MP3 audio files for Uzbek translations of vocabulary words.

- Voice: uz-UZ-MadinaNeural
- Speed: -10% (<prosody rate="-10%">)
- Multi-meaning pause: SSML <break time="300ms"/>
- Audio format: Azure 48 kHz PCM -> 24 kHz mono 64 kbps MP3 via scripts/audio_quality.py
- Normalization: -16 LUFS, peak <= -1 dB (linear attenuation), -45dB trim with 80ms/150ms margins and 10ms fade
- ThreadPoolExecutor for fast batch synthesis with robust retries
"""

import os
import re
import sys
import json
import time
import argparse
import threading
import concurrent.futures
import dotenv
import azure.cognitiveservices.speech as speechsdk

# Import common audio quality processor
from audio_quality import process_azure_pcm_to_mp3

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_PATH = os.path.join(ROOT, ".env")
WORDS_UZ_JSON = os.path.join(ROOT, "scripts", "words-uz.json")
AUDIO_UZ_DIR = os.path.join(ROOT, "assets", "audio", "uz")

VOICE = "uz-UZ-MadinaNeural"
RATE = "-10%"

TEST_10_WORDS = [
    "apple",
    "water",
    "way",
    "kind",
    "able",
    "house",
    "hand",
    "look for",
    "get up",
    "take off",
]

_thread_local = threading.local()


def get_slug(word: str) -> str:
    """Inglizcha so'zdan fayl slug'i (kichik harf, harf/raqamdan boshqa belgilar o'rniga -)."""
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


def split_meanings(text: str) -> list:
    """Split meanings by ';' or ',' outside parentheses."""
    parts = []
    current = []
    paren_depth = 0

    for ch in text:
        if ch == '(':
            paren_depth += 1
            current.append(ch)
        elif ch == ')':
            if paren_depth > 0:
                paren_depth -= 1
            current.append(ch)
        elif ch in (';', ',') and paren_depth == 0:
            part = "".join(current).strip()
            if part:
                parts.append(part)
            current = []
        else:
            current.append(ch)

    last = "".join(current).strip()
    if last:
        parts.append(last)

    return parts if parts else [text.strip()]


OKINA = "\u02bb"   # ʻ — oʻ, gʻ uchun (Azure o'zbekcha ovozi aynan shu belgini kutadi)
TUTUQ = "\u02bc"   # ʼ — tutuq belgisi (ma'no, sur'at)


def uz_normalize(text: str) -> str:
    """O'zbek lotin yozuvini Azure tushunadigan shaklga keltiradi.
    o' / g'  -> oʻ / gʻ  (U+02BB)
    boshqa apostroflar (tutuq) -> ʼ (U+02BC)
    """
    t = re.sub(r"([oOgG])['‘’ʻʼ`´]", lambda m: m.group(1) + OKINA, text)
    return re.sub(r"['‘’ʼ`´]", TUTUQ, t)


def build_ssml(translation: str, voice: str = VOICE, rate: str = RATE) -> tuple:
    """Build SSML document for uz-UZ-MadinaNeural with rate and 300ms pause."""
    t = uz_normalize(translation.strip())
    meanings = split_meanings(t)

    escaped_parts = []
    for m in meanings:
        escaped = (
            m.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
             .replace('"', "&quot;")
             .replace("'", "&apos;")
        )
        escaped_parts.append(escaped)

    body = ' <break time="300ms"/> '.join(escaped_parts)

    ssml = (
        f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="uz-UZ">'
        f'<voice name="{voice}">'
        f'<prosody rate="{rate}">'
        f'{body}'
        f'</prosody>'
        f'</voice>'
        f'</speak>'
    )
    return ssml, len(t)


def synthesize_ssml_with_retry(synthesizer, ssml: str, max_retries: int = 6) -> bytes:
    """Synthesize SSML via Azure Speech SDK with robust exponential backoff for timeouts/429."""
    for attempt in range(1, max_retries + 1):
        try:
            result = synthesizer.speak_ssml_async(ssml).get()

            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                return result.audio_data

            if result.reason == speechsdk.ResultReason.Canceled:
                cancellation = speechsdk.SpeechSynthesisCancellationDetails(result)
                err = cancellation.error_details or ""

                if attempt < max_retries:
                    wait_time = attempt * 2 + 1
                    time.sleep(wait_time)
                    continue
                else:
                    raise RuntimeError(f"Azure Speech bekor qilindi: {cancellation.reason}. Tafsilot: {err}")

        except Exception as e:
            if attempt < max_retries:
                wait_time = attempt * 2 + 1
                time.sleep(wait_time)
                continue
            else:
                raise e

        time.sleep(0.5)

    raise RuntimeError(f"{max_retries} ta urinishdan keyin ham audio olinmadi.")


def process_single_task(task_info: tuple, key: str, region: str, voice: str, rate: str):
    """Worker function for concurrent generation."""
    word, slug, translation, dest = task_info
    synthesizer = get_thread_synthesizer(key, region)

    ssml, chars = build_ssml(translation, voice=voice, rate=rate)
    raw_wav_48k = synthesize_ssml_with_retry(synthesizer, ssml)
    mp3_bytes, stats = process_azure_pcm_to_mp3(raw_wav_48k)

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(mp3_bytes)

    return {
        "word": word,
        "slug": slug,
        "translation": translation,
        "path": dest,
        "size": len(mp3_bytes),
        "chars": chars,
        "stats": stats,
    }


def is_new_quality_file(path: str) -> bool:
    """Check if file exists and was generated as new 64kbps MP3 (size >= 5000 bytes and recent)."""
    if not os.path.exists(path):
        return False
    size = os.path.getsize(path)
    mtime = os.path.getmtime(path)
    now = time.time()
    return size >= 4500 and (now - mtime < 7200)


def main():
    parser = argparse.ArgumentParser(description="Official High-Quality Azure Speech Generator for Tez Yodla (UZ)")
    parser.add_argument("--test-10", action="store_true", help="10 ta har xil turdagi so'zni sinov uchun yaratish")
    parser.add_argument("--limit", type=int, default=None, help="Belgilangan miqdordagi so'zlarni yaratish")
    parser.add_argument("--all", action="store_true", help="Barcha so'zlarni yaratish")
    parser.add_argument("--word", type=str, default=None, help="Bitta so'zni yaratish")
    parser.add_argument("--force", action="store_true", help="Bor fayllarni ham qayta yaratish")
    parser.add_argument("--voice", type=str, default=None, help="Ovozni almashtirish")
    parser.add_argument("--dest-dir", type=str, default=AUDIO_UZ_DIR, help="Chiqish papkasi")
    parser.add_argument("--workers", type=int, default=4, help="Parallel ishchilar soni (sukut: 4)")
    parser.add_argument("--resume", action="store_true", default=True, help="Bugun yangi sifatda yaratilgan fayllarni o'tkazib yuborish")
    args = parser.parse_args()

    voice = args.voice or VOICE
    key, region = load_env_credentials()

    os.makedirs(args.dest_dir, exist_ok=True)

    if not os.path.exists(WORDS_UZ_JSON):
        print(f"XATOLIK: {WORDS_UZ_JSON} topilmadi!")
        sys.exit(1)

    with open(WORDS_UZ_JSON, "r", encoding="utf-8") as f:
        all_words = json.load(f)

    words_map = {item["word"].strip().lower(): item["translation"] for item in all_words}

    if args.word:
        w_lower = args.word.strip().lower()
        if w_lower not in words_map:
            print(f"Xatolik: '{args.word}' so'zlar ro'yxatida topilmadi.")
            sys.exit(1)
        target_items = [{"word": args.word, "translation": words_map[w_lower]}]
    elif args.test_10:
        target_items = []
        for tw in TEST_10_WORDS:
            tw_lower = tw.strip().lower()
            if tw_lower in words_map:
                target_items.append({"word": tw, "translation": words_map[tw_lower]})
            else:
                print(f"Ogohlantirish: Test so'zi '{tw}' lug'atda topilmadi.")
    elif args.limit:
        target_items = all_words[:args.limit]
    elif args.all:
        target_items = all_words
    else:
        print("[OGOHLANTIRISH] Hech qanday rejim tanlanmadi. Sinov uchun 10 ta so'z tanlanadi.")
        target_items = []
        for tw in TEST_10_WORDS:
            tw_lower = tw.strip().lower()
            if tw_lower in words_map:
                target_items.append({"word": tw, "translation": words_map[tw_lower]})

    pending_tasks = []
    skipped_count = 0
    for item in target_items:
        w = item["word"]
        tr = item["translation"]
        slug = get_slug(w)
        if not slug:
            continue
        dest = os.path.join(args.dest_dir, f"{slug}.mp3")
        if args.resume and is_new_quality_file(dest):
            skipped_count += 1
            continue
        if args.force or not (os.path.exists(dest) and os.path.getsize(dest) > 100):
            pending_tasks.append((w, slug, tr, dest))

    print(f"So'ralgan so'zlar: {len(target_items)} ta")
    print(f"Bajarilishi kerak bo'lgan: {len(pending_tasks)} ta")
    print(f"Yangi sifatda mavjud (o'tkazib yuborildi): {skipped_count} ta")

    if not pending_tasks:
        print("Barcha fayllar yangi sifatda to'liq mavjud!")
        return

    print(f"\nParallel ishga tushirish (workers: {args.workers})...")
    created_count = 0
    total_bytes = 0
    total_chars = 0
    results_list = []
    failed_tasks = []

    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(process_single_task, task, key, region, voice, RATE): task
            for task in pending_tasks
        }

        for idx, fut in enumerate(concurrent.futures.as_completed(futures), 1):
            task = futures[fut]
            try:
                res = fut.result()
                created_count += 1
                total_bytes += res["size"]
                total_chars += res["chars"]
                results_list.append(res)
                if idx % 50 == 0 or idx == len(pending_tasks):
                    percent = (idx / len(pending_tasks)) * 100
                    print(f"[{idx}/{len(pending_tasks)}] ({percent:.1f}%) yuklandi...")
            except Exception as e:
                print(f"\nXATOLIK ({task[0]}): {e}")
                failed_tasks.append(task)

    # Retry failed tasks sequentially
    if failed_tasks:
        print(f"\nQayta urinish: {len(failed_tasks)} ta xatolik bergan topshiriq...")
        time.sleep(2)
        for task in failed_tasks:
            try:
                res = process_single_task(task, key, region, voice, RATE)
                created_count += 1
                total_bytes += res["size"]
                total_chars += res["chars"]
                results_list.append(res)
                print(f"Qayta urinish muvaffaqiyatli: {task[0]}")
            except Exception as e:
                print(f"Tugallanmadi ({task[0]}): {e}")

    elapsed = time.time() - t0
    total_mb = total_bytes / (1024 * 1024)

    print("\n" + "=" * 50)
    print("NATIJALAR (UZ)")
    print("=" * 50)
    print(f"Yangi yaratilgan fayllar soni: {created_count}")
    print(f"Jami hajmi: {total_mb:.3f} MB ({total_bytes / 1024:.1f} KB)")
    print(f"Azure'ga yuborilgan jami belgilar soni: {total_chars}")
    print(f"Ketgan vaqt: {elapsed:.2f} soniya ({elapsed / 60.0:.2f} daqiqa)")

    samples = results_list[:3] + results_list[-3:] if len(results_list) > 6 else results_list
    print("\nTanlangan fayllar o'lchovlari:")
    for item in samples:
        st = item["stats"]
        fname = os.path.basename(item["path"])
        att_str = " (attenuated)" if st["attenuated"] else ""
        print(
            f"  - \"{item['word']}\" -> \"{item['translation']}\" ({fname}): "
            f"{st['final_measure']:>6.2f} {st['final_type']}, "
            f"peak: {st['final_peak_db']:>6.2f} dB, "
            f"davomiyligi: {st['duration']:.2f}s, "
            f"hajmi: {item['size']} B{att_str}"
        )


if __name__ == "__main__":
    main()
