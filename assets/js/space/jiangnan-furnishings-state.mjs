// One clock supplied by the world owns all physical motion. No timer survives
// a hidden room, and repeating a paused time cannot advance a mechanism.
export function createJiangnanObjectState({ recordIds = [] } = {}) {
  const switches = { lamp: true, fan: true, 'shelf-light': true, 'photo-light': true, espresso: false };
  const ids = new Set(recordIds);
  let lastTime, elapsed = 0, fanSpeed = 8.4, fanPhase = 0, platterAngle = 0;
  let playing = false, recordId = recordIds[0] || null, brewElapsed = 0;
  return {
    toggle(kind) {
      if (!Object.hasOwn(switches, kind)) return null;
      switches[kind] = !switches[kind];
      if (kind === 'espresso') brewElapsed = 0;
      return { kind, on: switches[kind] };
    },
    setAudioState({ playing: nextPlaying = false, trackId } = {}) {
      playing = Boolean(nextPlaying);
      if (ids.has(trackId)) recordId = trackId;
    },
    update(time) {
      if (!Number.isFinite(time)) return;
      const dt = lastTime === undefined ? 0 : Math.min(.1, Math.max(0, time - lastTime));
      lastTime = time;
      if (!dt) return;
      elapsed += dt;
      if (switches.espresso) {
        brewElapsed += dt;
        if (brewElapsed >= 8) switches.espresso = false;
      }
      const target = switches.fan ? 8.4 : 0, damping = 1.65;
      const nextSpeed = target + (fanSpeed - target) * Math.exp(-damping * dt);
      fanPhase += target * dt + (fanSpeed - target) * (1 - Math.exp(-damping * dt)) / damping;
      fanSpeed = nextSpeed < .001 ? 0 : nextSpeed;
      if (playing) platterAngle += dt * Math.PI * 2 * (33 + 1 / 3) / 60;
    },
    snapshot() {
      return { ...switches, fanSpeed, fanPhase, platterAngle, playing, recordId, brewProgress: Math.min(1, brewElapsed / 8),
        steamPhase: elapsed, pendulumAngle: Math.sin(elapsed * 3.15) * .055 };
    }
  };
}
