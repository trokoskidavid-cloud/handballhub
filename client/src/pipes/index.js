/**
 * "Pipes" – pure transformation functions used in the views (React equivalent of Angular pipes).
 * They can be chained with `pipe(value, fn1, fn2, ...)`, e.g. pipe(text, truncate(80), capitalize).
 */

export const pipe = (value, ...fns) => fns.reduce((acc, fn) => fn(acc), value);

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

/** 1) Date of birth -> age in years */
export function age(dateOfBirth) {
  if (!dateOfBirth) return null;
  return Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / YEAR_MS);
}

const MONTHS_MK = ['јануари', 'февруари', 'март', 'април', 'мај', 'јуни', 'јули', 'август', 'септември', 'октомври', 'ноември', 'декември'];
const DAYS_MK = ['недела', 'понеделник', 'вторник', 'среда', 'четврток', 'петок', 'сабота'];
const two = (n) => String(n).padStart(2, '0');

/**
 * 2) Date -> "20.10.2026" (short), "20 октомври 2026, 19:00" (long),
 *    "сабота, 24.10. во 19:00" (match), "2026-10-20" (iso) or "19:00" (time)
 */
export function formatDate(date, format = 'short') {
  if (!date) return '–';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '–';
  const time = `${two(d.getHours())}:${two(d.getMinutes())}`;
  if (format === 'long') return `${d.getDate()} ${MONTHS_MK[d.getMonth()]} ${d.getFullYear()}, ${time}`;
  if (format === 'match') return `${DAYS_MK[d.getDay()]}, ${two(d.getDate())}.${two(d.getMonth() + 1)}. во ${time}`;
  if (format === 'time') return time;
  if (format === 'iso') return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
  if (format === 'datetime-local') return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${time}`;
  return `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** 3) Position code -> full name */
export const POSITION_NAMES = {
  GK: 'Голман', LW: 'Лево крило', LB: 'Лев бек', CB: 'Среден бек', RB: 'Десен бек', RW: 'Десно крило', PV: 'Пивот',
};
export const positionName = (code, withCode = false) =>
  (POSITION_NAMES[code] ? `${POSITION_NAMES[code]}${withCode ? ` (${code})` : ''}` : code || '–');

/** 4) Throwing hand / match status -> Macedonian label (+ Bootstrap colour) */
export const HAND = { right: 'Деснак', left: 'Леворак' };
export const handLabel = (h) => HAND[h] || '–';
export const MATCH_STATUS = {
  scheduled: { label: 'Закажан', color: 'info' },
  finished: { label: 'Одигран', color: 'secondary' },
};
export const matchStatusLabel = (s) => MATCH_STATUS[s]?.label || s;

/** 5) Prediction points (0–5) -> Bootstrap colour and description */
export function pointsColor(points) {
  if (points == null) return 'light';
  if (points >= 5) return 'success';
  if (points >= 2) return 'primary';
  return 'danger';
}
export const POINTS_LABEL = { 5: 'Точен резултат', 3: 'Победник + гол-разлика', 2: 'Точен победник', 0: 'Промашено' };
export const pointsLabel = (p) => (p == null ? 'Чека резултат' : POINTS_LABEL[p] || `${p} поени`);

/** 6) Result of a club in a match: W / D / L -> label + colour */
export const FORM = { W: { label: 'П', title: 'Победа', color: '#198754' }, D: { label: 'Н', title: 'Нерешено', color: '#6c757d' }, L: { label: 'И', title: 'Пораз', color: '#dc3545' } };

/** 7) number -> percentage text ("67%") */
export const percent = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : '–');

/** 8) Signed number ("+5", "-3", "0") – goal difference */
export const signed = (n) => (n > 0 ? `+${n}` : String(n ?? 0));

/** 9) Text -> truncated text (curried so it can be used inside pipe()) */
export const truncate = (n = 100) => (text = '') => (text.length > n ? `${text.slice(0, n).trimEnd()}…` : text);

/** 10) First letter upper case */
export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

/** 11) Date -> relative time ("пред 2 ч.", "за 3 дена") */
export function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  const abs = Math.abs(diff);
  const pre = diff >= 0 ? 'пред' : 'за';
  if (abs < 60) return diff >= 0 ? 'пред момент' : 'за момент';
  if (abs < 3600) return `${pre} ${Math.floor(abs / 60)} мин.`;
  if (abs < 86400) return `${pre} ${Math.floor(abs / 3600)} ч.`;
  if (abs < 86400 * 30) return `${pre} ${Math.floor(abs / 86400)} дена`;
  return formatDate(date);
}

/** 12) Name -> initials ("Ana Petrovska" -> "AP") */
export const initials = (name = '') =>
  name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
