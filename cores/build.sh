#!/bin/sh
set -e
cd "$(dirname "$0")/.."
case "$1" in
  snes)
    REPO=https://github.com/libretro/snes9x2005
    DIR=cores/vendor/snes9x2005
    [ -d "$DIR" ] || git clone -q --depth 1 "$REPO" "$DIR"
    SRC="$(sed -n "/USE_BLARGG_APU/q; s/^\s*\$(CORE_DIR)\/\([a-z0-9_]*\.c\).*/$(echo $DIR | sed 's/\//\\\//g')\/source\/\1/p" $DIR/Makefile.common | tr '\n' ' ')"
    SRC="$SRC $DIR/source/apu.c $DIR/source/soundux.c $DIR/source/spc700.c $DIR/libretro.c"
    INC="-I$DIR/source -I$DIR -I$DIR/libretro-common/include"
    DEFS="-DLOAD_FROM_MEMORY -DLAGFIX -DNDEBUG"
    ;;
  *) echo "uso: $0 snes" >&2; exit 1 ;;
esac
mkdir -p dist/cores
echo '{"type":"commonjs"}' > dist/cores/package.json
docker run --rm -u "$(id -u):$(id -g)" -v "$PWD":/src -w /src emscripten/emsdk:3.1.74 \
  emcc -O3 $DEFS $INC $SRC cores/shim.c \
  -sWASM=0 -sLEGACY_VM_SUPPORT=1 -sINITIAL_MEMORY=33554432 \
  -sMODULARIZE=1 -sEXPORT_NAME=RetroCore -sENVIRONMENT=web,node \
  -sEXPORTED_RUNTIME_METHODS=HEAPU8,HEAP16 \
  -sEXPORTED_FUNCTIONS=_malloc,_free,_s_load,_s_run,_s_fb,_s_w,_s_h,_s_audio,_s_take_audio,_s_sram,_s_sram_size,_s_state_size,_s_save_state,_s_load_state,_s_reset,_s_fps,_s_rate \
  -o "dist/cores/$1.js"
ls -la "dist/cores/$1.js"
