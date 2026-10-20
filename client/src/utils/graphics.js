/**
 * Generated images (SVG data URIs), so every club gets a crest and every player
 * a jersey "photo" in the club colours – no external image service needed.
 */
const PALETTES = [
  ['#d4ff3f', '#0b0f17'], ['#ff5a3c', '#ffffff'], ['#4da3ff', '#0b0f17'], ['#ffc53d', '#1a1a1a'],
  ['#b06bff', '#ffffff'], ['#2ee6a6', '#0b0f17'], ['#ff7ab6', '#1a1a1a'], ['#e6ebf5', '#13315c'],
];

function hash(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  // final mix so similar names ("RK ...") get different colours
  h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0; h ^= h >>> 16;
  return h >>> 0;
}

// fixed colours for the clubs from the initial data (others get a colour from their name)
const KNOWN = {
  'RK Vardar 1961': ['#ff5a3c', '#ffffff'],
  'RK Eurofarm Pelister': ['#2ee6a6', '#0b0f17'],
  'RK Alkaloid': ['#4da3ff', '#0b0f17'],
  'RK Ohrid': ['#b06bff', '#ffffff'],
  'RK Struga': ['#ffc53d', '#1a1a1a'],
  'RK Prilep': ['#ff7ab6', '#1a1a1a'],
  'FC Barcelona': ['#d4ff3f', '#0b0f17'],
  'THW Kiel': ['#e6ebf5', '#13315c'],
};

/** [main colour, contrast colour] – always the same for the same club */
export const clubColors = (key) => KNOWN[key] || PALETTES[hash(String(key || 'HandballHub')) % PALETTES.length];

const toUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const esc = (s) => String(s).replace(/[&<>"']/g, '');

/** Shield-shaped crest with the club initials */
export function crestUri(name = '') {
  const [main, ink] = clubColors(name);
  const short = esc(name.replace(/^(RK|FC|THW|HC|KS|SC)\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'HH');
  return toUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116">
  <path d="M50 3 L95 18 V58 C95 86 74 104 50 113 C26 104 5 86 5 58 V18 Z" fill="${main}" stroke="#0b0f17" stroke-width="4"/>
  <path d="M50 14 L84 25 V58 C84 79 69 93 50 101 C31 93 16 79 16 58 V25 Z" fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="3"/>
  <path d="M16 46 H84" stroke="${ink}" stroke-opacity=".25" stroke-width="10"/>
  <text x="50" y="72" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="40" font-weight="700" fill="${ink}">${short}</text>
</svg>`);
}

/** Jersey with the shirt number – used as the player's picture when there is no photo */
export function jerseyUri(number, clubKey, surname = '') {
  const [main, ink] = clubColors(clubKey);
  const n = esc(number === '' || number == null ? '' : number);
  const label = esc(surname).toUpperCase().slice(0, 12);
  return toUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#121826"/>
  <circle cx="200" cy="200" r="170" fill="${main}" fill-opacity=".08"/>
  <path d="M135 70 L170 55 Q200 80 230 55 L265 70 L335 115 L305 175 L275 160 L275 345 L125 345 L125 160 L95 175 L65 115 Z" fill="${main}" stroke="#0b0f17" stroke-width="6" stroke-linejoin="round"/>
  <path d="M170 55 Q200 95 230 55" fill="none" stroke="${ink}" stroke-width="8"/>
  <path d="M125 300 H275" stroke="${ink}" stroke-opacity=".25" stroke-width="14"/>
  <text x="200" y="150" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="2" fill="${ink}">${label}</text>
  <text x="200" y="262" text-anchor="middle" font-family="Oswald, Impact, Arial Black, sans-serif" font-size="120" font-weight="700" fill="${ink}">${n}</text>
</svg>`);
}
