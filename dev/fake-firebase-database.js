// Dev stand-in for firebase-database.js — one JSON tree in localStorage, shared
// across tabs. Mimics the Firebase behaviour the game relies on: illegal key
// characters throw, and nulls/empty objects are dropped.
const STORE     = 'gauntlet-fake-db';
const SEED      = { stats: { recentWinner: 'Ana', playerWins: { Ana: 2, Ben: 2, Cam: 1 } } };
const listeners = new Set();

const parts = path => path.split('/').filter(Boolean);
const clone = v => (v == null ? null : JSON.parse(JSON.stringify(v)));
const at    = (tree, path) => parts(path).reduce((n, k) => (n == null ? null : n[k] ?? null), tree);

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || clone(SEED); } catch { return clone(SEED); }
}
function save(tree) {
  localStorage.setItem(STORE, JSON.stringify(tree || {}));
  listeners.forEach(fire => fire());
}

function checkKeys(v, path) {
  if (!v || typeof v !== 'object') return;
  for (const k of Object.keys(v)) {
    if (/[.#$\/\[\]]/.test(k)) throw new Error(`Invalid key "${k}" at ${path}: keys can't contain . # $ / [ ]`);
    checkKeys(v[k], `${path}/${k}`);
  }
}

function prune(v) {
  if (v == null || typeof v !== 'object') return v;
  const out = Array.isArray(v) ? [] : {};
  for (const [k, c] of Object.entries(v)) { const p = prune(c); if (p != null) out[k] = p; }
  return Object.keys(out).length ? out : null;
}

function setAt(tree, path, val) {
  const ks = parts(path);
  let n = tree;
  ks.slice(0, -1).forEach(k => { if (n[k] == null || typeof n[k] !== 'object') n[k] = {}; n = n[k]; });
  n[ks[ks.length - 1]] = clone(val);
  return tree;
}

export function getDatabase() { return {}; }
export function ref(db, path) { return { path }; }

export async function set(r, val) {
  checkKeys(val, r.path);
  save(prune(setAt(load(), r.path, val)));
}

export async function update(r, vals) {
  let tree = load();
  for (const [k, v] of Object.entries(vals)) {
    checkKeys(v, `${r.path}/${k}`);
    tree = setAt(tree, `${r.path}/${k}`, v);
  }
  save(prune(tree));
}

export async function get(r) {
  const v = clone(at(load(), r.path));
  return { val: () => v };
}

export function onValue(r, cb) {
  const fire = () => { const v = clone(at(load(), r.path)); cb({ val: () => v }); };
  listeners.add(fire);
  setTimeout(() => { if (listeners.has(fire)) fire(); });
  return () => listeners.delete(fire);
}

window.addEventListener('storage', e => { if (e.key === STORE) listeners.forEach(fire => fire()); });
