/* ============================================================
   sound.js — Sonidos sutiles (sin archivos, generados al vuelo)
   Usa el Web Audio API: no pesa nada y funciona offline.
   Pon Sonido.activo = false para silenciar (lo conectaremos a Ajustes).
   ============================================================ */

const Sonido = {
  ctx: null,
  activo: true,

  _ac() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  _tono(freq, dur, tipo = 'sine', vol = 0.05) {
    if (!this.activo) return;
    const ac = this._ac();
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = tipo;
    o.frequency.value = freq;
    o.connect(g); g.connect(ac.destination);
    const t = ac.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  },

  /* clic suave al tocar una alternativa */
  click()   { this._tono(420, 0.05, 'triangle', 0.035); },
  /* dos notas ascendentes al acertar */
  acierto() { this._tono(660, 0.09, 'sine', 0.06); setTimeout(() => this._tono(880, 0.12, 'sine', 0.06), 90); },
  /* tono grave breve al fallar */
  error()   { this._tono(170, 0.20, 'sawtooth', 0.045); },
};