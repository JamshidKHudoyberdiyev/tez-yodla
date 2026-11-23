#!/usr/bin/env python3
"""
Official Azure Cognitive Services Speech Audio Generator for "Tez Yodla" (English US and UK).
High quality voice generation:
- Azure 48 kHz 16-bit Mono PCM
- Speed: -15% (<prosody rate="-15%">)
- Audio processing via scripts/audio_quality.py (24 kHz, 64 kbps MP3, -45dB trim, -16 LUFS, <= -1 dB peak)
- ThreadPoolExecutor for fast batch synthesis with robust retries (timeouts, 429 backoff)

Voices:
- US: en-US-AvaNeural
- UK: en-GB-SoniaNeural
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

# Production directories
PROD_US_DIR = os.path.join(ROOT, "assets", "audio", "us")
PROD_UK_DIR = os.path.join(ROOT, "assets", "audio", "uk")

# Step 1 Test directories (en_test2)
TEST_US_DIR = os.path.join(ROOT, "assets", "audio", "en_test2", "us")
TEST_UK_DIR = os.path.join(ROOT, "assets", "audio", "en_test2", "uk")

RATE_DEFAULT = "-15%"

TEST_10_WORDS = [
    "general",
    "development",
    "available",
    "relationship",
    "investigation",
    "legislation",
    "precision",
    "comprehensive",
    "assimilation",
    "autopilot",
]

CONFIGS = {
    "us": {
        "lang": "en-US",
        "voice": "en-US-AvaNeural",
    },
    "uk": {
        "lang": "en-GB",
        "voice": "en-GB-SoniaNeural",
    },
}

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


def build_ssml(word: str, lang: str, voice: str, rate: str = RATE_DEFAULT) -> tuple:
    """Build SSML document for Azure Speech synthesis."""
    escaped_word = (
        word.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )

    ssml = (
        f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{lang}">'
        f'<voice name="{voice}">'
        f'<prosody rate="{rate}">'
        f"{escaped_word}"
        f"</prosody>"
        f"</voice>"
        f"</speak>"
    )
    return ssml, len(word)


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


def process_single_task(task_info: tuple, key: str, region: str, rate: str):
    """Worker function for concurrent generation."""
    word, slug, acc, dest = task_info
    conf = CONFIGS[acc]
    synthesizer = get_thread_synthesizer(key, region)

    ssml, chars = build_ssml(word, conf["lang"], conf["voice"], rate=rate)
    raw_wav_48k = synthesize_ssml_with_retry(synthesizer, ssml)
    mp3_bytes, stats = process_azure_pcm_to_mp3(raw_wav_48k)

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(mp3_bytes)

    return {
        "word": word,
        "slug": slug,
        "accent": acc.upper(),
        "path": dest,
        "size": len(mp3_bytes),
        "chars": chars,
        "stats": stats,
    }


def is_new_quality_file(path: str) -> bool:
    """Check if file exists and was generated as new 64kbps MP3 (size >= 5000 bytes)."""
    if not os.path.exists(path):
        return False
    size = os.path.getsize(path)
    # Old kokoro 32kbps files are usually 1.5 - 3.5 KB. New 64kbps are typically > 5 KB.
    # Also check if modified today
    mtime = os.path.getmtime(path)
    now = time.time()
    return size >= 4500 and (now - mtime < 7200)


def main():
    parser = argparse.ArgumentParser(description="High-Quality Azure Speech Generator for Tez Yodla (EN US/UK)")
    parser.add_argument("--test-10", action="store_true", help="1-QADAM: 10 ta sinov so'zini en_test2/{us,uk} papkasiga yaratish")
    parser.add_argument("--all", action="store_true", help="2-QADAM: Barcha so'zlarni assets/audio/{us,uk} ga yaratish (ustidan yozadi)")
    parser.add_argument("--word", type=str, default=None, help="Bitta so'zni yaratish")
    parser.add_argument("--accent", choices=["both", "us", "uk"], default="both", help="Qaysi aksent(lar): both, us, uk")
    parser.add_argument("--rate", type=str, default=RATE_DEFAULT, help="Tezlik (sukut: -15%)")
    parser.add_argument("--dest-dir", type=str, default=None, help="Maxsus saqlash papkasi")
    parser.add_argument("--force", action="store_true", help="Bor fayllarni ham qayta yaratish")
    parser.add_argument("--resume", action="store_true", default=True, help="Bugun yaratilgan 64kbps fayllarni o'tkazib yuborish")
    parser.add_argument("--workers", type=int, default=4, help="Parallel ishchilar soni (sukut: 4)")
    args = parser.parse_args()

    key, region = load_env_credentials()

    is_test = args.test_10 or (not args.all and not args.word and not args.dest_dir)
    if is_test:
        print("=== 1-QADAM: SINOV REJIMI (10 TA SO'Z - en_test2) ===")
        print(f"Tezlik: {args.rate}")
        print(f"Chiqish papkalari: {TEST_US_DIR} va {TEST_UK_DIR}")
        target_words = TEST_10_WORDS
        us_dir = TEST_US_DIR
        uk_dir = TEST_UK_DIR
    elif args.dest_dir:
        target_words = [args.word.strip()] if args.word else TEST_10_WORDS
        us_dir = os.path.join(args.dest_dir, "us")
        uk_dir = os.path.join(args.dest_dir, "uk")
    elif args.word:
        print(f"=== BITTA SO'Z REJIMI: '{args.word}' ===")
        target_words = [args.word.strip()]
        us_dir = PROD_US_DIR
        uk_dir = PROD_UK_DIR
    elif args.all:
        print("=== 2-QADAM: BARCHA SO'ZLAR (PRODUCTION US & UK) ===")
        print(f"Tezlik: {args.rate}")
        print(f"Chiqish papkalari: {PROD_US_DIR} va {PROD_UK_DIR}")
        if not os.path.exists(WORDS_UZ_JSON):
            print(f"XATOLIK: {WORDS_UZ_JSON} topilmadi!")
            sys.exit(1)
        with open(WORDS_UZ_JSON, "r", encoding="utf-8") as f:
            words_data = json.load(f)
        seen = set()
        target_words = []
        for item in words_data:
            w = item["word"].strip()
            if w.lower() not in seen:
                seen.add(w.lower())
                target_words.append(w)
        us_dir = PROD_US_DIR
        uk_dir = PROD_UK_DIR

    os.makedirs(us_dir, exist_ok=True)
    os.makedirs(uk_dir, exist_ok=True)

    accents_to_run = ["us", "uk"] if args.accent == "both" else [args.accent]

    pending_tasks = []
    skipped_count = 0
    for acc in accents_to_run:
        out_dir = us_dir if acc == "us" else uk_dir
        for w in target_words:
            slug = get_slug(w)
            if not slug:
                continue
            dest = os.path.join(out_dir, f"{slug}.mp3")
            if not is_test and args.resume and is_new_quality_file(dest):
                skipped_count += 1
                continue
            if args.force or is_test or not (os.path.exists(dest) and os.path.getsize(dest) > 100):
                pending_tasks.append((w, slug, acc, dest))

    total_tasks = len(target_words) * len(accents_to_run)
    print(f"Jami so'ralgan topshiriqlar: {total_tasks} ta")
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
            executor.submit(process_single_task, task, key, region, args.rate): task
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
                print(f"\nXATOLIK ({task[0]}, {task[2]}): {e}")
                failed_tasks.append(task)

    # Retry failed tasks sequentially with generous pause
    if failed_tasks:
        print(f"\nQayta urinish: {len(failed_tasks)} ta xatolik bergan topshiriq...")
        time.sleep(2)
        for task in failed_tasks:
            try:
                res = process_single_task(task, key, region, args.rate)
                created_count += 1
                total_bytes += res["size"]
                total_chars += res["chars"]
                results_list.append(res)
                print(f"Qayta urinish muvaffaqiyatli: {task[0]} ({task[2]})")
            except Exception as e:
                print(f"Tugallanmadi ({task[0]}): {e}")

    elapsed = time.time() - t0
    total_mb = total_bytes / (1024 * 1024)

    print("\n" + "=" * 60)
    print("NATIJALAR (EN US & UK)")
    print("=" * 60)
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
            f"  - [{item['accent']}] {item['word']:<12} ({fname}): "
            f"{st['final_measure']:>6.2f} {st['final_type']}, "
            f"peak: {st['final_peak_db']:>6.2f} dB, "
            f"davomiyligi: {st['duration']:.2f}s, "
            f"hajmi: {item['size']} B{att_str}"
        )


if __name__ == "__main__":
    main()
