import { useState, useEffect, useRef } from 'preact/hooks';
import { createNav, padsToMasks, keyAction, playerNumber } from './input.js';

export const SERVER = __SERVER__;
['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'MediaPlayPause', 'ChannelUp', 'ChannelDown']
  .forEach(k => { try { tizen.tvinputdevice.registerKey(k); } catch (e) {} });

export const exit = () => { try { tizen.application.getCurrentApplication().exit(); } catch (e) {} };
export const cls = (...a) => a.filter(Boolean).join(' ');

// gamepads emit no key events on the TV: menus are driven by polling them, keys come from the remote/keyboard
export function useNav(handler, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const onKey = e => {
      const a = keyAction(e);
      if (keyAction({ keyCode: e.keyCode })) e.preventDefault();
      if (a) ref.current(a);
    };
    const nav = createNav();
    let raf;
    const poll = now => {
      const masks = padsToMasks(navigator.getGamepads ? navigator.getGamepads() : []);
      nav(masks[0] | masks[1], now).forEach(a => ref.current(a));
      raf = requestAnimationFrame(poll);
    };
    window.addEventListener('keydown', onKey);
    raf = requestAnimationFrame(poll);
    return () => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(raf); };
  }, [active]);
}

export function Dialog({ text, options, onPick, onCancel }) {
  const [i, setI] = useState(0);
  useNav(a => {
    if (a === 'left') setI(Math.max(0, i - 1));
    else if (a === 'right') setI(Math.min(options.length - 1, i + 1));
    else if (a === 'ok') onPick(i);
    else if (a === 'back') onCancel();
  });
  return (
    <div class="dialog-bg">
      <div class="dialog">
        <p>{text}</p>
        <div class="btns">{options.map((o, j) => <span class={cls('btn', j === i && 'focus')}>{o}</span>)}</div>
      </div>
    </div>
  );
}

export function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const push = text => {
      const id = Math.random();
      setItems(l => l.concat({ id, text }));
      setTimeout(() => setItems(l => l.filter(x => x.id !== id)), 3000);
    };
    window.toast = push;
    const pads = () => (navigator.getGamepads ? navigator.getGamepads() : []);
    const on = word => e => push(`Controle ${playerNumber(pads(), e.gamepad.index)} ${word}`);
    const c = on('conectado'), d = on('desconectado');
    window.addEventListener('gamepadconnected', c);
    window.addEventListener('gamepaddisconnected', d);
    return () => { window.removeEventListener('gamepadconnected', c); window.removeEventListener('gamepaddisconnected', d); };
  }, []);
  return <div class="toasts">{items.map(t => <div class="toast">{t.text}</div>)}</div>;
}

export const toast = text => window.toast && window.toast(text);

