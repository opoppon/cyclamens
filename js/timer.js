// Minuteur basé sur un timestamp de référence (précis même si l'onglet est mis en veille).
const Timer = (() => {
  const DURATION_S = 3 * 60;

  let endAt = null;      // timestamp de fin visé
  let remaining = DURATION_S;
  let intervalId = null;
  let onTick = () => {};
  let onDone = () => {};

  function format(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function tick() {
    const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    remaining = left;
    onTick(format(left));
    if (left <= 0) {
      stop();
      onDone();
    }
  }

  function start() {
    if (intervalId) return;
    endAt = Date.now() + remaining * 1000;
    intervalId = setInterval(tick, 250);
    tick();
  }

  function pause() {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
    remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  function reset() {
    stop();
    remaining = DURATION_S;
    onTick(format(remaining));
  }

  function isRunning() {
    return intervalId !== null;
  }

  function init(handlers) {
    onTick = handlers.onTick || onTick;
    onDone = handlers.onDone || onDone;
    onTick(format(remaining));
  }

  return { init, start, pause, reset, isRunning };
})();
