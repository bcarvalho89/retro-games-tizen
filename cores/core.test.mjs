import assert from 'node:assert';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';

const romDir = new URL('../roms/snes/', import.meta.url);
const romName = (() => { try { return readdirSync(romDir).find(f => /^Super Mario World \(.*\.(smc|sfc)$/i.test(f)); } catch (e) { return null; } })();
if (!romName) {
  console.log('SKIP: Super Mario World .smc/.sfc ausente em roms/snes/');
  process.exit(0);
}

const RetroCore = createRequire(import.meta.url)('../dist/cores/snes.js');
const m = await RetroCore();
const rom = readFileSync(new URL(romName, romDir));
const ptr = m._malloc(rom.length);
m.HEAPU8.set(rom, ptr);

assert.strictEqual(m._s_load(ptr, rom.length), 1);
assert.ok(Math.abs(m._s_rate() - 32040) < 1, 'rate ' + m._s_rate());
assert.ok(m._s_fps() > 59.9 && m._s_fps() < 60.2, 'fps ' + m._s_fps());

m._s_take_audio();
for (let i = 0; i < 300; i++) m._s_run(1, 0, 0);
assert.strictEqual(m._s_w(), 256);
assert.strictEqual(m._s_h(), 224);
assert.ok(m._s_take_audio() > 0);
assert.strictEqual(m._s_sram_size(), 2048);

const frame = () => m.HEAPU8.slice(m._s_fb(), m._s_fb() + m._s_w() * m._s_h() * 2);
const size = m._s_state_size();
assert.ok(size > 0);
const buf = m._malloc(size);
assert.strictEqual(m._s_save_state(buf), 1);
const saved = m.HEAPU8.slice(buf, buf + size);
m._s_run(1, 0, 0);
const expected = frame();
for (let i = 0; i < 60; i++) m._s_run(1, 1 << 8, 0);
m.HEAPU8.set(saved, buf);
assert.strictEqual(m._s_load_state(buf, size), 1);
m._s_run(1, 0, 0);
assert.deepStrictEqual(frame(), expected);

console.log('core ok:', romName);
