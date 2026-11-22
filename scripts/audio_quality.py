#!/usr/bin/env python3
"""
Common high-quality audio processing module for "Tez Yodla" (English and Uzbek).

Standards:
- Input format: Azure Riff48Khz16BitMonoPcm (48 kHz mono 16-bit PCM WAV)
- Resampling: High-quality polyphase resample to 24 kHz (scipy.signal.resample_poly)
- Silence trimming: Peak -45 dB threshold; 80 ms leading pad, 150 ms trailing pad
- Anti-click fading: 10 ms linear fade-in and fade-out
- Loudness normalization: -16 LUFS (pyloudnorm) or RMS for < 0.4s
- Peak protection: Maximum -1 dBFS via clean linear attenuation (NO tanh, NO compression/limiter)
- Output format: Mono, 24 kHz, 64 kbps CBR MP3 (LAME quality 0)
"""

import io
import os
import numpy as np
import scipy.signal as signal
import soundfile as sf
import pyloudnorm as pyln
import lameenc

TARGET_SAMPLE_RATE = 24000
TARGET_BITRATE = 64
TARGET_LUFS = -16.0
MAX_PEAK_DB = -1.0
SILENCE_THRESH_DB = -45.0
PAD_START_SEC = 0.080  # 80 ms
PAD_END_SEC = 0.150    # 150 ms
FADE_SEC = 0.010       # 10 ms


def resample_to_24k(data: np.ndarray, orig_sr: int) -> np.ndarray:
    """High quality polyphase resampling to 24 kHz."""
    if orig_sr == TARGET_SAMPLE_RATE:
        return data
    if orig_sr == 48000:
        # Exact 2:1 downsampling with Kaiser/FIR anti-aliasing filter
        return signal.resample_poly(data, up=1, down=2)
    # Generic rational resample
    import math
    gcd = math.gcd(TARGET_SAMPLE_RATE, orig_sr)
    up = TARGET_SAMPLE_RATE // gcd
    down = orig_sr // gcd
    return signal.resample_poly(data, up=up, down=down)


def trim_silence_and_fade(
    data: np.ndarray,
    sr: int = TARGET_SAMPLE_RATE,
    thresh_db: float = SILENCE_THRESH_DB,
    pad_start_sec: float = PAD_START_SEC,
    pad_end_sec: float = PAD_END_SEC,
    fade_sec: float = FADE_SEC,
) -> np.ndarray:
    """
    Trim silence using threshold at -45 dB below peak.
    Preserves 80ms start padding and 150ms end padding to protect soft consonants (s, th, f).
    Applies 10ms smooth fade-in and fade-out to prevent clicks.
    """
    if len(data) == 0:
        return data

    peak = float(np.max(np.abs(data)))
    if peak < 1e-6:
        return data

    thresh_linear = peak * (10.0 ** (thresh_db / 20.0))
    non_silent = np.where(np.abs(data) >= thresh_linear)[0]
    if len(non_silent) == 0:
        return data

    pad_start = int(pad_start_sec * sr)
    pad_end = int(pad_end_sec * sr)

    start = max(0, non_silent[0] - pad_start)
    end = min(len(data), non_silent[-1] + pad_end + 1)
    trimmed = np.copy(data[start:end])

    # 10ms anti-click fade in and fade out
    fade_len = int(fade_sec * sr)
    if len(trimmed) > 2 * fade_len:
        fade_in = np.linspace(0.0, 1.0, fade_len)
        fade_out = np.linspace(1.0, 0.0, fade_len)
        trimmed[:fade_len] *= fade_in
        trimmed[-fade_len:] *= fade_out
    elif len(trimmed) > 2:
        half = len(trimmed) // 2
        trimmed[:half] *= np.linspace(0.0, 1.0, half)
        trimmed[-half:] *= np.linspace(1.0, 0.0, half)

    return trimmed


