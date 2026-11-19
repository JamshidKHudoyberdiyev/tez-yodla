#!/usr/bin/env python3
"""
Kokoro-82M TTS audio generator for "Tez Yodla"
Generates offline local MP3 audio files for all unique words in WORDS.
- US: "af_heart"
- UK: "bf_emma"
- Format: mono, 24 kHz, ~32 kbps, silence trimmed.
- Skips already generated files.
"""

import os
import re
import sys
import json
import time

try:
    import numpy as np
    import torch
    import lameenc
    from kokoro import KPipeline
except ImportError as e:
    print(f"XATOLIK: Kerakli kutubxona o'rnatilmagan: {e}")
    print("Iltimos, '.venv' muhitini tekshiring va talab qilinadigan paketlarni o'rnating.")
    sys.exit(1)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WORDS_JSON = os.path.join(ROOT, "scripts", "words.json")
AUDIO_DIR = os.path.join(ROOT, "assets", "audio")
US_DIR = os.path.join(AUDIO_DIR, "us")
UK_DIR = os.path.join(AUDIO_DIR, "uk")

def get_slug(word: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", word.lower().strip()).strip("-")

def load_words():
    if not os.path.exists(WORDS_JSON):
        print(f"Xatolik: {WORDS_JSON} topilmadi. Avval so'zlar ro'yxatini yarating.")
        sys.exit(1)
    with open(WORDS_JSON, "r", encoding="utf-8") as f:
        words = json.load(f)
    # Deduplicate and sort
    unique_words = sorted(list(set(w.strip().lower() for w in words if w.strip())))
    return unique_words

def trim_silence(arr: np.ndarray, threshold: float = 0.005, padding: int = 1200) -> np.ndarray:
    non_silent = np.where(np.abs(arr) > threshold)[0]
    if len(non_silent) == 0:
        return arr
    start = max(0, non_silent[0] - padding)
    end = min(len(arr), non_silent[-1] + padding + 1)
    return arr[start:end]

def normalize_peak(arr: np.ndarray, peak: float = 0.89) -> np.ndarray:
    """Eng baland nuqtani ~-1 dB ga keltiradi, shunda so'zlar telefon ovozidan past eshitilmaydi."""
    m = float(np.max(np.abs(arr))) if len(arr) else 0.0
    return arr if m < 1e-6 else arr * (peak / m)

def encode_mp3(arr: np.ndarray, sample_rate: int = 24000, bitrate: int = 32) -> bytes:
    clamped = np.clip(arr, -1.0, 1.0)
    pcm = (clamped * 32767.0).astype(np.int16).tobytes()
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(bitrate)
    encoder.set_in_sample_rate(sample_rate)
    encoder.set_channels(1)
    encoder.set_quality(2)
    return encoder.encode(pcm) + encoder.flush()

def generate_accent(pipeline, voice: str, words: list, out_dir: str, accent_label: str):
    os.makedirs(out_dir, exist_ok=True)
    
    needed = []
    for w in words:
        slug = get_slug(w)
        if not slug:
            continue
        dest = os.path.join(out_dir, f"{slug}.mp3")
        if not (os.path.exists(dest) and os.path.getsize(dest) > 100):
            needed.append((w, slug, dest))
            
    print(f"[{accent_label}] Jami so'zlar: {len(words)}, yaratilishi kerak: {len(needed)}")
    if not needed:
        print(f"[{accent_label}] Barcha fayllar mavjud, o'tkazib yuborildi.")
        return 0

    created = 0
    t0 = time.time()
    for idx, (word, slug, dest) in enumerate(needed, 1):
        try:
            chunks = []
            for _, _, audio in pipeline(word, voice=voice, speed=1):
                arr = audio.cpu().numpy() if isinstance(audio, torch.Tensor) else audio
                chunks.append(arr)
            if not chunks:
                print(f"[{accent_label}] Ogohlantirish: '{word}' uchun audio generatsiya bo'lmadi.")
                continue
            
            full = np.concatenate(chunks)
            trimmed = normalize_peak(trim_silence(full))
            mp3_bytes = encode_mp3(trimmed)
            
            temp_dest = dest + ".tmp"
            with open(temp_dest, "wb") as f:
                f.write(mp3_bytes)
            os.replace(temp_dest, dest)
            created += 1

            if idx % 100 == 0 or idx == len(needed):
                elapsed = time.time() - t0
                rate = created / elapsed if elapsed > 0 else 0
                remaining = (len(needed) - idx) / rate if rate > 0 else 0
                print(f"[{accent_label}] {idx}/{len(needed)} ({created} yaratildi, {rate:.1f} so'z/s, qolgan vaqt: {remaining:.0f}s)")
        except Exception as e:
            print(f"[{accent_label}] Xatolik '{word}' ({slug}): {e}")
            raise e

    return created

def main():
    print("--- Tez Yodla Kokoro TTS Audio Generator ---")
    words = load_words()
    print(f"Yuklangan noyob so'zlar soni: {len(words)}")

    print("\n1/2: AQSH (US) talaffuzi yaratilmoqda ('af_heart')...")
    p_us = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    us_created = generate_accent(p_us, "af_heart", words, US_DIR, "US")
    del p_us  # Free memory

    print("\n2/2: Britaniya (UK) talaffuzi yaratilmoqda ('bf_emma')...")
    p_uk = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")
    uk_created = generate_accent(p_uk, "bf_emma", words, UK_DIR, "UK")
    del p_uk

    print("\nAudio yaratish yakunlandi!")
    print(f"Yangi yaratilgan US fayllar: {us_created}")
    print(f"Yangi yaratilgan UK fayllar: {uk_created}")

if __name__ == "__main__":
    main()
