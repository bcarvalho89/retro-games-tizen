import assert from 'node:assert';
import { padsToMasks, keyMask, createMenuCombo, BTN } from './input.js';

const pad = (pressed = [], axes = [0, 0]) => ({
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
  axes,
});

assert.deepStrictEqual(padsToMasks([null, pad([0])]), [1 << BTN.B, 0]);
assert.deepStrictEqual(padsToMasks([pad([], [-0.8, 0])]), [1 << BTN.LEFT, 0]);
assert.deepStrictEqual(padsToMasks([pad([], [0, 0.4])]), [0, 0]);
assert.deepStrictEqual(padsToMasks([pad([1]), null, pad([9, 12])]), [1 << BTN.A, (1 << BTN.START) | (1 << BTN.UP)]);
assert.deepStrictEqual(padsToMasks([]), [0, 0]);

assert.strictEqual(keyMask(38), 1 << BTN.UP);
assert.strictEqual(keyMask(13), 1 << BTN.A);
assert.strictEqual(keyMask(403), 1 << BTN.B);
assert.strictEqual(keyMask(404), 1 << BTN.A);
assert.strictEqual(keyMask(405), 1 << BTN.Y);
assert.strictEqual(keyMask(406), 1 << BTN.X);
assert.strictEqual(keyMask(10009), 0);

const SS = (1 << BTN.SELECT) | (1 << BTN.START);
const combo = createMenuCombo(500);
let r = combo([SS | (1 << BTN.RIGHT), 0], 0);
assert.deepStrictEqual(r, { masks: [1 << BTN.RIGHT, 0], open: false });
assert.strictEqual(combo([SS, 0], 499).open, false);
r = combo([SS, 0], 500);
assert.strictEqual(r.open, true);
assert.deepStrictEqual(r.masks, [0, 0]);
r = combo([SS, 1 << BTN.A], 600);
assert.deepStrictEqual(r, { masks: [0, 0], open: false });
r = combo([1 << BTN.START, 0], 700);
assert.deepStrictEqual(r, { masks: [0, 0], open: false });
r = combo([0, 0], 800);
assert.deepStrictEqual(r, { masks: [0, 0], open: false });
r = combo([1 << BTN.START, 0], 900);
assert.deepStrictEqual(r, { masks: [1 << BTN.START, 0], open: false });

const c2 = createMenuCombo(500);
c2([0, SS], 0);
assert.strictEqual(c2([0, SS], 500).open, true);

const c3 = createMenuCombo(500);
c3([SS, 0], 0);
c3([1 << BTN.START, 0], 300);
assert.strictEqual(c3([SS, 0], 600).open, false);
assert.strictEqual(c3([SS, 0], 1100).open, true);

console.log('input ok');

{
  const { createNav } = await import('./input.js');
  const nav = createNav(400, 120);
  const bit = b => 1 << b;
  assert.deepStrictEqual(nav(bit(BTN.DOWN), 0), ['down']);
  assert.deepStrictEqual(nav(bit(BTN.DOWN), 399), []);
  assert.deepStrictEqual(nav(bit(BTN.DOWN), 400), ['down']);
  assert.deepStrictEqual(nav(bit(BTN.DOWN), 519), []);
  assert.deepStrictEqual(nav(bit(BTN.DOWN), 520), ['down']);
  assert.deepStrictEqual(nav(0, 600), []);
  assert.deepStrictEqual(nav(bit(BTN.A), 700), ['ok']);
  assert.deepStrictEqual(nav(bit(BTN.A), 1500), []);
  assert.deepStrictEqual(nav(bit(BTN.B) | bit(BTN.L), 1600), ['back', 'prev']);
  assert.deepStrictEqual(nav(bit(BTN.R) | bit(BTN.START), 1700), ['next', 'ok']);
  assert.deepStrictEqual(nav(0, 1800), []);
  console.log('nav ok');
}
