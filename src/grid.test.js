import assert from 'node:assert';
import { moveGrid } from './grid.js';

assert.strictEqual(moveGrid(0, 'left', 10), 0);
assert.strictEqual(moveGrid(1, 'left', 10), 0);
assert.strictEqual(moveGrid(3, 'right', 10), 3);
assert.strictEqual(moveGrid(2, 'right', 10), 3);
assert.strictEqual(moveGrid(9, 'right', 10), 9);
assert.strictEqual(moveGrid(5, 'down', 10), 9);
assert.strictEqual(moveGrid(7, 'down', 10), 9);
assert.strictEqual(moveGrid(8, 'down', 10), 8);
assert.strictEqual(moveGrid(1, 'down', 10), 5);
assert.strictEqual(moveGrid(9, 'up', 10), 5);
assert.strictEqual(moveGrid(2, 'up', 10), 2);
assert.strictEqual(moveGrid(0, 'down', 1), 0);
assert.strictEqual(moveGrid(0, 'down', 0), 0);
console.log('grid ok');
