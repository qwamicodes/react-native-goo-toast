#!/usr/bin/env node
// soundcn, for mobile: pull any CC0 sound from soundcn.xyz into your app as a real .mp3 asset.
//   npx goo-sound add success-chime pop-up        -> ./assets/sounds/success-chime.mp3 ...
//   npx goo-sound add click-soft --dir src/sounds
//   npx goo-sound search chime
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const RAW = 'https://raw.githubusercontent.com/kapishdima/soundcn/main';
const FREE = new Set(['CC0', 'OGA-BY', 'MIT', 'CC-BY']);

const [cmd, ...rest] = process.argv.slice(2);
const dirFlag = rest.indexOf('--dir');
const dir = dirFlag >= 0 ? rest[dirFlag + 1] : 'assets/sounds';
const names = rest.filter((_, i) => dirFlag < 0 || (i !== dirFlag && i !== dirFlag + 1));

async function registry() {
  const res = await fetch(`${RAW}/registry.json`);
  if (!res.ok) throw new Error(`Could not load the soundcn registry (${res.status})`);
  return (await res.json()).items;
}

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^[0-9]/, (d) => `s${d}`);

async function add() {
  if (!names.length) return usage();
  const items = await registry();
  await mkdir(dir, { recursive: true });
  const added = [];
  for (const name of names) {
    const item = items.find((i) => i.name === name);
    if (!item) {
      console.error(`✕ ${name}: not in soundcn. Try: goo-sound search ${name.split('-')[0]}`);
      continue;
    }
    const license = item.meta?.license ?? 'unknown';
    if (!FREE.has(license)) {
      console.error(`✕ ${name}: license is "${license}", skipping. Only freely licensed sounds are pulled.`);
      continue;
    }
    const file = item.files.find((f) => f.path.includes('/sounds/'));
    const src = await (await fetch(`${RAW}/${file.path}`)).text();
    const match = src.match(/data:audio\/([a-z0-9]+);base64,([A-Za-z0-9+/=]+)/);
    if (!match) {
      console.error(`✕ ${name}: could not read audio data`);
      continue;
    }
    const ext = match[1] === 'mpeg' ? 'mp3' : match[1];
    const out = join(dir, `${name}.${ext}`);
    await writeFile(out, Buffer.from(match[2], 'base64'));
    added.push({ name, out });
    console.log(`✓ ${out}  (${item.meta?.duration ?? '?'}s, ${license}, ${item.author ?? 'unknown'})`);
  }
  if (added.length) {
    console.log('\nUse it:\n');
    for (const { name, out } of added) console.log(`const ${camel(name)} = require('./${out}');`);
    console.log(`\n<Toaster sounds={{ success: ${camel(added[0].name)} }} />`);
    console.log(`toast.success({ title: 'Saved', sound: ${camel(added[0].name)} });`);
  }
}

async function search() {
  const q = names.join(' ').toLowerCase();
  if (!q) return usage();
  const items = await registry();
  const hits = items
    .filter((i) => FREE.has(i.meta?.license))
    .filter((i) => [i.name, i.title, ...(i.meta?.tags ?? []), ...(i.categories ?? [])].join(' ').toLowerCase().includes(q))
    .slice(0, 30);
  if (!hits.length) return console.log(`No free sounds match "${q}".`);
  for (const i of hits) console.log(`${i.name.padEnd(36)} ${String(i.meta?.duration ?? '').padEnd(6)}s  ${(i.categories ?? []).join(', ')}`);
  console.log(`\nPreview at https://soundcn.xyz, then: goo-sound add ${hits[0].name}`);
}

function usage() {
  console.log('goo-sound add <name...> [--dir assets/sounds]\ngoo-sound search <term>');
}

const run = { add, search }[cmd] ?? usage;
run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
