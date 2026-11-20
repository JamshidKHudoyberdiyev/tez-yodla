#!/usr/bin/env python3
"""
Official Azure Cognitive Services Speech Audio Generator for "Tez Yodla".
Generates offline local MP3 audio files for Uzbek translations of vocabulary words.

- Voice: uz-UZ-MadinaNeural
- Speed: -10% (<prosody rate="-10%">)
- Multi-meaning pause: SSML <break time="300ms"/>
- Audio format: mono, 24 kHz, ~32 kbps MP3, silence trimmed, peak normalized to ~-1 dB.
- Skips already generated files.
- Handles rate-limits (429) with exponential backoff.
"""

import os
import re
import sys
import io
import json
import time
import argparse
import html
import numpy as np
import soundfile as sf
import lameenc
import dotenv
import azure.cognitiveservices.speech as speechsdk

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_PATH = os.path.join(ROOT, ".env")
WORDS_UZ_JSON = os.path.join(ROOT, "scripts", "words-uz.json")
AUDIO_UZ_DIR = os.path.join(ROOT, "assets", "audio", "uz")

VOICE = "uz-UZ-MadinaNeural"
RATE = "-10%"
SAMPLE_RATE = 24000
BITRATE = 32

# Diverse test words representing all categories:
TEST_10_WORDS = [
    "apple",      # bitta ma'noli: "olma"
    "water",      # bitta ma'noli: "suv"
    "way",        # bir nechta ma'noli (;): "yo'l; usul"
    "kind",       # bir nechta ma'noli (, va ;): "xil, tur; mehribon"
    "able",       # bir nechta ma'noli (,): "qodir, qila oladigan"
    "house",      # qavs ichidagi izoh: "uy (bino)"
    "hand",       # qavs ichidagi izoh: "qo'l (kaft)"
    "look for",   # 2 so'zli ibora: "qidirmoq"
    "get up",     # 2 so'zli ibora + qavs: "turmoq (o'rindan)"
    "take off",   # 2 so'zli ibora + ko'p ma'no (;): "yechmoq; uchib ketmoq"
]


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