def normalize_loudness(
    data: np.ndarray,
    sr: int = TARGET_SAMPLE_RATE,
    target_lufs: float = TARGET_LUFS,
    max_peak_db: float = MAX_PEAK_DB,
) -> tuple[np.ndarray, dict]:
    """
    Normalizes average loudness to target_lufs (-16 LUFS).
    Uses RMS if duration < 0.4s.
    Caps max peak to max_peak_db (-1 dBFS) via linear gain reduction (NO tanh, NO distortion).
    """
    if len(data) == 0:
        return data, {
            "duration": 0.0,
            "method": "None",
            "attenuated": False,
            "final_measure": -99.0,
            "final_type": "LUFS",
            "final_peak_db": -99.0,
        }

    duration = len(data) / sr
    meter = pyln.Meter(sr, block_size=0.400)

    orig_lufs = -float("inf")
    if duration >= 0.4:
        try:
            orig_lufs = float(meter.integrated_loudness(data))
        except Exception:
            orig_lufs = -float("inf")

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

    # Peak check: strictly <= -1.0 dBFS
    # Clean linear attenuation (NO tanh/compressor/limiter distortion)
    peak_limit_linear = 10.0 ** (max_peak_db / 20.0)  # ~0.89125
    curr_peak = float(np.max(np.abs(amplified)))
    attenuated = False
    if curr_peak > peak_limit_linear:
        amplified = amplified * (peak_limit_linear / curr_peak)
        attenuated = True

    final_peak = float(np.max(np.abs(amplified)))
    final_peak_db = 20.0 * np.log10(final_peak + 1e-9)

    final_lufs = -float("inf")
    if duration >= 0.4:
        try:
            final_lufs = float(meter.integrated_loudness(amplified))
        except Exception:
            final_lufs = -float("inf")

    if not np.isfinite(final_lufs) or final_lufs < -70.0:
        final_rms = float(np.sqrt(np.mean(amplified ** 2)))
        final_measure = 20.0 * np.log10(final_rms + 1e-9)
        final_type = "RMS"
    else:
        final_measure = final_lufs
        final_type = "LUFS"

    stats = {
        "duration": duration,
        "method": method,
        "attenuated": attenuated,
        "final_measure": final_measure,
        "final_type": final_type,
        "final_peak_db": final_peak_db,
    }
    return amplified, stats


def encode_mp3_64k(arr: np.ndarray, sample_rate: int = TARGET_SAMPLE_RATE, bitrate: int = TARGET_BITRATE) -> bytes:
    """Encode float numpy array to mono MP3 at 64 kbps CBR, highest quality (quality=0)."""
    clamped = np.clip(arr, -1.0, 1.0)
    pcm = (clamped * 32767.0).astype(np.int16).tobytes()
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(bitrate)
    encoder.set_in_sample_rate(sample_rate)
    encoder.set_channels(1)
    encoder.set_quality(0)  # 0: highest LAME quality
    return encoder.encode(pcm) + encoder.flush()


def process_azure_pcm_to_mp3(raw_wav_bytes: bytes) -> tuple[bytes, dict]:
    """
    Full pipeline:
    1. Decode 48kHz WAV PCM
    2. Resample to 24kHz
    3. Trim silence (-45dB below peak + 80ms/150ms margins + 10ms fade)
    4. Normalize to -16 LUFS (or RMS), peak <= -1 dBFS via linear attenuation
    5. Encode to 64 kbps mono MP3
    Returns (mp3_bytes, stats_dict).
    """
    data, sr = sf.read(io.BytesIO(raw_wav_bytes))
    if data.ndim > 1:
        data = data.mean(axis=1)

    data_24k = resample_to_24k(data, sr)
    trimmed = trim_silence_and_fade(data_24k, sr=TARGET_SAMPLE_RATE)
    normalized, stats = normalize_loudness(trimmed, sr=TARGET_SAMPLE_RATE, target_lufs=TARGET_LUFS, max_peak_db=MAX_PEAK_DB)
    mp3_bytes = encode_mp3_64k(normalized, sample_rate=TARGET_SAMPLE_RATE, bitrate=TARGET_BITRATE)
    return mp3_bytes, stats


def get_audio_file_stats(filepath: str) -> dict:
    """Measures LUFS, Peak dB, and duration for an existing audio file."""
    data, sr = sf.read(filepath)
    if data.ndim > 1:
        data = data.mean(axis=1)
    duration = len(data) / sr
    meter = pyln.Meter(sr, block_size=0.400)
    orig_lufs = -float("inf")
    if duration >= 0.4:
        try:
            orig_lufs = float(meter.integrated_loudness(data))
        except Exception:
            orig_lufs = -float("inf")

    if not np.isfinite(orig_lufs) or orig_lufs < -70.0:
        rms = float(np.sqrt(np.mean(data ** 2)))
        measure_val = 20.0 * np.log10(rms + 1e-9)
        measure_type = "RMS"
    else:
        measure_val = orig_lufs
        measure_type = "LUFS"

    peak = float(np.max(np.abs(data))) if len(data) else 0.0
    peak_db = 20.0 * np.log10(peak + 1e-9)

    return {
        "duration": duration,
        "measure_val": measure_val,
        "measure_type": measure_type,
        "peak_db": peak_db,
        "size": os.path.getsize(filepath) if os.path.exists(filepath) else 0,
    }
