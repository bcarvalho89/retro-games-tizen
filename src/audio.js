export function createAudio(rate, ring) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const node = ctx.createScriptProcessor(2048, 0, 2);
  const step = rate / ctx.sampleRate;
  node.onaudioprocess = e => ring.pull(e.outputBuffer.getChannelData(0), e.outputBuffer.getChannelData(1), step);
  node.connect(ctx.destination);
  return {
    resume() { if (ctx.state === 'suspended') ctx.resume(); },
    suspend() { if (ctx.state === 'running') ctx.suspend(); },
    close() { node.disconnect(); ctx.close(); },
  };
}
