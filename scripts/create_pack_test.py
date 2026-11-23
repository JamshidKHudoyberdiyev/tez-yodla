#!/usr/bin/env python3
"""
Audio pack fayllarini turli bitreytlarda (64k, 48k, 40k) sinov uchun yaratadi
va taqqoslash uchun namunaviy so'zlarni kesib oladi.
"""
import os, sys, shutil, subprocess, json
from concurrent.futures import ThreadPoolExecutor

try:
    import imageio_ffmpeg
    FF = shutil.which('ffmpeg') or imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FF = 'ffmpeg'

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SR = 24000
PAD = 0.3

def decode(path):
    return subprocess.run([FF, '-nostdin', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                          check=True, capture_output=True).stdout

def prepare_pcm(accent):
    src = os.path.join(ROOT, 'assets', 'audio', accent)
    slugs = sorted(f[:-4] for f in os.listdir(src) if f.endswith('.mp3'))
    print(f"Decoding {len(slugs)} files for {accent}...")
    with ThreadPoolExecutor(8) as ex:
        pcm = list(ex.map(lambda s: decode(os.path.join(src, s + '.mp3')), slugs))
    gap = b'\x00\x00' * int(SR * PAD)
    out, index, n = [gap], {}, len(gap) // 2
    for s, p in zip(slugs, pcm):
        a = n; n += len(p) // 2
        index[s] = [round(a * 1000 / SR), round(n * 1000 / SR)]
        out += [p, gap]; n += len(gap) // 2
    return slugs, b''.join(out), index, n

def encode_pack(raw_bytes, dest, bitrate):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', bitrate, '-write_xing', '0', dest], input=raw_bytes, check=True)

def cut_sample(pack_path, start_ms, end_ms, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    start_s = start_ms / 1000.0
    dur_s = (end_ms - start_ms) / 1000.0 + 0.10
    subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-ss', f'{start_s:.4f}', '-t', f'{dur_s:.4f}',
                    '-i', pack_path, '-c', 'copy', out_path], check=True)

def main():
    test_dir = os.path.join(ROOT, 'assets', 'audio', 'pack_test')
    os.makedirs(test_dir, exist_ok=True)

    bitrates = ['64k', '48k', '40k']
    accents = ['us', 'uk']
    pcm_cache = {}
    indexes = {}

    for a in accents:
        slugs, raw_bytes, idx, n = prepare_pcm(a)
        pcm_cache[a] = raw_bytes
        indexes[a] = idx

    results = {}
    for br in bitrates:
        results[br] = {}
        for a in accents:
            pack_file = os.path.join(test_dir, f'pack-{a}-{br}.mp3')
            encode_pack(pcm_cache[a], pack_file, br)
            size_mb = os.path.getsize(pack_file) / (1024 * 1024)
            results[br][a] = {
                'path': pack_file,
                'size_mb': size_mb,
            }
            # Shuningdek pack_test/<br>/pack-<aet>.mp3 papkasiga ham nusxa
            br_dir_pack = os.path.join(test_dir, br, f'pack-{a}.mp3')
            os.makedirs(os.path.dirname(br_dir_pack), exist_ok=True)
            shutil.copyfile(pack_file, br_dir_pack)
            print(f"[{br}] pack-{a}: {size_mb:.2f} MB")

    # Namunaviy so'zlarni kesish
    target_words = [
        'think', 'three', 'this', 'she', 'sea', 'ship', 'sheep',
        'thorough', 'specifically', 'sixth', 'wash', 'watch', 'choose',
        'shoes', 'measure',
        # Qo'shimcha mavjud o'xshash so'zlar:
        'shoe', 'six'
    ]

    samples_dir = os.path.join(test_dir, 'samples')
    cut_summary = []

    for br in bitrates:
        for w in target_words:
            # US
            if w in indexes['us']:
                s_ms, e_ms = indexes['us'][w]
                us_pack = results[br]['us']['path']
                
                # Asosiy: pack_test/samples/<br>/<word>.mp3 (foydalanuvchi so'ragan format)
                out_main = os.path.join(samples_dir, br, f'{w}.mp3')
                cut_sample(us_pack, s_ms, e_ms, out_main)

                # Shuningdek aniqlik uchun us/ ichiga ham
                out_us = os.path.join(samples_dir, br, 'us', f'{w}.mp3')
                cut_sample(us_pack, s_ms, e_ms, out_us)

            # UK
            if w in indexes['uk']:
                s_ms, e_ms = indexes['uk'][w]
                uk_pack = results[br]['uk']['path']

                out_uk = os.path.join(samples_dir, br, f'{w}_uk.mp3')
                cut_sample(uk_pack, s_ms, e_ms, out_uk)

                out_uk_sub = os.path.join(samples_dir, br, 'uk', f'{w}.mp3')
                cut_sample(uk_pack, s_ms, e_ms, out_uk_sub)

    print("\nSamples successfully cut!")

if __name__ == '__main__':
    main()
