#!/usr/bin/env python3
"""
Loudness normalization script for "Tez Yodla".
Normalizes audio files to ~ -16 LUFS (or RMS for files < 0.4s) and ensures peak <= -1 dB.
Uses a smooth soft-knee limiter to prevent clipping while maintaining target loudness.
Does not regenerate speech, only processes existing audio files.
"""

import os
import sys
import glob
import time
import argparse
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
import lameenc

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
AUDIO_UZ_DIR = os.path.join(ROOT, "assets", "audio", "uz")
SAMPLE_RATE = 24000
BITRATE = 32
TARGET_LUFS = -16.0
MAX_PEAK_DB = -1.0
THRESH_DB = -2.5


def soft_limit(x: np.ndarray, threshold_db: float = THRESH_DB, limit_db: float = MAX_PEAK_DB) -> tuple[np.ndarray, bool]:
    """
    Smooth soft-knee limiter using tanh saturation.
    Preserves dynamics below threshold, smoothly compresses peaks above threshold
    so the signal never exceeds limit_db (default -1.0 dBFS).
    """
    limit = 10.0 ** (limit_db / 20.0)  # ~0.89125
    thresh = 10.0 ** (threshold_db / 20.0)  # ~0.74989

    max_val = float(np.max(np.abs(x))) if len(x) else 0.0
    if max_val <= limit:
        return x, False

    out = np.copy(x)
    diff = limit - thresh
    if diff <= 0:
        return np.clip(x, -limit, limit), True

    pos = out > thresh
    out[pos] = thresh + diff * np.tanh((out[pos] - thresh) / diff)

    neg = out < -thresh
    out[neg] = -thresh - diff * np.tanh((-out[neg] - thresh) / diff)

    # Ensure peak never exceeds limit
    curr_max = float(np.max(np.abs(out)))
    if curr_max > limit:
        out = out * (limit / curr_max)

    return out, True


def normalize_audio(
    data: np.ndarray,
    sr: int = SAMPLE_RATE,
    target_lufs: float = TARGET_LUFS,
    max_peak_db: float = MAX_PEAK_DB,
) -> tuple[np.ndarray, dict]:
    """
    Normalizes audio:
    - Average loudness to target_lufs (-16 LUFS).
    - If length < 0.4s or pyln fails, matches target via RMS.
    - Max peak limited to max_peak_db (-1 dB) via smooth soft limiter (no harsh clipping).
    Returns (normalized_array, stats_dict).
    """
    if len(data) == 0:
        return data, {
            "duration": 0.0,
            "method": "None",
            "limited": False,
            "final_measure": -99.0,
            "final_type": "LUFS",
            "final_peak_db": -99.0,
        }

    duration = len(data) / sr
    meter = pyln.Meter(sr, block_size=0.400)

    # 1. Initial measurement
    orig_lufs = -float("inf")
    if duration >= 0.4:
        try:
            orig_lufs = float(meter.integrated_loudness(data))
        except Exception:
            orig_lufs = -float("inf")

    # 2. Determine gain
    if np.isfinite(orig_lufs) and orig_lufs > -70.0:
        gain_db = target_lufs - orig_lufs
        method = "LUFS"
    else:
        # RMS fallback for short audio or silence
        rms = float(np.sqrt(np.mean(data ** 2)))
        rms_db = 20.0 * np.log10(rms + 1e-9)
        gain_db = target_lufs - rms_db
        method = "RMS"

    gain = 10.0 ** (gain_db / 20.0)
    amplified = data * gain

    # 3. Smooth soft limiter to protect -1 dB peak without degrading loudness
    normalized, was_limited = soft_limit(amplified, threshold_db=THRESH_DB, limit_db=max_peak_db)

    # 4. Final measurement
    final_peak = float(np.max(np.abs(normalized)))
    final_peak_db = 20.0 * np.log10(final_peak + 1e-9)

    final_lufs = -float("inf")
    if duration >= 0.4:
        try:
            final_lufs = float(meter.integrated_loudness(normalized))
        except Exception:
            final_lufs = -float("inf")

    if not np.isfinite(final_lufs) or final_lufs < -70.0:
        final_rms = float(np.sqrt(np.mean(normalized ** 2)))
        final_measure = 20.0 * np.log10(final_rms + 1e-9)
        final_type = "RMS"
    else:
        final_measure = final_lufs
        final_type = "LUFS"

    stats = {
        "duration": duration,
        "method": method,
        "limited": was_limited,
        "final_measure": final_measure,
        "final_type": final_type,
        "final_peak_db": final_peak_db,
    }
    return normalized, stats


