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
assert.deepStrictEqual(r, { masks: [0, 0], open: false });
r = combo([1 << BTN.START, 0], 980);
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
  assert.deepStrictEqual(nav(0, -1), []);
  assert.deepStrictEqual(nav(bit(BTN.DOWN), 0), ['down']);
  assert.deepStrictEqual(nav(bit(BTN.DOWN), 399), []);
  assert.deepStrictEqual(nav(bit(BTN.DOWN), 400), ['down']);
  assert.deepStrictEqual(nav(bit(BTN.DOWN), 519), []);
  assert.deepStrictEqual(nav(bit(BTN.DOWN), 520), ['down']);
  assert.deepStrictEqual(nav(0, 600), []);
  assert.deepStrictEqual(nav(bit(BTN.B), 700), ['ok']);
  assert.deepStrictEqual(nav(bit(BTN.B), 1500), []);
  assert.deepStrictEqual(nav(bit(BTN.A) | bit(BTN.L), 1600), ['back', 'prev']);
  assert.deepStrictEqual(nav(bit(BTN.R) | bit(BTN.START), 1700), ['next', 'ok']);
  assert.deepStrictEqual(nav(0, 1800), []);
  console.log('nav ok');
}

{
  const { createNav } = await import('./input.js');
  const nav = createNav(400, 120);
  const SSA = (1 << BTN.SELECT) | (1 << BTN.START) | (1 << BTN.A);
  assert.deepStrictEqual(nav(SSA, 0), []);
  assert.deepStrictEqual(nav(SSA, 500), []);
  assert.deepStrictEqual(nav(0, 600), []);
  assert.deepStrictEqual(nav(1 << BTN.START, 700), ['ok']);
  assert.deepStrictEqual(createNav()(1 << BTN.DOWN, 0), []);
  console.log('nav priming ok');
}

{
  const combo = createMenuCombo(500);
  combo.swallow();
  assert.deepStrictEqual(combo([1 << BTN.A, 0], 0).masks, [0, 0]);
  assert.deepStrictEqual(combo([0, 0], 10).masks, [0, 0]);
  assert.deepStrictEqual(combo([1 << BTN.A, 0], 20).masks, [1 << BTN.A, 0]);
  console.log('combo swallow ok');
}

{
  const { createKeys } = await import('./input.js');
  assert.strictEqual(keyMask(10252), 1 << BTN.START);
  const keys = createKeys();
  keys.down(38); keys.down(13);
  assert.strictEqual(keys.mask(), (1 << BTN.UP) | (1 << BTN.A));
  keys.up(38);
  assert.strictEqual(keys.mask(), 1 << BTN.A);
  keys.clear();
  assert.strictEqual(keys.mask(), 0);
  console.log('keys ok');
}

{
  const combo = createMenuCombo(500);
  const S = 1 << BTN.START, L = 1 << BTN.SELECT, J = 1 << BTN.B;
  assert.deepStrictEqual(combo([S | J, 0], 0).masks, [J, 0]);
  assert.deepStrictEqual(combo([S, 0], 79).masks, [0, 0]);
  assert.deepStrictEqual(combo([S, 0], 80).masks, [S, 0]);
  combo([0, 0], 100);
  combo([S, 0], 200);
  combo([S | L, 0], 240);
  assert.deepStrictEqual(combo([L, 0], 300).masks, [0, 0]);
  assert.deepStrictEqual(combo([L, 0], 900).masks, [0, 0]);
  assert.deepStrictEqual(combo([0, 0], 950).masks, [0, 0]);
  assert.deepStrictEqual(combo([L, 0], 1000).masks, [0, 0]);
  assert.deepStrictEqual(combo([L, 0], 1080).masks, [L, 0]);
  console.log('combo edges ok');
}

{
  const { keyAction, playerNumber } = await import('./input.js');
  assert.strictEqual(keyAction({ keyCode: 10009, repeat: false }), 'back');
  assert.strictEqual(keyAction({ keyCode: 10009, repeat: true }), null);
  assert.strictEqual(keyAction({ keyCode: 13, repeat: true }), null);
  assert.strictEqual(keyAction({ keyCode: 40, repeat: true }), 'down');
  assert.strictEqual(keyAction({ keyCode: 27, repeat: false }), 'back');
  assert.strictEqual(keyAction({ keyCode: 65, repeat: false }), null);
  assert.strictEqual(playerNumber([null, {}, {}], 1), 1);
  assert.strictEqual(playerNumber([null, {}, {}], 2), 2);
  assert.strictEqual(playerNumber([{}, null, null], 2), 2);
  console.log('keyAction/playerNumber ok');
}
