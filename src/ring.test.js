import assert from 'node:assert';
import { createRing } from './ring.js';

const out = n => [new Float32Array(n), new Float32Array(n)];

let ring = createRing(64);
ring.push(new Int16Array([16384, -16384, 8192, -8192, 0, 0, 32767, -32768]), 4);
assert.strictEqual(ring.size(), 4);
let [l, r] = out(4);
ring.pull(l, r, 1);
assert.deepStrictEqual(Array.from(l), [0.5, 0.25, 0, 32767 / 32768]);
assert.deepStrictEqual(Array.from(r), [-0.5, -0.25, 0, -1]);
assert.strictEqual(ring.size(), 0);

[l, r] = out(3);
l.fill(9); r.fill(9);
ring.pull(l, r, 1);
assert.deepStrictEqual(Array.from(l), [0, 0, 0]);

ring.push(new Int16Array([16384, 16384, 8192, 8192]), 2);
[l, r] = out(4);
ring.pull(l, r, 0.5);
assert.deepStrictEqual(Array.from(l), [0.5, 0.5, 0.25, 0.25]);

ring = createRing(4);
ring.push(new Int16Array(20), 10);
assert.strictEqual(ring.size(), 3);
console.log('ring ok');
