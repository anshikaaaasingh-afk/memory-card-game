/* modules/timer.js
   A small stopwatch/countdown that supports pausing and a temporary
   "freeze" (used by the Freeze Timer power-up), independent of the
   game/render logic. */

export class GameTimer {
  constructor({ mode = 'up', startSeconds = 0, onTick, onExpire }) {
    this.mode = mode; // 'up' (classic/survival/endless) or 'down' (time attack)
    this.seconds = startSeconds;
    this.onTick = onTick || (() => {});
    this.onExpire = onExpire || (() => {});
    this._interval = null;
    this._frozenUntil = 0;
  }
  start() {
    if (this._interval) return;
    this._interval = setInterval(() => {
      if (Date.now() < this._frozenUntil) { this.onTick(this.seconds); return; }
      this.seconds += this.mode === 'up' ? 1 : -1;
      this.onTick(this.seconds);
      if (this.mode === 'down' && this.seconds <= 0) {
        this.seconds = 0;
        this.stop();
        this.onExpire();
      }
    }, 1000);
  }
  stop() { clearInterval(this._interval); this._interval = null; }
  reset(startSeconds = 0) { this.stop(); this.seconds = startSeconds; }
  addSeconds(n) { this.seconds = Math.max(0, this.seconds + n); this.onTick(this.seconds); }
  freezeFor(ms) { this._frozenUntil = Date.now() + ms; }
  static fmt(totalSeconds) {
    const s = Math.max(0, totalSeconds);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }
}
