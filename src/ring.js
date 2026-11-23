export function createRing(capacity) {
  const buf = new Float32Array(capacity * 2);
  let w = 0, r = 0, pos = 0;
  const size = () => (w - r + capacity) % capacity;
  return {
    size,
    push(samples, frames) {
      const room = capacity - 1 - size();
      const n = Math.min(frames, room);
      for (let i = 0; i < n; i++) {
        buf[w * 2] = samples[i * 2] / 32768;
        buf[w * 2 + 1] = samples[i * 2 + 1] / 32768;
        w = (w + 1) % capacity;
      }
    },
    pull(left, right, step) {
      for (let i = 0; i < left.length; i++) {
        if (!size()) { left[i] = right[i] = 0; continue; }
        left[i] = buf[r * 2];
        right[i] = buf[r * 2 + 1];
        pos += step;
        while (pos >= 1 && size()) { pos -= 1; r = (r + 1) % capacity; }
      }
    },
  };
}
