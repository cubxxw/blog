// One continuous ramp for the room's practical lights. Toggling a switch sets
// a target; the shared room clock glides the visible intensities there over a
// short moment so lamp and shelf light never snap. Interrupting a ramp starts
// again from the currently presented value, and quiet/reduced motion snaps to
// the target without leaving a half-lit fixture behind.
export const JIANGNAN_PRACTICAL_RAMP_SECONDS = .24;

export function createPracticalLightRamp({ duration = JIANGNAN_PRACTICAL_RAMP_SECONDS, still = () => false } = {}) {
  const span = Number.isFinite(duration) && duration > 0 ? duration : JIANGNAN_PRACTICAL_RAMP_SECONDS;
  const channels = new Map();
  const ensure = (key, value) => {
    let channel = channels.get(key);
    if (!channel) channels.set(key, (channel = { value, from: value, to: value, elapsed: 0 }));
    return channel;
  };
  const snapChannel = (channel, target) => { channel.value = channel.from = channel.to = target; channel.elapsed = 0; };
  return {
    get duration() { return span; },
    // Register what the mesh actually presents before its first interaction.
    // A first toggle off then starts at the lit fixture, never at its target.
    seed(key, value) { if (Number.isFinite(value) && !channels.has(key)) ensure(key, value); return this.value(key); },
    set(key, target, { instant = false } = {}) {
      if (!Number.isFinite(target)) return this.value(key);
      const channel = ensure(key, target);
      if (instant || still() || channel.value === target) { snapChannel(channel, target); return channel.value; }
      if (channel.to === target) return channel.value;
      channel.from = channel.value; channel.to = target; channel.elapsed = 0;
      return channel.value;
    },
    value(key, fallback = 0) { return channels.has(key) ? channels.get(key).value : fallback; },
    update(dt) {
      if (still()) {
        let changed = false;
        for (const channel of channels.values()) if (channel.value !== channel.to) { snapChannel(channel, channel.to); changed = true; }
        return changed;
      }
      if (!Number.isFinite(dt) || dt <= 0) return false;
      let changed = false;
      for (const channel of channels.values()) {
        if (channel.value === channel.to) continue;
        channel.elapsed = Math.min(span, channel.elapsed + dt);
        const progress = channel.elapsed / span, eased = progress * progress * (3 - 2 * progress);
        channel.value = channel.from + (channel.to - channel.from) * eased;
        if (progress >= 1) snapChannel(channel, channel.to);
        changed = true;
      }
      return changed;
    },
    get pending() { for (const channel of channels.values()) if (channel.value !== channel.to) return true; return false; }
  };
}