def split_meanings(text: str) -> list:
    """
    Split meanings by ';' or ',' outside parentheses.
    Example:
      "yo'l; usul" -> ["yo'l", "usul"]
      "xil, tur; mehribon" -> ["xil", "tur", "mehribon"]
      "uy (bino)" -> ["uy (bino)"]
      "minmoq (ot, velosiped)" -> ["minmoq (ot, velosiped)"]
    """
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
    Oddiy apostrof bilan yozilgan o' / g' ni Azure «o» deb o'qiydi — shuning uchun:
      o' / g'  -> oʻ / gʻ  (U+02BB)
      boshqa apostroflar (tutuq) -> ʼ (U+02BC)
    """
    t = re.sub(r"([oOgG])['‘’ʻʼ`´]", lambda m: m.group(1) + OKINA, text)
    return re.sub(r"['‘’ʼ`´]", TUTUQ, t)


def build_ssml(translation: str) -> tuple:
    """
    Build SSML document for uz-UZ-MadinaNeural with -10% rate and 300ms pause.
    Returns (ssml_string, billable_text_len).
    """
    # O'zbekcha harflar: oʻ, gʻ va tutuq belgisi (uz_normalize)
    t = uz_normalize(translation.strip())
    meanings = split_meanings(t)

    escaped_parts = []
    for m in meanings:
        # Escape XML entities
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
        f'<voice name="{VOICE}">'
        f'<prosody rate="{RATE}">'
        f'{body}'
        f'</prosody>'
        f'</voice>'
        f'</speak>'
    )
    # Billable characters: plain translation length
    return ssml, len(t)


def trim_silence(arr: np.ndarray, threshold: float = 0.005, padding: int = 1200) -> np.ndarray:
    """Boshi va oxiridagi jimlikni kesish."""
    non_silent = np.where(np.abs(arr) > threshold)[0]
    if len(non_silent) == 0:
        return arr
    start = max(0, non_silent[0] - padding)
    end = min(len(arr), non_silent[-1] + padding + 1)
    return arr[start:end]


def normalize_peak(arr: np.ndarray, peak: float = 0.891) -> np.ndarray:
    """Eng baland nuqtani ~-1 dB ga keltirish."""
    m = float(np.max(np.abs(arr))) if len(arr) else 0.0
    return arr if m < 1e-6 else arr * (peak / m)


def encode_mp3(arr: np.ndarray, sample_rate: int = SAMPLE_RATE, bitrate: int = BITRATE) -> bytes:
    """Mono 24 kHz MP3 ga ~32 kbps tezlikda siqish."""
    clamped = np.clip(arr, -1.0, 1.0)
    pcm = (clamped * 32767.0).astype(np.int16).tobytes()
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(bitrate)
    encoder.set_in_sample_rate(sample_rate)
    encoder.set_channels(1)
    encoder.set_quality(2)
    return encoder.encode(pcm) + encoder.flush()


def synthesize_ssml_with_retry(synthesizer, ssml: str, max_retries: int = 5) -> bytes:
    """Synthesize SSML via Azure Speech SDK with 429 rate limit backoff."""
    for attempt in range(1, max_retries + 1):
        result = synthesizer.speak_ssml_async(ssml).get()

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return result.audio_data

        if result.reason == speechsdk.ResultReason.Canceled:
            cancellation = speechsdk.SpeechSynthesisCancellationDetails(result)
            err = cancellation.error_details or ""

            # Check for 429 Too Many Requests or rate limits
            if "429" in err or "TooManyRequests" in err:
                wait_time = attempt * 2
                print(f"\n[429 Cheklov] {wait_time}s kutilmoqda (urinish {attempt}/{max_retries})...", end=" ", flush=True)
                time.sleep(wait_time)
                continue
            else:
                raise RuntimeError(f"Azure Speech bekor qilindi: {cancellation.reason}. Tafsilot: {err}")

        time.sleep(1)

    raise RuntimeError(f"{max_retries} ta urinishdan keyin ham audio olinmadi (429).")


def process_audio(raw_wav_bytes: bytes) -> bytes:
    """Decode WAV, trim silence, normalize peak to ~-1 dB, encode to mono 32kbps MP3."""
    data, sr = sf.read(io.BytesIO(raw_wav_bytes))
    if data.ndim > 1:
        data = data.mean(axis=1)
    trimmed = trim_silence(data, threshold=0.005, padding=1200)
    normed = normalize_peak(trimmed, peak=0.891)
    return encode_mp3(normed, sample_rate=SAMPLE_RATE, bitrate=BITRATE)


def main():
    parser = argparse.ArgumentParser(description="Official Azure Speech Generator for Tez Yodla")
    parser.add_argument("--test-10", action="store_true", help="10 ta har xil turdagi so'zni sinov uchun yaratish")
    parser.add_argument("--limit", type=int, default=None, help="Belgilangan miqdordagi so'zlarni yaratish")
    parser.add_argument("--all", action="store_true", help="Barcha so'zlarni yaratish")
    parser.add_argument("--word", type=str, default=None, help="Bitta so'zni yaratish")
    parser.add_argument("--force", action="store_true", help="Bor fayllarni ham qayta yaratish (tanlangan so'zlar uchun)")
    parser.add_argument("--voice", type=str, default=None, help="Ovozni almashtirish, masalan uz-UZ-SardorNeural")
    args = parser.parse_args()
    global VOICE
    if args.voice:
        VOICE = args.voice

    # Load credentials
    key, region = load_env_credentials()

    # Configure Azure Speech SDK
    speech_config = speechsdk.SpeechConfig(subscription=key, region=region)
    # Riff24Khz16BitMonoPcm: uncompressed pure 24kHz mono audio from Azure
    speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)

    # Ensure output dir exists
    os.makedirs(AUDIO_UZ_DIR, exist_ok=True)

    if not os.path.exists(WORDS_UZ_JSON):
        print(f"XATOLIK: {WORDS_UZ_JSON} topilmadi!")
        sys.exit(1)

    with open(WORDS_UZ_JSON, "r", encoding="utf-8") as f:
        all_words = json.load(f)

    # Word mapping dict for quick lookup
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
        # Default safety: test 10
        print("[OGOHLANTIRISH] Hech qanday rejim tanlanmadi. Sukut bo'yicha 10 ta sinov so'zi yaratiladi (--test-10).")
        target_items = []
        for tw in TEST_10_WORDS:
            tw_lower = tw.strip().lower()
            if tw_lower in words_map:
                target_items.append({"word": tw, "translation": words_map[tw_lower]})

    # Filter out already existing files
    pending_tasks = []
    for item in target_items:
        w = item["word"]
        tr = item["translation"]
        slug = get_slug(w)
        if not slug:
            continue
        dest = os.path.join(AUDIO_UZ_DIR, f"{slug}.mp3")
        if args.force or not (os.path.exists(dest) and os.path.getsize(dest) > 100):
            pending_tasks.append((w, slug, tr, dest))

    print(f"So'ralgan so'zlar: {len(target_items)} ta")
    print(f"Yaratilishi kerak: {len(pending_tasks)} ta")
    print(f"Mavjud (o'tkazib yuborildi): {len(target_items) - len(pending_tasks)} ta")

    if not pending_tasks:
        print("Barcha fayllar mavjud!")
        return

    created_count = 0
    total_bytes = 0
    total_chars = 0
    results_list = []

    t0 = time.time()
    for idx, (word, slug, translation, dest) in enumerate(pending_tasks, 1):
        ssml, chars = build_ssml(translation)
        total_chars += chars

        print(f"[{idx}/{len(pending_tasks)}] \"{word}\" -> \"{translation}\" (slug: {slug}) ...", end=" ", flush=True)

        try:
            raw_wav = synthesize_ssml_with_retry(synthesizer, ssml)
            final_mp3 = process_audio(raw_wav)

            with open(dest, "wb") as f:
                f.write(final_mp3)

            size = len(final_mp3)
            total_bytes += size
            created_count += 1
            results_list.append((word, translation, dest, size))
            print(f"OK ({size} bayt)")
        except Exception as e:
            print(f"\nXATOLIK ({word}): {e}")
            sys.exit(1)

        # Brief polite delay
        time.sleep(0.1)

    elapsed = time.time() - t0
    total_mb = total_bytes / (1024 * 1024)

    print("\n" + "=" * 50)
    print("NATIJALAR")
    print("=" * 50)
    print(f"Yaratilgan fayllar soni: {created_count}")
    print(f"Jami hajmi: {total_mb:.3f} MB ({total_bytes / 1024:.1f} KB)")
    print(f"Azure'ga yuborilgan jami belgilar soni: {total_chars}")
    print(f"Ketgan vaqt: {elapsed:.2f} soniya")
    print("\nYaratilgan so'zlar ro'yxati:")
    for w, tr, p, s in results_list:
        print(f"  - {w} -> \"{tr}\" -> {p} ({s} bayt)")


if __name__ == "__main__":
    main()
