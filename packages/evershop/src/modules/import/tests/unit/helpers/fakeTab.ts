import type { PollerEnvironment } from '../../../ui/poller.js';

/** A tab with a clock that the test moves, and a visibility it switches. */
export class FakeTab implements PollerEnvironment {
  /** The clock of the tab, in milliseconds. */
  time = 0;

  now() {
    return this.time;
  }

  visible = true;

  private timers = new Map<number, { at: number; run: () => void }>();

  private next = 1;

  private listeners = new Set<() => void>();

  setTimer(run: () => void, ms: number) {
    const id = this.next++;
    this.timers.set(id, { at: this.time + ms, run });
    return id;
  }

  clearTimer(handle: unknown) {
    this.timers.delete(handle as number);
  }

  isVisible() {
    return this.visible;
  }

  onVisibilityChange(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    [...this.listeners].forEach((l) => l());
  }

  /** The wait of the one timer that is set, or null. */
  get waiting(): number | null {
    const [only] = [...this.timers.values()];
    return only ? only.at - this.time : null;
  }

  get timerCount() {
    return this.timers.size;
  }

  get listenerCount() {
    return this.listeners.size;
  }

  /** Moves the clock and runs the timers that are due, then lets the answers settle. */
  async advance(ms: number) {
    this.time += ms;
    const due = [...this.timers.entries()].filter(([, t]) => t.at <= this.time);
    due.forEach(([id, t]) => {
      this.timers.delete(id);
      t.run();
    });
    await settle();
  }
}

export const settle = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};
