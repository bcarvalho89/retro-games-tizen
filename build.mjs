import { build } from 'esbuild';
import { cpSync, existsSync } from 'node:fs';

const server = (process.env.SERVER || '').trim();
if (!/^https?:\/\/.+\/$/.test(server)) {
  console.error('SERVER ausente ou sem / no fim no .env (ex.: SERVER=http://1.2.3.4:8088/TOKEN/)');
  process.exit(1);
}
if (!existsSync('dist/cores/snes.js')) {
  console.error('falta dist/cores/snes.js: rode npm run core:build');
  process.exit(1);
}
cpSync('dist/cores', 'app/cores', { recursive: true, filter: f => !f.endsWith('package.json') });
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
