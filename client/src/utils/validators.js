/**
 * Client-side validation (third level of data integrity, after the server's
 * application level and Mongoose schema level). Same patterns as server/utils/patterns.js.
 */
export const PATTERNS = {
  username: /^[a-zA-Z0-9._]{3,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/,
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/,
  personName: /^[\p{L}][\p{L}\s.'-]{1,49}$/u,
  country: /^[\p{L}][\p{L}\s.'-]{1,59}$/u,
  clubName: /^[\p{L}\d][\p{L}\d\s.'&()-]{1,59}$/u,
  competition: /^[\p{L}\d][\p{L}\d\s.'-]{1,59}$/u,
  url: /^https?:\/\/[^\s]+$/i,
  date: /^\d{4}-\d{2}-\d{2}$/,
  dateTime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
  integer: /^\d+$/,
};

export const POSITIONS = ['GK', 'LW', 'LB', 'CB', 'RB', 'RW', 'PV'];
export const HANDS = ['right', 'left'];
export const COUNTRIES = ['North Macedonia', 'Albania', 'Serbia', 'Kosovo', 'Bulgaria', 'Greece', 'Croatia', 'Slovenia', 'Montenegro',
  'Bosnia and Herzegovina', 'Turkey', 'Spain', 'France', 'Germany', 'Denmark', 'Norway', 'Sweden', 'Hungary', 'Poland', 'Egypt', 'Other'];

/** Rule helpers – each returns an error message or null */
export const required = (msg = 'Задолжително поле') => (v) => (v === undefined || v === null || String(v).trim() === '' ? msg : null);
export const matches = (rx, msg) => (v) => (v && !rx.test(String(v).trim()) ? msg : null);
export const oneOf = (list, msg = 'Изберете вредност од листата') => (v) => (v && !list.includes(v) ? msg : null);
export const minLen = (n) => (v) => (v && String(v).trim().length < n ? `Најмалку ${n} знаци` : null);
export const maxLen = (n) => (v) => (v && String(v).length > n ? `Најмногу ${n} знаци` : null);
export const range = (min, max, msg) => (v) => {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) || n < min || n > max ? msg || `Вредност меѓу ${min} и ${max}` : null;
};
export const integer = (v) => (v !== '' && v != null && !PATTERNS.integer.test(String(v)) ? 'Мора да е цел број' : null);
export const ageBetween = (min, max) => (v) => {
  if (!v) return null;
  if (!PATTERNS.date.test(v)) return 'Невалиден датум';
  const years = (Date.now() - new Date(v).getTime()) / (365.25 * 24 * 3600 * 1000);
  return years < min || years > max ? `Возраста мора да е меѓу ${min} и ${max} години` : null;
};
export const sameAs = (getOther, msg) => (v, values) => (v !== getOther(values) ? msg : null);
export const different = (getOther, msg) => (v, values) => (v && v === getOther(values) ? msg : null);

/**
 * validate(values, schema) -> { field: message }
 * schema = { field: [rule, rule, ...] }; nested paths like "a.b" are supported.
 */
export function validate(values, schema) {
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const err = rule(get(values, field), values);
      if (err) { errors[field] = err; break; }
    }
  }
  return errors;
}

// ---------- form schemas ----------
export const loginSchema = {
  email: [required(), matches(PATTERNS.email, 'Невалидна е-пошта')],
  password: [required()],
};

export const registerSchema = {
  username: [required(), matches(PATTERNS.username, '3–20 знаци: букви, бројки, точка и _')],
  email: [required(), matches(PATTERNS.email, 'Невалидна е-пошта (пр. ime@domen.mk)')],
  fullName: [matches(PATTERNS.personName, 'Само букви, празно место, точка, апостроф и цртичка')],
  password: [required(), matches(PATTERNS.password, 'Мин. 8 знаци, барем една буква и една бројка')],
  confirmPassword: [required(), sameAs((v) => v.password, 'Лозинките не се совпаѓаат')],
  country: [oneOf(COUNTRIES)],
};

export const playerSchema = {
  firstName: [required(), matches(PATTERNS.personName, 'Невалидно име (само букви)')],
  lastName: [required(), matches(PATTERNS.personName, 'Невалидно презиме (само букви)')],
  dateOfBirth: [required(), ageBetween(15, 45)],
  nationality: [required(), matches(PATTERNS.country, 'Невалидна националност')],
  position: [required(), oneOf(POSITIONS)],
  jerseyNumber: [integer, range(1, 99, 'Број на дрес од 1 до 99')],
  hand: [oneOf(HANDS)],
  heightCm: [integer, range(160, 220, 'Висината мора да е меѓу 160 и 220 cm')],
  photoUrl: [matches(PATTERNS.url, 'URL мора да почнува со http:// или https://')],
  notes: [maxLen(1000)],
};

export const clubSchema = {
  name: [required(), matches(PATTERNS.clubName, 'Невалидно име на клуб')],
  city: [required(), matches(PATTERNS.country, 'Невалиден град')],
  country: [required(), matches(PATTERNS.country, 'Невалидна држава')],
  league: [maxLen(60)],
  founded: [integer, range(1900, new Date().getFullYear(), `Година меѓу 1900 и ${new Date().getFullYear()}`)],
  arena: [maxLen(80)],
  logoUrl: [matches(PATTERNS.url, 'URL мора да почнува со http:// или https://')],
};

export const matchSchema = {
  homeClub: [required('Изберете домаќин')],
  awayClub: [required('Изберете гостин'), different((v) => v.homeClub, 'Клубовите мора да се различни')],
  date: [required(), matches(PATTERNS.dateTime, 'Невалиден датум и време')],
  competition: [required(), matches(PATTERNS.competition, '2–60 знаци (букви и бројки)')],
  round: [integer, range(1, 50, 'Коло од 1 до 50')],
  venue: [maxLen(80)],
};

const score = [required('Внесете голови'), integer, range(0, 70, '0–70')];
export const resultSchema = { homeScore: score, awayScore: score };
export const predictionSchema = { homeScore: score, awayScore: score, note: [maxLen(200)] };

export const commentSchema = { text: [required('Коментарот е празен'), minLen(2), maxLen(500)] };
