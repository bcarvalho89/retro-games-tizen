const factories = {};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('core'));
    document.head.appendChild(s);
  });
}

function factory(consoleId) {
  if (!factories[consoleId]) {
    factories[consoleId] = loadScript(`cores/${consoleId}.js`).then(() => {
      const f = window.RetroCore;
      delete window.RetroCore;
      return f;
    });
    factories[consoleId].catch(() => { delete factories[consoleId]; });
  }
  return factories[consoleId];
}

function withBuffer(m, bytes, fn) {
  const ptr = m._malloc(bytes.length);
  m.HEAPU8.set(bytes, ptr);
  try { return fn(ptr); } finally { m._free(ptr); }
}

// cores ship inside the .wgt: the 2018 TV wouldn't run a <script> from the server.
// a fresh module per game: libretro cores aren't safe to retro_init/load twice in one instance
export function loadCore(consoleId) {
  return factory(consoleId).then(f => f()).then(m => ({
    heapU8: m.HEAPU8,
    heap16: m.HEAP16,
    get fps() { return m._s_fps(); },
    get rate() { return m._s_rate(); },
    load(rom) {
      const ptr = m._malloc(rom.length);
      m.HEAPU8.set(rom, ptr);
      return m._s_load(ptr, rom.length) === 1;
    },
    run(render, pad0, pad1) { m._s_run(render ? 1 : 0, pad0, pad1); },
    frame() { return { ptr: m._s_fb(), w: m._s_w(), h: m._s_h() }; },
    takeAudio() { return { ptr: m._s_audio(), frames: m._s_take_audio() }; },
    sram() {
      const size = m._s_sram_size();
      return size > 0 ? m.HEAPU8.subarray(m._s_sram(), m._s_sram() + size) : null;
    },
    setSram(bytes) {
      const view = this.sram();
      if (view) view.set(bytes.subarray(0, view.length));
    },
    saveState() {
      const size = m._s_state_size();
      const ptr = m._malloc(size);
      try {
        return m._s_save_state(ptr) === 1 ? m.HEAPU8.slice(ptr, ptr + size) : null;
      } finally { m._free(ptr); }
    },
    loadState(bytes) { return withBuffer(m, bytes, ptr => m._s_load_state(ptr, bytes.length) === 1); },
    reset() { m._s_reset(); },
  }));
}
