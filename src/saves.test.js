import assert from 'node:assert';
import { createSaves, createAutosave } from './saves.js';

const tick = () => new Promise(r => setTimeout(r, 0));

function fakeHttp(responses) {
  const calls = [];
  const http = (method, url, body) => {
    calls.push({ method, url, body: body && Array.from(new Uint8Array(body)) });
    const next = responses.shift() || { status: 204, data: null };
    return Promise.resolve(next);
  };
  return { http, calls };
}

const opts = http => ({ http, base: 'http://h/tok/', consoleId: 'snes', gameId: 'smw' });

{
  const { http, calls } = fakeHttp([{ status: 404, data: null }]);
  assert.strictEqual(await createSaves(opts(http)).loadSram(), null);
  assert.deepStrictEqual(calls[0], { method: 'GET', url: 'http://h/tok/saves/snes/smw.srm', body: undefined });
}
{
  const { http } = fakeHttp([{ status: 200, data: new Uint8Array([1, 2]).buffer }]);
  assert.deepStrictEqual(Array.from(await createSaves(opts(http)).loadSram()), [1, 2]);
}
for (const status of [500, 0]) {
  const { http } = fakeHttp([{ status, data: null }]);
  await assert.rejects(createSaves(opts(http)).loadSram(), /save/);
}
{
  const { http, calls } = fakeHttp([{ status: 201, data: null }, { status: 500, data: null }]);
  const saves = createSaves(opts(http));
  assert.strictEqual(await saves.putSram(new Uint8Array([7])), true);
  assert.deepStrictEqual(calls[0], { method: 'PUT', url: 'http://h/tok/saves/snes/smw.srm', body: [7] });
  assert.strictEqual(await saves.putState(new Uint8Array([8])), false);
  assert.strictEqual(calls[1].url, 'http://h/tok/saves/snes/smw.state');
}
{
  const { http } = fakeHttp([{ status: 200, data: new ArrayBuffer(4) }, { status: 404, data: null }, { status: 0, data: null }]);
  const saves = createSaves(opts(http));
  assert.strictEqual(await saves.hasState(), true);
  assert.strictEqual(await saves.hasState(), false);
  assert.strictEqual(await saves.hasState(), false);
}
{
  const { http, calls } = fakeHttp([{ status: 500, data: null }, { status: 204, data: null }, { status: 204, data: null }]);
  const sram = new Uint8Array([0, 0]);
  const errors = [];
  const auto = createAutosave({ saves: createSaves(opts(http)), read: () => sram, intervalFrames: 600 });
  auto.onError = () => errors.push(1);
  for (let i = 0; i < 600; i++) auto.tick();
  await tick();
  assert.strictEqual(calls.length, 0);

  sram[0] = 5;
  for (let i = 0; i < 599; i++) auto.tick();
  await tick();
  assert.strictEqual(calls.length, 0);
  auto.tick();
  await tick();
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(auto.pending, true);
  assert.strictEqual(errors.length, 1);

  for (let i = 0; i < 600; i++) auto.tick();
  await tick();
  assert.strictEqual(calls.length, 2);
  assert.deepStrictEqual(calls[1].body, [5, 0]);
  assert.strictEqual(auto.pending, false);

  sram[1] = 9;
  assert.strictEqual(await auto.flush(), true);
  assert.deepStrictEqual(calls[2].body, [5, 9]);
  assert.strictEqual(await auto.flush(), true);
  assert.strictEqual(calls.length, 3);
}
{
  const { http, calls } = fakeHttp([]);
  const auto = createAutosave({ saves: createSaves(opts(http)), read: () => null });
  for (let i = 0; i < 1200; i++) auto.tick();
  assert.strictEqual(await auto.flush(), true);
  assert.strictEqual(calls.length, 0);
}
console.log('saves ok');
