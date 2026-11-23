# Retro Games para Samsung Tizen

App para TV Samsung (Tizen) que roda jogos de SNES com joystick Bluetooth. A biblioteca, as capas e os saves ficam num servidor seu; a TV só baixa o que vai jogar.

Feito para uma TV de 2018 (Tizen 4.0, Chromium 56), que **não tem WebAssembly**: o emulador é o [snes9x2005](https://github.com/libretro/snes9x2005) (libretro) compilado para JavaScript puro com emscripten/wasm2js. Na TV de teste roda a ~60 fps (≈7 ms por quadro).

> Nenhuma ROM acompanha o projeto. Use cópias dos seus próprios cartuchos.

## Como funciona

```
TV (.wgt)                                   Servidor (nginx)
├─ biblioteca em grade (Preact)   ── GET ─▶ catalog/snes.json, covers/
├─ emulador (core JS no pacote)   ── GET ─▶ roms/snes/<jogo>
└─ saves automáticos              ◀─ PUT ─▶ saves/snes/<id>.srm | .state
```

- **Biblioteca**: grade de capas por console, com ano, gênero e nº de jogadores vindos do [libretro-database](https://github.com/libretro/libretro-database) e capas do [libretro-thumbnails](https://github.com/libretro-thumbnails).
- **Jogo**: vídeo por WebGL (textura RGB565), áudio por Web Audio, até 2 joysticks.
- **Saves**: o save do cartucho é enviado sozinho a cada ~10 s quando muda; um save state por jogo pelo menu. Nada se perde ao reinstalar o app.
- **Servidor**: só nginx servindo arquivos, protegido por um token secreto no caminho. Jogo novo = copiar a ROM e regenerar o catálogo; o app não precisa ser reinstalado.

## Controles

| Onde | Ação | Joystick | Controle remoto |
|---|---|---|---|
| Menus | navegar / confirmar / voltar | direcional / botão de baixo / botão da direita | setas / OK / Voltar |
| Biblioteca | trocar console | L / R | CH+ / CH− |
| Jogo | menu (continuar, salvar/carregar estado, reiniciar, sair) | segurar Select + Start | Voltar |
| Jogo | botões do SNES | posição física do SNES | OK = A, cores = B/A/Y/X, ⏯ = Start |

## Requisitos

- Node 22+, Python 3, Docker (para compilar o core)
- Servidor com Docker (ou nginx com o módulo `dav`)
- TV Samsung Tizen com o app instalado sem assinatura (ex.: app2samsung, via IP)

## Uso

```sh
npm install
npm run core:build          # compila o snes9x2005 → dist/cores/snes.js (Docker emscripten)
cp .env.example .env        # SERVER=http://<ip>:8088/<token>/
npm run wgt                 # build + checagem de sintaxe p/ Chromium 56 → dist/retro-games.wgt
```

Instale `dist/retro-games.wgt` na TV. A cada versão nova, suba `version` em `app/config.xml`.

Servidor (instalação, adicionar jogos, conferir): ver [server/README.md](server/README.md).

### Desenvolvimento

```sh
npm test                    # lógica (entrada, grade, áudio, saves)
npm run core:test           # roda o core no Node com uma ROM de roms/snes/
python3 server/test_catalog.py
npm run dev                 # app + servidor local em http://localhost:8766 (dados em server-data/)
```

Para o `dev`, use `SERVER=http://localhost:8766/dev/` no `.env` e monte `server-data/` com o mesmo layout do servidor (`roms/`, `catalog/`, `covers/`). No navegador: setas, Enter, Esc = Voltar, Z/X/A/S = B/A/Y/X, Espaço = Start.

## Estrutura

```
src/       app (Preact): biblioteca, jogo, menu, entrada, áudio, vídeo, saves
cores/     shim.c (API C sobre qualquer core libretro) + build.sh
server/    catalog.py (catálogo + capas), nginx.conf.template
app/       index.html, estilos, config.xml do Tizen, ícone, fonte
```

## Limitações conhecidas

- Só SNES por enquanto; a camada `cores/shim.c` serve para outros cores libretro (Mega Drive, Neo Geo) no futuro.
- Jogos com chips extras (Super FX, SA-1: Star Fox, Yoshi's Island, Super Mario RPG) podem não rodar a 60 fps.
- O servidor fala HTTP (TVs antigas podem não aceitar certificados atuais); o token protege contra listagem, não contra quem intercepta a rede.

## Créditos

- [snes9x2005](https://github.com/libretro/snes9x2005) — licença não comercial do Snes9x
- [libretro-database](https://github.com/libretro/libretro-database) e [libretro-thumbnails](https://github.com/libretro-thumbnails)
- Fonte [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) — SIL Open Font License (`app/fonts/OFL.txt`)
