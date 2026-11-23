import { build, transformSync } from 'esbuild';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const server = (process.env.SERVER || '').trim();
if (!/^https?:\/\/.+\/$/.test(server)) {
  console.error('SERVER ausente ou sem / no fim no .env (ex.: SERVER=http://1.2.3.4:8088/TOKEN/)');
  process.exit(1);
}
if (!existsSync('dist/cores/snes.js')) {
  console.error('falta dist/cores/snes.js: rode npm run core:build');
  process.exit(1);
}
// emscripten's MODULARIZE wrapper skips its own legacy transpile (it uses ?.), which breaks the whole core on Chromium 56
mkdirSync('app/cores', { recursive: true });
for (const f of readdirSync('dist/cores').filter(f => f.endsWith('.js'))) {
  const { code } = transformSync(readFileSync(`dist/cores/${f}`, 'utf8'), { target: 'chrome56', minify: true });
  writeFileSync(`app/cores/${f}`, code);
}
await build({
  entryPoints: ['src/main.jsx'],
  outfile: 'app/main.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'chrome56',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  define: { __SERVER__: JSON.stringify(server) },
});
