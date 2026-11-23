import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { getJson, request } from './http.js';
import { createSaves } from './saves.js';
import { moveGrid } from './grid.js';
import { Game } from './game.jsx';
import { SERVER, useNav, Dialog, Toasts, exit, cls } from './ui.jsx';

// Chromium 56 (Tizen 4) lacks queueMicrotask, which Preact 11 calls to schedule every re-render
if (!window.queueMicrotask) window.queueMicrotask = f => Promise.resolve().then(f);

const CONSOLES = [['snes', 'SNES'], ['megadrive', 'MEGA DRIVE'], ['neogeo', 'NEO GEO']];
const COLS = 4;
const VISIBLE_ROWS = 4;
const COVER_COLORS = ['#7f1d1d', '#3f2a06', '#14532d', '#1e1b4b', '#3b0764', '#164e63', '#7c2d12', '#500724'];

function colorOf(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return COVER_COLORS[Math.abs(h) % COVER_COLORS.length];
}

function Cover({ game, big }) {
  if (game.cover) return <img class="cover-img" src={SERVER + game.cover} />;
  return <div class={cls('cover-fallback px', big && 'big')} style={{ background: colorOf(game.id) }}>{game.title}</div>;
}

function meta(game) {
  return [game.year, game.genre, game.players ? game.players + (game.players > 1 ? ' jogadores' : ' jogador') : null]
    .filter(Boolean).join(' · ');
}

function useHasState(consoleId, game) {
  const [has, setHas] = useState({});
  const key = game && consoleId + '/' + game.id;
  useEffect(() => {
    if (!game || has[key] !== undefined) return;
    const t = setTimeout(() => {
      createSaves({ http: request, base: SERVER, consoleId, gameId: game.id }).hasState()
        .then(v => setHas(h => Object.assign({}, h, { [key]: v })));
    }, 250);
    return () => clearTimeout(t);
  }, [key]);
  return !!(key && has[key]);
}

function Library({ state, onPlay }) {
  const [tabs, setTabs] = useState(state.tabs);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState(state.tab);
  const [focus, setFocus] = useState(state.focus[state.tab] || 0);
  const [actions, setActions] = useState(-1);
  const [confirmExit, setConfirmExit] = useState(false);

  const load = () => {
    setError(false);
    Promise.all(CONSOLES.map(([id, label]) => getJson(`${SERVER}catalog/${id}.json`)
      .then(games => (games.length ? { id, label, games } : null), () => null)))
      .then(list => {
        const ok = list.filter(Boolean);
        if (!ok.length) return setError(true);
        state.tabs = ok;
        setTabs(ok);
      });
  };
  useEffect(() => { if (!tabs) load(); }, []);

  const current = tabs && tabs[Math.min(tab, tabs.length - 1)];
  const games = current ? current.games : [];
  const game = games[focus];
  const has = useHasState(current && current.id, game);
  const buttons = has ? ['Jogar', 'Continuar'] : ['Jogar'];

  const remember = (t, f) => { state.tab = t; state.focus[t] = f; };
  const play = resume => { remember(tab, focus); onPlay(current.id, game, resume); };
  const switchTab = d => {
    const t = Math.max(0, Math.min(tabs.length - 1, tab + d));
    remember(tab, focus);
    setTab(t);
    setFocus(state.focus[t] || 0);
    setActions(-1);
  };

  useNav(a => {
    if (error) { if (a === 'ok') load(); else if (a === 'back') setConfirmExit(true); return; }
    if (!current) return;
    if (actions >= 0) {
      if (a === 'left' || a === 'up') setActions(0);
      else if (a === 'right' || a === 'down') setActions(buttons.length - 1);
      else if (a === 'ok') play(actions === 1);
      else if (a === 'back') setActions(-1);
      return;
    }
    if (a === 'prev') switchTab(-1);
    else if (a === 'next') switchTab(1);
    else if (a === 'back') setConfirmExit(true);
    else if (a === 'ok') { if (has) setActions(1); else play(false); }
    else setFocus(moveGrid(focus, a, games.length, COLS));
  }, !confirmExit);

  const row = Math.floor(focus / COLS);
  const totalRows = Math.ceil(games.length / COLS);
  const firstRow = Math.max(0, Math.min(row - 1, totalRows - VISIBLE_ROWS));

  return (
    <div class="library">
      <div class="tabs px">
        {(tabs || []).map((t, i) => <span class={i === tab ? 'on' : ''}>{t.label}</span>)}
        {tabs && tabs.length > 1 && <span class="hint">L / R troca console</span>}
      </div>
      {error && (
        <div class="message">
          <p>Não foi possível falar com o servidor.</p>
          <span class="btn focus">Tentar de novo</span>
        </div>
      )}
      {!tabs && !error && <div class="message"><p>Carregando…</p></div>}
      {current && (
        <div class="grid-window">
          <div class="grid" style={{ transform: `translateY(-${firstRow * 214}px)` }}>
            {games.map((g, i) => (
              <div class={cls('tile', i === focus && 'focus', i === focus && actions >= 0 && 'dim')}>
                <Cover game={g} />
              </div>
            ))}
          </div>
        </div>
      )}
      {game && (
        <div class="panel">
          <div class="title px">{game.title}</div>
          <div class="meta">{meta(game)}</div>
          <div class="big-cover"><Cover game={game} big /></div>
          <div class="btns">
            {buttons.map((b, i) => <span class={cls('btn', i === 0 && 'pri', actions === i && 'focus')}>{i === 1 ? '⟲ ' : ''}{b}</span>)}
          </div>
        </div>
      )}
      {confirmExit && (
        <Dialog text="Sair do Retro Games?" options={['Sair', 'Cancelar']}
          onPick={i => (i === 0 ? exit() : setConfirmExit(false))} onCancel={() => setConfirmExit(false)} />
      )}
    </div>
  );
}

function App() {
  const libState = useRef({ tabs: null, tab: 0, focus: {} }).current;
  const [playing, setPlaying] = useState(null);
  return (
    <div>
      {playing
        ? <Game {...playing} onExit={() => setPlaying(null)} />
        : <Library state={libState} onPlay={(consoleId, game, resume) => setPlaying({ consoleId, game, resume })} />}
      <Toasts />
    </div>
  );
}

render(<App />, document.getElementById('app'));