def encode_mp3(arr: np.ndarray, sample_rate: int = SAMPLE_RATE, bitrate: int = BITRATE) -> bytes:
    """Encode float numpy array to mono MP3."""
    clamped = np.clip(arr, -1.0, 1.0)
    pcm = (clamped * 32767.0).astype(np.int16).tobytes()
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(bitrate)
    encoder.set_in_sample_rate(sample_rate)
    encoder.set_channels(1)
    encoder.set_quality(2)
    return encoder.encode(pcm) + encoder.flush()


def process_file(filepath: str, dry_run: bool = False) -> dict:
    """Read MP3, normalize loudness, write back."""
    data, sr = sf.read(filepath)
    if data.ndim > 1:
        data = data.mean(axis=1)

    normalized, stats = normalize_audio(data, sr=sr, target_lufs=TARGET_LUFS, max_peak_db=MAX_PEAK_DB)

    if not dry_run:
        mp3_bytes = encode_mp3(normalized, sample_rate=sr, bitrate=BITRATE)
        with open(filepath, "wb") as f:
            f.write(mp3_bytes)
        stats["bytes"] = len(mp3_bytes)
    else:
        stats["bytes"] = os.path.getsize(filepath)

    stats["path"] = filepath
    return stats


def main():
    parser = argparse.ArgumentParser(description="Loudness Normalizer for Tez Yodla")
    parser.add_argument("--dir", type=str, default=AUDIO_UZ_DIR, help="Audio directory to normalize")
    parser.add_argument("--file", type=str, default=None, help="Single file to normalize")
    parser.add_argument("--dry-run", action="store_true", help="Only measure without overwriting files")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N files")
    args = parser.parse_args()

    if args.file:
        files = [args.file]
    else:
        if not os.path.exists(args.dir):
            print(f"Xatolik: Papka topilmadi: {args.dir}")
            sys.exit(1)
        files = sorted(glob.glob(os.path.join(args.dir, "*.mp3")))

    if args.limit:
        files = files[: args.limit]

    print(f"Fayllar soni: {len(files)}")
    if args.dry_run:
        print("[DRY RUN] Fayllar o'zgartirilmaydi, faqat o'lchanadi.")

    total_bytes = 0
    t0 = time.time()
    results = []

    for idx, fpath in enumerate(files, 1):
        try:
            st = process_file(fpath, dry_run=args.dry_run)
            total_bytes += st["bytes"]
            results.append(st)
            if idx % 100 == 0 or idx == len(files):
                print(f"[{idx}/{len(files)}] bajarildi...")
        except Exception as e:
            print(f"Xatolik ({fpath}): {e}")

    elapsed = time.time() - t0
    total_mb = total_bytes / (1024 * 1024)

    print("\n" + "=" * 50)
    print("LOUDNESS NORMALIZATION NATIJALARI")
    print("=" * 50)
    print(f"Qayta ishlangan fayllar: {len(results)}")
    print(f"Jami hajm: {total_mb:.3f} MB")
    print(f"Sarflangan vaqt: {elapsed:.2f} soniya")

    sample_items = results[:5] if len(results) <= 10 else results[:3] + results[-3:]
    print("\nTanlangan fayllar balandligi:")
    for st in sample_items:
        fname = os.path.basename(st["path"])
        print(
            f"  - {fname}: {st['final_measure']:.2f} {st['final_type']}, "
            f"peak: {st['final_peak_db']:.2f} dB, davomiyligi: {st['duration']:.2f}s"
        )


if __name__ == "__main__":
    main()
