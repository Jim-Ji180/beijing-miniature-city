import { solarNightBegins } from './solar-timeline.js?v=1';

const noon = 12 * 60;

function phaseAt(minutes) {
  if (minutes < 7 * 60) return '朝霞';
  if (minutes < 10 * 60) return '早晨';
  if (minutes < 14 * 60) return '中午';
  if (minutes < 17 * 60) return '午后';
  if (minutes < solarNightBegins) return '晚霞';
  return '夜晚';
}

export function bindSolarControl(input) {
  const root = input.closest('.solar-time');
  const readout = root.querySelector('.solar-readout output');
  const phase = root.querySelector('.solar-readout span');
  const hit = root.querySelector('.solar-arc-hit');
  const plot = root.querySelector('.solar-arc-plot');
  const min = Number(input.min);
  const max = Number(input.max);
  const step = Number(input.step);
  let pointerId = null;
  let startValue = input.value;

  function sync(minutes = input.valueAsNumber) {
    input.value = String(minutes);
    const value = input.valueAsNumber;
    const progress = value <= noon
      ? .5 * (value - min) / (noon - min)
      : .5 + .5 * (value - noon) / (max - noon);
    const angle = Math.PI * progress;
    const time = [Math.floor(value / 60), value % 60].map(part => String(part).padStart(2, '0')).join(':');
    const label = phaseAt(value);
    readout.value = time;
    phase.textContent = label;
    root.dataset.phase = label === '夜晚' ? 'night' : 'day';
    input.setAttribute('aria-valuetext', `${time} ${label}`);
    plot.style.setProperty('--sun-x', `${50 - 50 * Math.cos(angle)}%`);
    plot.style.setProperty('--sun-y', `${100 - 100 * Math.sin(angle)}%`);
  }

  function seek(event) {
    const bounds = plot.getBoundingClientRect();
    const x = bounds.left + bounds.width * .5 - event.clientX;
    const y = Math.max(0, bounds.top + bounds.height - event.clientY);
    if (Math.hypot(x, y) < 2) return;
    const progress = Math.atan2(y, x) / Math.PI;
    const minutes = progress <= .5
      ? min + (noon - min) * progress * 2
      : noon + (max - noon) * (progress - .5) * 2;
    const value = min + Math.round((minutes - min) / step) * step;
    if (value === input.valueAsNumber) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input', {bubbles: true}));
  }

  hit.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointerId !== null) return;
    event.preventDefault();
    root.dataset.pointerFocus = '';
    input.focus({preventScroll: true});
    pointerId = event.pointerId;
    startValue = input.value;
    hit.setPointerCapture(pointerId);
    seek(event);
  });
  hit.addEventListener('pointermove', event => {
    if (event.pointerId === pointerId) seek(event);
  });
  hit.addEventListener('pointerup', event => {
    if (event.pointerId === pointerId) seek(event);
  });
  hit.addEventListener('lostpointercapture', event => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (input.value !== startValue) input.dispatchEvent(new Event('change', {bubbles: true}));
  });
  const restoreFocusOutline = () => delete root.dataset.pointerFocus;
  input.addEventListener('keydown', restoreFocusOutline);
  input.addEventListener('blur', restoreFocusOutline);
  input.addEventListener('input', () => sync());
  sync();
  return {sync};
}
