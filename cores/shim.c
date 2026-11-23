#include <stdint.h>
#include <string.h>
#include <emscripten.h>
#include "libretro.h"

#define AUDIO_MAX 8192

static uint16_t fb[1024 * 512];
static int fb_w, fb_h, video_on = 1;
static int16_t audio[AUDIO_MAX * 2];
static int audio_frames;
static uint32_t pads[2];
static struct retro_system_av_info av;

static bool env(unsigned cmd, void *data)
{
   switch (cmd)
   {
      case RETRO_ENVIRONMENT_SET_PIXEL_FORMAT:
         return *(enum retro_pixel_format *)data == RETRO_PIXEL_FORMAT_RGB565;
      case RETRO_ENVIRONMENT_GET_AUDIO_VIDEO_ENABLE:
         *(int *)data = 2 | (video_on ? 1 : 0);
         return true;
   }
   return false;
}

static void video(const void *data, unsigned w, unsigned h, size_t pitch)
{
   if (!data || w > 1024 || h > 512)
      return;
   fb_w = w;
   fb_h = h;
   for (unsigned y = 0; y < h; y++)
      memcpy(fb + y * w, (const uint8_t *)data + y * pitch, w * 2);
}

static size_t audio_batch(const int16_t *data, size_t frames)
{
   size_t room = AUDIO_MAX - audio_frames;
   if (frames > room)
      frames = room;
   memcpy(audio + audio_frames * 2, data, frames * 4);
   audio_frames += frames;
   return frames;
}

static void audio_sample(int16_t l, int16_t r) { int16_t s[2] = {l, r}; audio_batch(s, 1); }
static void poll(void) {}

static int16_t input(unsigned port, unsigned device, unsigned index, unsigned id)
{
   if (port > 1 || device != RETRO_DEVICE_JOYPAD)
      return 0;
   if (id == RETRO_DEVICE_ID_JOYPAD_MASK)
      return pads[port];
   return (pads[port] >> id) & 1;
}

EMSCRIPTEN_KEEPALIVE int s_load(void *rom, int size)
{
   retro_set_environment(env);
   retro_set_video_refresh(video);
   retro_set_audio_sample(audio_sample);
   retro_set_audio_sample_batch(audio_batch);
   retro_set_input_poll(poll);
   retro_set_input_state(input);
   retro_init();
   struct retro_game_info g = {0, rom, (size_t)size, 0};
   if (!retro_load_game(&g))
      return 0;
   retro_get_system_av_info(&av);
   return 1;
}

EMSCRIPTEN_KEEPALIVE void s_run(int render, uint32_t pad0, uint32_t pad1)
{
   video_on = render;
   pads[0] = pad0;
   pads[1] = pad1;
   retro_run();
}

EMSCRIPTEN_KEEPALIVE uint16_t *s_fb(void) { return fb; }
EMSCRIPTEN_KEEPALIVE int s_w(void) { return fb_w; }
EMSCRIPTEN_KEEPALIVE int s_h(void) { return fb_h; }
EMSCRIPTEN_KEEPALIVE int16_t *s_audio(void) { return audio; }
EMSCRIPTEN_KEEPALIVE int s_take_audio(void) { int n = audio_frames; audio_frames = 0; return n; }
EMSCRIPTEN_KEEPALIVE void *s_sram(void) { return retro_get_memory_data(RETRO_MEMORY_SAVE_RAM); }
EMSCRIPTEN_KEEPALIVE int s_sram_size(void) { return retro_get_memory_size(RETRO_MEMORY_SAVE_RAM); }
EMSCRIPTEN_KEEPALIVE int s_state_size(void) { return retro_serialize_size(); }
EMSCRIPTEN_KEEPALIVE int s_save_state(void *buf) { return retro_serialize(buf, retro_serialize_size()); }
EMSCRIPTEN_KEEPALIVE int s_load_state(void *buf, int size) { return retro_unserialize(buf, size); }
EMSCRIPTEN_KEEPALIVE void s_reset(void) { retro_reset(); }
EMSCRIPTEN_KEEPALIVE double s_fps(void) { return av.timing.fps; }
EMSCRIPTEN_KEEPALIVE double s_rate(void) { return av.timing.sample_rate; }
