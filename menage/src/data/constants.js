// Couleurs proposées pour les profils. Les classes Tailwind sont écrites en entier pour être détectées au build.
export const COLORS = {
  sky: { label: 'Ciel', avatar: 'bg-sky-500 text-white', soft: 'bg-sky-50 text-sky-700 ring-sky-200', border: 'border-l-sky-500', bar: 'bg-sky-500', dot: 'bg-sky-500' },
  indigo: { label: 'Indigo', avatar: 'bg-indigo-500 text-white', soft: 'bg-indigo-50 text-indigo-700 ring-indigo-200', border: 'border-l-indigo-500', bar: 'bg-indigo-500', dot: 'bg-indigo-500' },
  teal: { label: 'Turquoise', avatar: 'bg-teal-500 text-white', soft: 'bg-teal-50 text-teal-700 ring-teal-200', border: 'border-l-teal-500', bar: 'bg-teal-500', dot: 'bg-teal-500' },
  lime: { label: 'Vert pomme', avatar: 'bg-lime-500 text-white', soft: 'bg-lime-50 text-lime-700 ring-lime-200', border: 'border-l-lime-500', bar: 'bg-lime-500', dot: 'bg-lime-500' },
  amber: { label: 'Ambre', avatar: 'bg-amber-500 text-white', soft: 'bg-amber-50 text-amber-800 ring-amber-200', border: 'border-l-amber-500', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  orange: { label: 'Orange', avatar: 'bg-orange-500 text-white', soft: 'bg-orange-50 text-orange-700 ring-orange-200', border: 'border-l-orange-500', bar: 'bg-orange-500', dot: 'bg-orange-500' },
  rose: { label: 'Rose', avatar: 'bg-rose-500 text-white', soft: 'bg-rose-50 text-rose-700 ring-rose-200', border: 'border-l-rose-500', bar: 'bg-rose-500', dot: 'bg-rose-500' },
  fuchsia: { label: 'Fuchsia', avatar: 'bg-fuchsia-500 text-white', soft: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200', border: 'border-l-fuchsia-500', bar: 'bg-fuchsia-500', dot: 'bg-fuchsia-500' },
};

export const AVATAR_EMOJIS = ['', '😎', '🦊', '🐱', '🐼', '🦁', '🐸', '🦄', '🌸', '⚡', '🎮', '⚽', '🎸', '👑', '🌈', '🍕'];

// Profils par défaut des membres du foyer ; personnalisables (nom, emoji, couleur) dans la page Profil.
const MEMBER_DEFAULTS = [
  { id: 'geremy', name: 'Gérémy', color: 'sky' },
  { id: 'henda', name: 'Henda', color: 'rose' },
  { id: 'lucas', name: 'Lucas', color: 'amber' },
];

export const MEMBERS = MEMBER_DEFAULTS.map((d) => ({ ...d, initial: d.name[0], emoji: '', ...COLORS[d.color] }));

/**
 * Applique les personnalisations enregistrées (state.profiles) aux objets MEMBERS.
 * Les objets sont modifiés en place pour que getMember() et MEMBERS restent à jour partout.
 */
export function applyProfiles(profiles = {}) {
  MEMBER_DEFAULTS.forEach((d, i) => {
    const p = profiles[d.id] ?? {};
    const name = p.name?.trim() || d.name;
    const color = COLORS[p.color] ? p.color : d.color;
    Object.assign(MEMBERS[i], { name, color, initial: name[0].toUpperCase(), emoji: p.emoji || '', ...COLORS[color] });
  });
}

export const memberDefaults = (id) => MEMBER_DEFAULTS.find((d) => d.id === id);

export const ROTATION = {
  id: 'rotation', name: 'Tournant', initial: '↻', emoji: '',
  avatar: 'bg-violet-500 text-white', soft: 'bg-violet-50 text-violet-700 ring-violet-200',
  border: 'border-l-violet-500', bar: 'bg-violet-500', dot: 'bg-violet-500',
};

export const ASSIGNEES = [...MEMBERS, ROTATION];

export const ROOMS = [
  { id: 'chambre-hg', name: 'Chambre Henda et Gérémy', short: 'Chambre H & G', icon: '🛏️' },
  { id: 'chambre-lucas', name: 'Chambre Lucas', short: 'Ch. Lucas', icon: '🧸' },
  { id: 'toilette', name: 'Toilette', short: 'Toilette', icon: '🚽' },
  { id: 'sdb', name: 'Salle de bain', short: 'Salle de bain', icon: '🛁' },
  { id: 'cuisine', name: 'Cuisine', short: 'Cuisine', icon: '🍳' },
  { id: 'salon', name: 'Salon', short: 'Salon', icon: '🛋️' },
  { id: 'balcon', name: 'Balcon', short: 'Balcon', icon: '🌿' },
  { id: 'cellier', name: 'Cellier / Cagibi', short: 'Cellier', icon: '📦' },
];

export const FREQUENCIES = [
  { id: 'weekly', label: 'Hebdomadaire', short: 'Hebdo' },
  { id: 'monthly', label: 'Mensuelle', short: 'Mensuel' },
  { id: 'quarterly', label: 'Trimestrielle', short: 'Trimestriel' },
  { id: 'yearly', label: 'Annuelle', short: 'Annuel' },
  { id: 'once', label: 'Ponctuelle', short: 'Ponctuel' },
];

export const MATERIAL_CATEGORIES = [
  { id: 'peinture', label: 'Peinture', icon: '🎨' },
  { id: 'ampoule', label: 'Ampoules', icon: '💡' },
  { id: 'quincaillerie', label: 'Quincaillerie', icon: '🔩' },
  { id: 'plomberie', label: 'Plomberie & joints', icon: '🚰' },
  { id: 'filtre', label: 'Filtres & consommables', icon: '🌀' },
  { id: 'autre', label: 'Autre', icon: '🧰' },
];

export const TASK_SUGGESTIONS = [
  'Serpillière', 'Aspirateur', 'Détartrage cafetière', 'Nettoyage filtres VMC/clim',
  'Soin meubles en bois', 'Changer les draps', 'Nettoyer les vitres', 'Nettoyer le four',
  'Dégivrer le congélateur', 'Sortir les poubelles', 'Dépoussiérer', 'Détartrer la bouilloire',
];

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const ASSIGNEE_MAP = byId(ASSIGNEES);
const ROOM_MAP = byId(ROOMS);
const FREQ_MAP = byId(FREQUENCIES);
const CAT_MAP = byId(MATERIAL_CATEGORIES);

export const getMember = (id) => ASSIGNEE_MAP[id] ?? ROTATION;
export const getRoom = (id) => ROOM_MAP[id] ?? { id: '', name: 'Toute la maison', short: 'Maison', icon: '🏠' };
export const getFreq = (id) => FREQ_MAP[id] ?? FREQUENCIES[0];
export const getCategory = (id) => CAT_MAP[id] ?? CAT_MAP.autre;
