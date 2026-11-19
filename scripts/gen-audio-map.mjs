/**
 * scripts/gen-audio-map.mjs
 * Generates src/data/generated/audio.ts from assets/audio/us and assets/audio/uk.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const US_DIR = path.join(ROOT, 'assets', 'audio', 'us');
const UK_DIR = path.join(ROOT, 'assets', 'audio', 'uk');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'generated', 'audio.ts');

function run() {
  const usFiles = new Set(
    fs.existsSync(US_DIR)
      ? fs.readdirSync(US_DIR).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4))
      : []
  );
  const ukFiles = new Set(
    fs.existsSync(UK_DIR)
      ? fs.readdirSync(UK_DIR).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4))
      : []
  );

  const allSlugs = Array.from(new Set([...usFiles, ...ukFiles])).sort();
  console.log(`Topilgan audio fayllar: US: ${usFiles.size}, UK: ${ukFiles.size}, Jami sluglar: ${allSlugs.length}`);

  const lines = [
    '/* eslint-disable */',
    '// Avtomatik yaratilgan fayl. Qo\'lda o\'zgartirmang!',
    '// scripts/gen-audio-map.mjs orqali yangilanadi.',
    '',
    'export interface WordAudioSources {',
    '  us?: any;',
    '  uk?: any;',
    '}',
    '',
    'export const AUDIO_MAP: Record<string, WordAudioSources> = {',
  ];

  for (const slug of allSlugs) {
    const hasUs = usFiles.has(slug);
    const hasUk = ukFiles.has(slug);

    // Escape slug if necessary for JS object key
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(slug) ? slug : JSON.stringify(slug);
    const parts = [];
    if (hasUs) {
      parts.push(`us: require('../../../assets/audio/us/${slug}.mp3')`);
    }
    if (hasUk) {
      parts.push(`uk: require('../../../assets/audio/uk/${slug}.mp3')`);
    }
    lines.push(`  ${safeKey}: { ${parts.join(', ')} },`);
  }

  lines.push('};');
  lines.push('');
  lines.push('export function getAudioSource(slug: string, accent: "us" | "uk"): any | undefined {');
  lines.push('  const entry = AUDIO_MAP[slug];');
  lines.push('  if (!entry) return undefined;');
  lines.push('  return accent === "uk" ? (entry.uk || entry.us) : (entry.us || entry.uk);');
  lines.push('}');
  lines.push('');

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
  console.log(`Xarita muvaffaqiyatli saqlandi: ${OUT_FILE}`);
}

run();
