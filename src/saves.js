export function createSaves({ http, base, consoleId, gameId }) {
  const url = ext => `${base}saves/${consoleId}/${gameId}.${ext}`;
  const load = ext => http('GET', url(ext)).then(res => {
    if (res.status === 404) return null;
    if (res.status < 200 || res.status >= 300) throw new Error('save ' + res.status);
    return new Uint8Array(res.data);
  });
  const put = (ext, bytes) => http('PUT', url(ext), bytes.slice().buffer)
    .then(res => res.status >= 200 && res.status < 300);
  return {
    loadSram: () => load('srm'),
    putSram: bytes => put('srm', bytes),
    loadState: () => load('state'),
    putState: bytes => put('state', bytes),
    hasState: () => http('HEAD', url('state')).then(res => res.status >= 200 && res.status < 300),
  };
}

function same(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function createAutosave({ saves, read, intervalFrames = 600 }) {
  const initial = read();
  let last = initial ? initial.slice() : null;
  let frames = 0;
  let inFlight = null;
  let pending = false;

  function upload() {
    const cur = read();
    if (!cur || (!pending && last && same(cur, last))) return Promise.resolve(true);
    const copy = cur.slice();
    inFlight = saves.putSram(copy).then(ok => {
      inFlight = null;
      pending = !ok;
      if (ok) last = copy;
      else auto.onError();
      return ok;
    });
    return inFlight;
  }

  const auto = {
    onError() {},
    get pending() { return pending; },
    tick() {
      if (++frames < intervalFrames) return;
      frames = 0;
      if (!inFlight) upload();
    },
    flush() {
      return (inFlight || Promise.resolve()).then(upload);
    },
  };
  return auto;
}
