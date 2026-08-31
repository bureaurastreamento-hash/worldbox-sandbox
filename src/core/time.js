export function createTimeState({ speed = 1, paused = false } = {}) {
  const state = { speed, paused, elapsed: 0 };

  state.advance = (realDtSeconds) => {
    if (state.paused) return 0;
    const simDt = realDtSeconds * state.speed;
    state.elapsed += simDt;
    return simDt;
  };

  state.togglePause = () => {
    state.paused = !state.paused;
  };
  state.pause = () => {
    state.paused = true;
  };
  state.resume = () => {
    state.paused = false;
  };
  state.setSpeed = (s) => {
    state.speed = s;
  };

  return state;
}
