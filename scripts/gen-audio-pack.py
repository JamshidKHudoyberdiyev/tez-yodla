#!/usr/bin/env python3
"""
So'z MP3 larini har bir talaffuz uchun BITTA faylga jamlaydi (OTA cheklovi: 1 yangilanishda
ko'pi bilan 1000 ta fayl). Ilova kerakli so'zni shu fayl ichidan vaqt bo'yicha topib o'ynatadi.

Kiradi:  assets/audio/us/*.mp3, assets/audio/uk/*.mp3  (scripts/gen-audio.py yaratadi)
Chiqadi: assets/audio/pack-us.mp3, assets/audio/pack-uk.mp3
         src/data/generated/audio.ts  (so'z → [boshlanish ms, tugash ms])

Talab: ffmpeg (PATH da). Ishga tushirish: python scripts/gen-audio-pack.py
"""
import os, json, subprocess, shutil, argparse
from concurrent.futures import ThreadPoolExecutor

try:
    import imageio_ffmpeg
    FF = shutil.which('ffmpeg') or imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FF = 'ffmpeg'

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SR = 24000          # namuna chastotasi (Azure fayllari bilan bir xil)
PAD = 0.3           # so'zlar orasidagi jimlik, soniya

def decode(path):
    return subprocess.run([FF, '-nostdin', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                          check=True, capture_output=True).stdout

def build(accent, bitrate='64k', dest_path=None):
    src = os.path.join(ROOT, 'assets', 'audio', accent)
    slugs = sorted(f[:-4] for f in os.listdir(src) if f.endswith('.mp3'))
    with ThreadPoolExecutor(8) as ex:
        pcm = list(ex.map(lambda s: decode(os.path.join(src, s + '.mp3')), slugs))
    gap = b'\x00\x00' * int(SR * PAD)
    out, index, n = [gap], {}, len(gap) // 2
    for s, p in zip(slugs, pcm):
        a = n; n += len(p) // 2
        index[s] = [round(a * 1000 / SR), round(n * 1000 / SR)]
        out += [p, gap]; n += len(gap) // 2
    dest = dest_path or os.path.join(ROOT, 'assets', 'audio', f'pack-{accent}.mp3')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    # -write_xing 0: sarlavhasiz doimiy bitreyt — telefon vaqt bo'yicha aniq siljiy oladi
    subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', bitrate, '-write_xing', '0', dest], input=b''.join(out), check=True)
    print(f'[{accent}] {len(slugs)} so\'z, {n / SR / 60:.1f} daqiqa, {os.path.getsize(dest) / 1e6:.1f} MB (bitrate: {bitrate})')
    return index

def main():
    parser = argparse.ArgumentParser(description="So'z MP3 larini bitta faylga jamlaydi")
    parser.add_argument('--bitrate', default='64k', help="MP3 CBR bitrate (masalan '64k', '48k', '40k'), sukut bo'yicha '64k'")
    parser.add_argument('--out-dir', default=None, help="Chiqish papkasi (sukut bo'yicha assets/audio)")
    parser.add_argument('--no-ts', action='store_true', help="audio.ts ni yangilamaslik")
    args = parser.parse_args()

    bitrate = args.bitrate if args.bitrate.endswith('k') else f'{args.bitrate}k'

    idx = {}
    for a in ('us', 'uk'):
        dest_path = os.path.join(args.out_dir, f'pack-{a}.mp3') if args.out_dir else None
        idx[a] = build(a, bitrate=bitrate, dest_path=dest_path)

    if not args.no_ts:
        ts = ['/* eslint-disable */',
              '// Avtomatik yaratilgan fayl. Qo\'lda o\'zgartirmang!',
              '// scripts/gen-audio-pack.py orqali yangilanadi.',
              '',
              '/** Har bir talaffuz uchun bitta jamlangan audio fayl */',
              "export const AUDIO_PACK = {",
              "  us: require('../../../assets/audio/pack-us.mp3'),",
              "  uk: require('../../../assets/audio/pack-uk.mp3'),",
              '};',
              '',
              '/** So\'z (slug) → [boshlanish, tugash] millisekundda, jamlangan fayl ichida */',
              "export const AUDIO_INDEX: Record<'us' | 'uk', Record<string, [number, number]>> = {"]
        for a in ('us', 'uk'):
            ts.append(f'  {a}: {json.dumps(idx[a], separators=(",", ":"))},')
        ts.append('};\n')
        with open(os.path.join(ROOT, 'src', 'data', 'generated', 'audio.ts'), 'w', encoding='utf-8', newline='\n') as f:
            f.write('\n'.join(ts))
        print('src/data/generated/audio.ts yozildi')

if __name__ == '__main__':
    main()
