export const BTN = { B: 0, Y: 1, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7, A: 8, X: 9, L: 10, R: 11 };

const PAD = { 0: BTN.B, 1: BTN.A, 2: BTN.Y, 3: BTN.X, 4: BTN.L, 5: BTN.R, 6: BTN.L, 7: BTN.R, 8: BTN.SELECT, 9: BTN.START, 12: BTN.UP, 13: BTN.DOWN, 14: BTN.LEFT, 15: BTN.RIGHT };
const KEYS = {
  38: BTN.UP, 40: BTN.DOWN, 37: BTN.LEFT, 39: BTN.RIGHT, 13: BTN.A, 10252: BTN.START,
  403: BTN.B, 404: BTN.A, 405: BTN.Y, 406: BTN.X,
  90: BTN.B, 88: BTN.A, 65: BTN.Y, 83: BTN.X, 81: BTN.L, 87: BTN.R, 32: BTN.START, 16: BTN.SELECT,
};
const AXIS = 0.5;
const SS = (1 << BTN.SELECT) | (1 << BTN.START);

export function padsToMasks(gamepads) {
  const masks = [0, 0];
  let player = 0;
  for (let i = 0; i < gamepads.length && player < 2; i++) {
    const p = gamepads[i];
    if (!p) continue;
    let m = 0;
    for (let b = 0; b < p.buttons.length; b++) {
      if (p.buttons[b].pressed && PAD[b] !== undefined) m |= 1 << PAD[b];
    }
    if (p.axes[0] < -AXIS) m |= 1 << BTN.LEFT;
    if (p.axes[0] > AXIS) m |= 1 << BTN.RIGHT;
    if (p.axes[1] < -AXIS) m |= 1 << BTN.UP;
    if (p.axes[1] > AXIS) m |= 1 << BTN.DOWN;
    masks[player++] = m;
  }
  return masks;
}

export function keyMask(keyCode) {
  return KEYS[keyCode] === undefined ? 0 : 1 << KEYS[keyCode];
}

export function createMenuCombo(holdMs = 500) {
  let since = null;
  let swallowing = false;
  const combo = (masks, now) => {
    if (swallowing) {
      if (masks.every(m => !m)) swallowing = false;
      return { masks: masks.map(() => 0), open: false };
    }
    const held = masks.some(m => (m & SS) === SS);
    if (!held) {
      since = null;
      return { masks, open: false };
    }
    if (since === null) since = now;
    if (now - since >= holdMs) {
      since = null;
      swallowing = true;
      return { masks: masks.map(() => 0), open: true };
    }
    // SELECT+START reaching the game would act as in-game input (in SMW, pause+Select exits the level)
    return { masks: masks.map(m => ((m & SS) === SS ? m & ~SS : m)), open: false };
  };
  combo.swallow = () => { swallowing = true; since = null; };
  return combo;
}

const NAV = [
  ['up', [BTN.UP], true], ['down', [BTN.DOWN], true], ['left', [BTN.LEFT], true], ['right', [BTN.RIGHT], true],
  ['back', [BTN.B], false], ['prev', [BTN.L], false], ['next', [BTN.R], false], ['ok', [BTN.A, BTN.START], false],
];

export function createNav(delay = 400, repeat = 120) {
  const since = {};
  const last = {};
  // buttons already held when a screen opens (the menu combo, the A that launched a game) must not act on it
  const stale = {};
  let primed = false;
  return (mask, now) => {
    const out = [];
    for (const [name, bits, repeats] of NAV) {
      const down = bits.some(b => mask & (1 << b));
      if (!primed) stale[name] = down;
      if (!down) { since[name] = null; stale[name] = false; continue; }
      if (stale[name]) continue;
      if (since[name] == null) {
        since[name] = last[name] = now;
        out.push(name);
      } else if (repeats && now - since[name] >= delay && now - last[name] >= (last[name] === since[name] ? delay : repeat)) {
        last[name] = now;
        out.push(name);
      }
    }
    primed = true;
    return out;
  };
}

export function createKeys() {
  let held = {};
  return {
    down(keyCode) { const m = keyMask(keyCode); if (m) held[keyCode] = m; return m; },
    up(keyCode) { delete held[keyCode]; },
    // a key held when the app is hidden never gets its keyup; left set, it would keep the swallow on resume forever
    clear() { held = {}; },
    mask() { let m = 0; for (const k in held) m |= held[k]; return m; },
  };
}
