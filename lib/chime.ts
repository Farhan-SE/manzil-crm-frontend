let context: AudioContext | null = null;

/**
 * Browsers only let a page make sound after the user has interacted with it, so the
 * audio context is opened on the first click or key press and reused from then on.
 */
export function armChime() {
  const unlock = () => {
    context ??= new AudioContext();
    void context.resume();
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

/** A short two-note ding. Silent if the page hasn't been interacted with yet. */
export function playChime() {
  if (!context || context.state !== "running") return;
  const now = context.currentTime;
  [880, 1174.66].forEach((frequency, index) => {
    const start = now + index * 0.16;
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
    oscillator.connect(gain).connect(context!.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.55);
  });
}
