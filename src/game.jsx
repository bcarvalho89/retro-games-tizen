import { useState, useEffect, useRef } from 'preact/hooks';
import { request } from './http.js';
import { createSaves, createAutosave } from './saves.js';
import { loadCore } from './core.js';
import { createVideo } from './video.js';
import { createAudio } from './audio.js';
import { createRing } from './ring.js';
import { padsToMasks, createKeys, createMenuCombo } from './input.js';
import { SERVER, useNav, Dialog, toast, cls } from './ui.jsx';

const MAX_CATCHUP = 4;
const BACK_KEYS = [10009, 27];
const MENU = ['Continuar', 'Salvar estado', 'Carregar estado', 'Reiniciar', 'Sair'];

function Menu({ title, hasState, onPick }) {
  const [i, setI] = useState(0);
  const enabled = j => j !== 2 || hasState;
  const step = d => {
    let j = i;
    do { j = (j + d + MENU.length) % MENU.length; } while (!enabled(j));
    setI(j);
  };
  useNav(a => {
    if (a === 'up') step(-1);
    else if (a === 'down') step(1);
    else if (a === 'ok') onPick(MENU[i]);
    else if (a === 'back') onPick('Continuar');
  });
  return (
    <div class="menu-bg">
      <div class="menu">
        <div class="title px">{title}</div>
        {MENU.map((m, j) => <div class={cls('menu-item', j === i && 'focus', !enabled(j) && 'off')}>{m}</div>)}
      </div>
    </div>
  );
}

function startSession(consoleId, game, resume) {
  const saves = createSaves({ http: request, base: SERVER, consoleId, gameId: game.id });
  const rom = request('GET', `${SERVER}roms/${consoleId}/${encodeURIComponent(game.file)}`).then(res => {
    if (res.status !== 200) throw new Error('rom ' + res.status);
    return new Uint8Array(res.data);
  });
  return Promise.all([
    loadCore(consoleId),
    rom,
    saves.loadSram().catch(() => { throw new Error('save'); }),
    resume ? saves.loadState().catch(() => { throw new Error('save'); }) : null,
    saves.hasState(),
  ]).then(([core, romBytes, sram, state, hasState]) => {
    if (!core.load(romBytes)) throw new Error('rom');
    if (sram) core.setSram(sram);
    if (state) core.loadState(state);
    return { core, saves, hasState };
  });
}

export function Game({ consoleId, game, resume, onExit }) {
  const canvas = useRef();
  const [phase, setPhase] = useState('loading');
  const [hasState, setHasState] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [detail, setDetail] = useState('');
  const session = useRef(null);
  const paused = useRef(true);

  useEffect(() => {
    let alive = true;
    let raf;
    const keys = createKeys();
    startSession(consoleId, game, resume).then(({ core, saves, hasState: has }) => {
      if (!alive) return;
      const ring = createRing(Math.round(core.rate / 4));
      const audio = createAudio(core.rate, ring);
      const video = createVideo(canvas.current);
      const autosave = createAutosave({ saves, read: () => core.sram() });
      autosave.onError = () => toast('Não foi possível salvar. Tentando de novo…');
      const combo = createMenuCombo(500);
      const s = session.current = { core, saves, audio, autosave, start: 0, done: 0 };
      const openMenu = () => { paused.current = true; audio.suspend(); setPhase('menu'); };
      s.openMenu = openMenu;
      s.resume = () => { combo.swallow(); s.start = performance.now(); s.done = 0; paused.current = false; audio.resume(); setPhase('playing'); };

      const tick = now => {
        raf = requestAnimationFrame(tick);
        if (paused.current) return;
        let due = Math.floor((now - s.start) / 1000 * core.fps) - s.done;
        if (due > MAX_CATCHUP) { s.done += due - MAX_CATCHUP; due = MAX_CATCHUP; }
        if (due <= 0) return;
        const keyBits = keys.mask();
        const pads = padsToMasks(navigator.getGamepads ? navigator.getGamepads() : []);
        const r = combo([pads[0] | keyBits, pads[1]], now);
        if (r.open) return openMenu();
        for (let i = 0; i < due; i++) {
          core.run(i === due - 1, r.masks[0], r.masks[1]);
          const a = core.takeAudio();
          ring.push(core.heap16.subarray(a.ptr >> 1, (a.ptr >> 1) + a.frames * 2), a.frames);
          autosave.tick();
        }
        s.done += due;
        video.draw(core);
      };
      setHasState(has);
      s.resume();
      raf = requestAnimationFrame(tick);
    }, e => {
      if (!alive) return;
      setDetail(e.message);
      setPhase(e.message === 'save' ? 'save-error' : 'error');
    });

    const down = e => {
      if (paused.current) return;
      if (BACK_KEYS.includes(e.keyCode)) { e.preventDefault(); session.current && session.current.openMenu(); return; }
      if (keys.down(e.keyCode)) e.preventDefault();
    };
    const up = e => keys.up(e.keyCode);
    // leaving the app (Home / switching source) may kill it before the next autosave tick
    const hidden = () => {
      const s = session.current;
      keys.clear();
      if (document.hidden && s) { s.autosave.flush(); if (!paused.current) s.openMenu(); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      document.removeEventListener('visibilitychange', hidden);
      if (session.current) session.current.audio.close();
      session.current = null;
    };
  }, [attempt]);

  const pick = item => {
    const s = session.current;
    if (item === 'Continuar') s.resume();
    else if (item === 'Salvar estado') {
      const bytes = s.core.saveState();
      (bytes ? s.saves.putState(bytes) : Promise.resolve(false)).then(ok => {
        if (ok) setHasState(true);
        toast(ok ? 'Estado salvo' : 'Não foi possível salvar o estado.');
        if (ok) s.resume();
      });
    } else if (item === 'Carregar estado') {
      s.saves.loadState().then(bytes => {
        if (bytes && s.core.loadState(bytes)) s.resume();
        else toast('Não foi possível carregar o estado.');
      }, () => toast('Não foi possível carregar o estado.'));
    } else if (item === 'Reiniciar') {
      s.core.reset();
      s.resume();
    } else if (item === 'Sair') {
      s.autosave.flush().then(ok => {
        if (ok) onExit();
        else toast('Não foi possível salvar. Verifique a conexão e tente de novo.');
      });
    }
  };

  return (
    <div class="game">
      <canvas ref={canvas} width="256" height="224" />
      {phase === 'loading' && <div class="message"><p>Carregando…</p></div>}
      {phase === 'menu' && <Menu title={game.title} hasState={hasState} onPick={pick} />}
      {phase === 'save-error' && (
        <Dialog text="Não foi possível carregar o save." options={['Tentar de novo', 'Voltar']}
          onPick={i => (i === 0 ? (setPhase('loading'), setAttempt(attempt + 1)) : onExit())} onCancel={onExit} />
      )}
      {phase === 'error' && (
        <Dialog text={`Não foi possível abrir o jogo. (${detail})`} options={['Tentar de novo', 'Voltar']}
          onPick={i => (i === 0 ? (setPhase('loading'), setAttempt(attempt + 1)) : onExit())} onCancel={onExit} />
      )}
    </div>
  );
}
