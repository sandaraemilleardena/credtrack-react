export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

// Polling/focus checks never call activity(). Only real user input renews this clock.
export function createIdleSession({ now = Date.now, keepAlive, expire, broadcast }) {
  let last = null, sent = 0, pending = false, stopped = true;
  return {
    start(timestamp = now(), announce = true) { stopped = false; last = Number.isFinite(timestamp) ? Math.min(timestamp, now()) : now(); sent = now(); pending = false; if (announce) broadcast?.(last); },
    stop() { stopped = true; last = null; pending = false; },
    activity(timestamp = now(), remote = false) {
      if (stopped) return;
      // Never revive a session after its deadline, even when input resumes.
      if (now() - last >= IDLE_TIMEOUT_MS) { this.check(); return; }
      if (!Number.isFinite(timestamp) || timestamp > now() || timestamp < last) return;
      last = timestamp;
      pending = true;
      if (!remote) broadcast?.(last);
    },
    check() {
      if (stopped) return;
      if (now() - last >= IDLE_TIMEOUT_MS) {
        this.stop();
        void expire();
      } else if (pending && (now() - last >= 1000 || now() - sent >= 30000)) {
        pending = false; sent = now();
        void keepAlive();
      }
    },
  };
}
