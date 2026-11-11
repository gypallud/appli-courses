// Analyse les photos envoyées depuis l'appli, sur le PC, avec Claude Code.
// Surveille l'onglet Tickets (lecture publique, gratuite) et ne lance Claude que quand une photo attend.
// Usage : node worker/worker.js --once   un passage photos (tâche planifiée à 8 h, 11 h, 14 h, 17 h et 20 h, voir install-taches.ps1)
//         node worker/worker.js --once --recipes   un passage idées de recettes (10 min après chaque passage)
//         node worker/worker.js --once --plantes   un passage photos de plantes seulement (toutes les 5 min, ne lance Claude que si une photo attend)
//         node worker/worker.js --plantes --essai photo.jpg   identifie une photo locale sans rien enregistrer
//         node worker/worker.js          surveillance continue toutes les pollSeconds
// Config dans worker/config.json (voir config.example.json).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const SHEET_ID = config.sheetId || '1SIeLdirTtJMi7qgARrFlL5LdFQWUgBzN85fqVGJnFio';
const CLAUDE = config.claude || path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude');
const POLL_MS = (config.pollSeconds || 15) * 1000;
const TMP = path.join(os.tmpdir(), 'appli-courses-photos');
fs.mkdirSync(TMP, { recursive: true });

const log = (...a) => console.log(new Date().toLocaleTimeString('fr-FR'), ...a);

async function call(action, extra = {}) {
  const res = await fetch(config.syncUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, key: config.key, ...extra }),
  });
  const out = await res.json();
  if (!out.ok) throw new Error(out.error || 'erreur Apps Script');
  return out;
}

// Deux modes : les photos (ticket, stock) et les demandes d'idées de recettes, lancés à des heures différentes
const IDEAS = 'Idées recettes';
const RECIPES_MODE = process.argv.includes('--recipes');
// Le panier Drive n'utilise pas Claude : il est traité à chaque passage
const DRIVE = 'Panier Drive';
// Photos de l'appli des plantes : traitées à chaque passage photos, et toutes les 5 min par le passage léger --plantes
const PLANTE = 'Photo de plante';
const PLANTS_MODE = process.argv.includes('--plantes');
const isMine = (t) => (PLANTS_MODE ? t['Type'] === PLANTE : t['Type'] === DRIVE || (t['Type'] === IDEAS) === RECIPES_MODE);
// --essai : avec --recipes, génère 2 idées pour Henda ; sans, cherche les articles Drive des 4 premiers produits de la liste.
// Affiche le résultat sans rien enregistrer.
const TRIAL = process.argv.includes('--essai');

async function hasPending() {
  const where = PLANTS_MODE
    ? `G = 'En attente' and C = '${PLANTE}'`
    : `(G = 'En attente' and C ${RECIPES_MODE ? '=' : '<>'} '${IDEAS}') or (C = '${DRIVE}' and (G = 'En attente' or G = 'Validé'))`;
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=Tickets&tq=${encodeURIComponent('select count(A) where ' + where)}&t=${Date.now()}`;
  const text = await (await fetch(url)).text();
  if (text.trimStart().startsWith('<')) return true; // Sheets non public : on demande directement à Apps Script
  const n = parseInt(text.split('\n')[1]?.replace(/"/g, ''), 10);
  return n > 0;
}

function prompt(t, ctx, file) {
  const stockLoc = ctx.stock.filter((s) => String(s['Emplacement']).toLowerCase() === String(t['Emplacement']).toLowerCase());
  const aAcheter = ctx.courses.map((c) => c['Produit']);
  const common = `Tu mets à jour l'appli de courses d'un foyer français de 3 adultes.
Lis l'image ${file} (outil Read), puis réponds UNIQUEMENT avec un objet JSON, sans texte autour, sans bloc de code.

Règles :
- Noms de produits simples et lisibles en français (« Lait demi-écrémé », pas « LT 1/2 ECR UHT »). Réutilise exactement le nom d'un produit existant quand c'est le même.
- Catégorie : exactement une de celles-ci : ${(ctx.categories || []).join(', ') || 'Produits laitiers, Fruits & légumes, Viande, Poisson, Frais, Surgelés, Épicerie, Boulangerie, Boissons, Hygiène, Entretien, Autre'} (papier toilette, savon → Hygiène ; lessive, éponges → Entretien).
- Emplacements possibles : ${ctx.emplacements.join(', ')}.
- Produits déjà en stock (nom | emplacement) : ${ctx.stock.map((s) => `${s['Produit']} | ${s['Emplacement']}`).join(' ; ')}.
  Si un article correspond à l'un d'eux (même au singulier/pluriel ou avec une variante de marque), réutilise ce nom ET cet emplacement pour que les quantités s'additionnent.
- Quantité numérique quand c'est possible. Unité : exactement une de celles-ci, ou "" : ${(ctx.unites || []).join(', ') || 'pièces, g, kg, ml, cl, L, paquet, pot, boîte, bouteille, sachet, tranches'}.
- DLC au format AAAA-MM-JJ seulement si elle est lisible, sinon "".
- Ne range pas dans le stock ce qui n'est pas de la nourriture ou un produit ménager (sacs, consigne, remises).
`;
  if (t['Type'] === 'Ticket de caisse') {
    return common + `
C'est un TICKET DE CAISSE. Ajoute chaque article acheté au stock dans l'emplacement le plus logique.
Produits de la liste de courses : ${JSON.stringify(aAcheter)}. Mets dans "achetes" ceux qui figurent sur le ticket (nom exact de la liste).

Format :
{"mode":"ajout","magasin":"…","date":"AAAA-MM-JJ","stock":[{"produit":"…","categorie":"…","quantite":"…","unite":"…","emplacement":"…","dlc":""}],"historique":[{"produit":"…","quantite":"…","prix":"0.00"}],"achetes":["…"],"resume":"12 produits ajoutés au stock"}`;
  }
  return common + `
C'est une PHOTO DU STOCK « ${t['Emplacement']} ». Fais l'inventaire de ce qui est visible.
Contenu actuel enregistré pour ce stock : ${JSON.stringify(stockLoc.map((s) => ({ produit: s['Produit'], quantite: s['Quantité'], unite: s['Unité'] })))}.
- "stock" : chaque produit visible avec sa quantité estimée, emplacement « ${t['Emplacement']} ».
- "retirer" : produits enregistrés pour ce stock qui ne sont clairement plus là (seulement si la photo montre bien tout le stock).

Format :
{"mode":"inventaire","stock":[{"produit":"…","categorie":"…","quantite":"…","unite":"…","emplacement":"${t['Emplacement']}","dlc":""}],"retirer":[{"produit":"…","emplacement":"${t['Emplacement']}"}],"resume":"8 produits vus, 2 retirés"}`;
}

// Appli des plantes : identifier l'espèce et donner ses paramètres d'entretien (mêmes champs que la fiche de l'appli)
function plantPrompt(file) {
  return `Tu es un botaniste spécialiste des plantes d'intérieur. Lis l'image ${file} (outil Read) : c'est la photo d'une plante prise par un particulier.
Identifie l'espèce (ou le cultivar s'il est reconnaissable) et donne ses paramètres d'entretien optimaux en intérieur, pour un logement en France.
Sois honnête sur ta certitude : photo floue, partielle ou ambiguë → "faible" et des alternatives. Si ce n'est pas une plante : "isPlant": false.
Réponds UNIQUEMENT avec un objet JSON, sans texte autour, sans bloc de code, en français :
{"isPlant":true,"commonName":"Nom courant (ex : Pothos doré)","scientificName":"Nom botanique","confidence":"faible|moyenne|élevée",
"alternatives":["jusqu'à 3 autres espèces possibles, vide si certain"],
"avatar":"monstera|broad|palm|spiky|fern|cactus (forme du feuillage la plus proche : monstera = grandes feuilles larges, broad = feuilles en pagaie, palm = palmes, spiky = feuilles fines et pointues, fern = fougère ou rosette, cactus = plante grasse en colonnes)",
"light":"directe|indirecte|ombre","waterSummer":7,"waterWinter":12,"fertilizerEvery":21,
"soil":"terreau recommandé, une phrase","repotting":"fréquence et période de rempotage, une phrase","humidity":"ex : Élevée (60 %)","temperature":"ex : 18 – 25 °C",
"notes":"un conseil clé ou une particularité (toxicité pour les animaux si pertinent)","healthNote":"état visible de la plante sur la photo, \\"\\" si rien à signaler"}
waterSummer / waterWinter : jours entre deux arrosages au printemps-été / en automne-hiver. fertilizerEvery : jours entre deux apports d'engrais de mars à août (0 = aucun).`;
}

// Garde-fous sur la réponse avant de l'envoyer au téléphone
function cleanPlant(r) {
  if (!r || r.isPlant === false) throw new Error("Aucune plante n'a été reconnue sur la photo.");
  const pick = (v, list, def) => (list.includes(v) ? v : def);
  const int = (v, min, max, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
  const str = (v) => (typeof v === 'string' ? v.slice(0, 300) : '');
  if (!str(r.commonName)) throw new Error('Réponse sans nom de plante');
  return {
    commonName: str(r.commonName), scientificName: str(r.scientificName),
    confidence: pick(r.confidence, ['faible', 'moyenne', 'élevée'], 'moyenne'),
    alternatives: Array.isArray(r.alternatives) ? r.alternatives.map(str).filter(Boolean).slice(0, 3) : [],
    avatar: pick(r.avatar, ['monstera', 'broad', 'palm', 'spiky', 'fern', 'cactus'], 'monstera'),
    light: pick(r.light, ['directe', 'indirecte', 'ombre'], 'indirecte'),
    waterSummer: int(r.waterSummer, 1, 60, 7), waterWinter: int(r.waterWinter, 1, 90, 12), fertilizerEvery: int(r.fertilizerEvery, 0, 120, 21),
    soil: str(r.soil), repotting: str(r.repotting), humidity: str(r.humidity), temperature: str(r.temperature),
    notes: str(r.notes), healthNote: str(r.healthNote),
  };
}

function runClaude(text, cwd) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--output-format', 'json', '--allowedTools', 'Read', '--strict-mcp-config', '--model', config.model || 'sonnet'];
    const p = spawn(CLAUDE, args, { cwd, windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || out || 'Claude a échoué'));
      try {
        const result = JSON.parse(out).result;
        const json = result.slice(result.indexOf('{'), result.lastIndexOf('}') + 1);
        resolve(JSON.parse(json));
      } catch (e) {
        reject(new Error('Réponse illisible : ' + out.slice(0, 300)));
      }
    });
    p.stdin.end(text);
  });
}

// Temps de cuisine demandé : limite (préparation + cuisson) et consigne pour Claude
const TIMES = {
  ultra: { max: 15, text: 'ULTRA RAPIDE : 10 à 15 minutes maximum au total, préparation comprise. Assemblages, poêle ou micro-ondes, cuissons très courtes, presque pas de découpe, une seule poêle ou un seul plat.' },
  rapide: { max: 30, text: 'RAPIDE : 30 minutes maximum au total (préparation + cuisson), peu de vaisselle, faisable un soir de semaine.' },
  normal: { max: 60, text: 'NORMAL : 1 heure maximum au total (préparation + cuisson).' },
  long: { max: 0, text: 'J’AI LE TEMPS : plats mijotés, au four, plus élaborés ou de week-end, 1 h à 3 h au total acceptables (beaucoup de temps de cuisson sans surveillance, c’est bien).' },
};
const eatersOf = (t, req) => (req.pour && req.pour.length ? req.pour : [t['Envoyé par']]).map(String);
const noPork = (eaters) => eaters.some((p) => p.toLowerCase() === 'henda');

function prefsText(ctx, eaters) {
  return eaters.map((name) => {
    const p = (ctx.profils || []).find((x) => String(x['Profil']).toLowerCase() === name.toLowerCase()) || {};
    const favs = (ctx.favoris || []).filter((f) => String(f.par).toLowerCase().includes(name.toLowerCase())).map((f) => f.nom);
    // Avis donnés après avoir cuisiné : « Henda:+, Gérémy:- »
    const rated = (sign) => (ctx.avis || []).filter((a) => String(a.avis).split(',').some((x) => x.trim().toLowerCase() === name.toLowerCase() + ':' + sign)).map((a) => a.nom);
    const lines = [
      p['Cuisines'] && `cuisines préférées : ${p['Cuisines']}`,
      p['Aime'] && `adore : ${p['Aime']}`,
      p["N'aime pas"] && `N'AIME PAS (à éviter absolument) : ${p["N'aime pas"]}`,
      p['Allergies'] && `ALLERGIES / RÉGIME (à respecter strictement) : ${p['Allergies']}`,
      p['Niveau'] && `niveau en cuisine : ${p['Niveau']}`,
      p['Épicé'] && `épicé : ${p['Épicé']}`,
      favs.length && `recettes favorites (pour cerner ses goûts) : ${favs.slice(0, 10).join(', ')}`,
      rated('+').length && `a aimé après l'avoir cuisinée : ${rated('+').slice(-10).join(', ')}`,
      rated('-').length && `n'a pas aimé (éviter ce style) : ${rated('-').slice(-10).join(', ')}`,
      p['Refusées'] && `recettes déjà refusées (ne plus proposer ni rien de très proche) : ${p['Refusées']}`,
    ].filter(Boolean);
    return `- ${name} : ${lines.length ? lines.join(' ; ') : 'pas de préférence renseignée'}`;
  }).join('\n');
}

function equipmentOf(ctx, eaters) {
  const all = new Set();
  for (const name of eaters) {
    const p = (ctx.profils || []).find((x) => String(x['Profil']).toLowerCase() === name.toLowerCase());
    String(p?.['Équipement'] || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((e) => all.add(e));
  }
  return [...all];
}

// Jours du menu : à partir de demain
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const menuDays = (n) => Array.from({ length: n }, (_, i) => DAY_NAMES[(new Date().getDay() + 1 + i) % 7]);

function ideasPrompt(t, ctx) {
  const req = JSON.parse(t['Fichier'] || '{}');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = (s) => (s['DLC'] ? (new Date(s['DLC']) - today) / 86400000 : Infinity);
  const urgent = ctx.stock.filter((s) => days(s) >= 0 && days(s) < 3).map((s) => s['Produit']);
  const expired = ctx.stock.filter((s) => days(s) < 0).map((s) => s['Produit']);
  const eaters = eatersOf(t, req);
  const time = TIMES[req.temps] || TIMES.normal;
  const equip = equipmentOf(ctx, eaters);
  const menuList = menuDays(req.nombre || 5);
  return `Tu es un cuisinier qui propose des recettes personnalisées à un foyer français de 3 adultes.
${req.menu
    ? `Compose le MENU des dîners des ${menuList.length} prochains jours (${menuList.join(', ')}), une recette par jour, dans cet ordre, pour 3 personnes.
- Menu équilibré et varié : pas deux fois la même viande ou le même féculent d'affilée, du poisson au moins une fois et un plat végétarien si le menu fait 4 jours ou plus, des légumes chaque jour.
- Limite le gaspillage : les produits qui périment en premier dans les premiers jours, et des ingrédients partagés entre recettes (une crème, un bouquet d'herbes, un paquet entamé) plutôt que des produits achetés pour une seule fois.
- Un plat qui prend plus de temps est bienvenu le samedi ou le dimanche.`
    : `Propose ${req.nombre || 3} recette(s) VRAIMENT différentes entre elles (techniques, saveurs, cuisines variées), réalistes, pour 3 personnes.
Type de recette : ${req.type || 'Plat'}.`}
Temps : ${time.text}
${req.envie ? `Envie exprimée : « ${req.envie} ».` : ''}

Goûts de ceux qui vont manger (la recette doit plaire à tous ; un « n'aime pas » ou une allergie de l'un l'emporte sur les envies des autres) :
${prefsText(ctx, eaters)}

Règles :
- SANS PORC, sans exception (ni jambon, lardons, chorizo, saucisson, gélatine de porc…)${noPork(eaters) ? '' : ', sauf si l\'envie ci-dessus le demande explicitement'}.
- ${req.stockSeul
    ? 'UNIQUEMENT avec les produits en stock ci-dessous, plus sel, poivre, huile, vinaigre, eau et épices sèches courantes. Aucun autre ingrédient.'
    : 'Le stock d\'abord : la recette s\'appuie sur les produits en stock ; au plus 3 ingrédients à acheter en plus des basiques (sel, poivre, huile, épices).'}
- Priorité absolue aux produits à finir vite : ${urgent.length ? urgent.join(', ') : 'aucun'}.
- N'utilise jamais ces produits périmés : ${expired.length ? expired.join(', ') : 'aucun'}.
- Stock actuel (produit | quantité | emplacement) : ${ctx.stock.filter((s) => days(s) >= 0).map((s) => `${s['Produit']} | ${s['Quantité']} ${s['Unité']} | ${s['Emplacement']}`).join(' ; ') || 'vide'}.
- Ne dépasse pas les quantités disponibles en stock.
${equip.length ? `- Équipement disponible : plaques de cuisson, ${equip.join(', ')}. N'utilise aucun autre appareil.\n` : ''}- Évite ces recettes déjà enregistrées : ${(ctx.recettes || []).join(', ') || 'aucune'}.
- Adapte le détail des étapes au niveau en cuisine (débutant : étapes très explicites, temps et repères visuels).
- Ingrédients au format « Nom quantité unité » (ex. « Blancs de poulet 500 g », « Oignon 1 », « Crème fraîche 20 cl »), en reprenant exactement le nom du produit en stock quand c'est lui.
- Étapes courtes et claires, une action par étape, avec les temps et températures.
- Une astuce utile par recette (variante, conservation, accompagnement, préparation à l'avance).
- Catégorie : exactement une de Volaille, Viande, Poisson, Pâtes, Soupe, Salade, Dessert, Végétarien.

Réponds UNIQUEMENT avec un objet JSON, sans texte autour, sans bloc de code :
{"recettes":[{"nom":"…","type":"${req.type || 'Plat'}","categorie":"Volaille","difficulte":"Facile|Moyen|Difficile","cout":"Bon marché|Moyen|Cher","preparation":15,"cuisson":20,"ingredients":["…"],"etapes":["…"],"astuce":"…","sans_porc":true}],"resume":"3 recettes ajoutées"}`;
}

async function processIdeas(t, ctx) {
  const dir = fs.mkdtempSync(path.join(TMP, t['ID'] + '-'));
  try {
    const req = JSON.parse(t['Fichier'] || '{}');
    const eaters = eatersOf(t, req);
    const max = (TIMES[req.temps] || TIMES.normal).max;
    const out = await runClaude(ideasPrompt(t, ctx), dir);
    const all = (out.recettes || []).filter((r) => r.nom && !(noPork(eaters) && r.sans_porc === false));
    // Une recette « rapide » qui dépasse nettement le temps demandé est écartée
    const days = menuDays(req.nombre || 5);
    // Pour un menu, on garde tous les jours (le temps sert de consigne) ; sinon une recette trop longue est écartée
    const recettes = all.filter((r) => req.menu || !max || (+r.preparation || 0) + (+r.cuisson || 0) <= max + (max <= 15 ? 0 : 5))
      .map((r, i) => ({
        'Nom': r.nom, 'Portions': 3, 'Temps (min)': (+r.preparation || 0) + (+r.cuisson || 0) || '',
        'Ingrédients': (r.ingredients || []).map((x) => String(x).replace(/;/g, ',')).join('; '),
        'Étapes': (r.etapes || []).map((x) => String(x).replace(/;/g, ',')).join('; '),
        'Sans porc': r.sans_porc === false ? 'Non' : 'Oui', 'Profil': t['Envoyé par'], 'Partagée': 'Oui',
        'Type': r.type || req.type || 'Plat', 'Difficulté': r.difficulte || 'Facile', 'Coût': r.cout || 'Bon marché',
        'Préparation (min)': r.preparation || '', 'Cuisson (min)': r.cuisson || '', 'Image': '',
        'Catégorie': r.categorie || '', 'Astuce': String(r.astuce || '').slice(0, 300), 'Statut': 'Proposée',
        'Menu': req.menu && days[i] ? `${i + 1}|${days[i]}` : '',
      }));
    if (!recettes.length) throw new Error(all.length ? 'recettes trop longues pour le temps demandé' : 'aucune recette proposée');
    if (TRIAL) { console.log(ideasPrompt(t, ctx)); console.log(JSON.stringify(recettes, null, 2)); return 'essai : rien enregistré'; }
    const resume = req.menu ? `Menu de ${recettes.length} jours prêt` : recettes.length === 1 ? '1 recette proposée : ' + recettes[0]['Nom'] : `${recettes.length} recettes proposées`;
    await call('applyRecipes', { id: t['ID'], recettes, resume, menu: !!req.menu });
    return resume;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---- Panier Leclerc Drive ----
// 1er passage : cherche des articles pour chaque produit coché au moment de la demande (onglet Drive) ; on choisit dans l'appli.
// Passage suivant : ajoute les articles choisis au panier. La commande se termine à la main sur Leclerc Drive.
const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').trim();
const PORK = /\b(porc|jambon|lardons?|bacon|saucissons?|chorizo|rillettes?|andouill|boudin|coppa|pancetta|prosciutto|serrano|mortadelle|rosette|knacks?|cervelas|chipolatas?|saucisses?|pate de campagne|museau|travers|echine|filet mignon)\b/;
const NOT_PORK = /\b(volaille|poulet|dinde|boeuf|halal|veau|agneau|vegetal|vegetarien|soja|thon|saumon)\b/;
const isPork = (s) => PORK.test(normTxt(s)) && !NOT_PORK.test(normTxt(s));
const toNum = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; };

// « Lait demi-écrémé Délisse - 1L — 1.05 € [1,05 € / l] ⚠️ indisponible id=964 »
function parseProducts(text) {
  return text.split('\n').map((line) => {
    const m = line.match(/^(.*?) — ([\d.]+) €(?: \[([^\]]+)\])?(.*?)id=(\S+)\s*$/);
    return m && { id: m[5], l: m[1].trim(), p: +m[2], u: m[3] || '', ok: !m[4].includes('indisponible') };
  }).filter(Boolean);
}

// Nombre d'articles à mettre au panier : la quantité de la liste quand elle compte des unités, sinon 1
function packs(c) {
  const q = toNum(c['Quantité']);
  const unitOk = !c['Unité'] || /pi[eè]ce|paquet|bo[iî]te|pot|bouteille|lot|sachet|barquette|brique|boc/i.test(c['Unité']);
  return q && Number.isInteger(q) && q >= 1 && q <= 12 && unitOk ? q : 1;
}

// Dernier prix unitaire payé pour ce produit (onglet Historique), pour repérer l'article habituel
function lastPrice(ctx, produit) {
  const k = normTxt(produit);
  const rows = (ctx.historique || []).filter((h) => normTxt(h['Produit']) === k);
  const h = rows[rows.length - 1];
  if (!h) return null;
  const prix = toNum(h['Prix']), q = toNum(h['Quantité']);
  return prix ? (q && q > 1 && Number.isInteger(q) ? prix / q : prix) : null;
}

// Noms de la maison → mots que Leclerc comprend
const SYNONYMS = [[/\bpacks? d['’ ]?eau\b/, 'pack eau'], [/\bsopalin\b/, 'essuie-tout'], [/\bpq\b/, 'papier toilette'], [/\bpapier wc\b/, 'papier toilette'], [/\bcoca\b(?!-)/, 'coca-cola']];
const keyWords = (s) => normTxt(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !['les', 'des', 'aux', 'avec', 'pour', 'sans'].includes(w)).map((w) => w.replace(/[sx]$/, ''));
// « Papier toilette (double ou triple épaisseur) » : on cherche « papier toilette », la parenthèse sert à départager
function searchTerms(produit) {
  const extra = (String(produit).match(/\(([^)]*)\)/) || [])[1] || '';
  let q = normTxt(String(produit).replace(/\([^)]*\)/g, ' ')).replace(/\s+/g, ' ').trim();
  for (const [re, rep] of SYNONYMS) q = q.replace(re, rep);
  return { q, words: keyWords(q), bonus: keyWords(extra) };
}

async function driveSearch(ctx, drive, produits) {
  const memo = new Map((ctx.choixDrive || []).map((m) => [normTxt(m['Produit']), m]));
  const items = [];
  const wanted = new Set(produits.map(normTxt));
  for (const c of ctx.courses.filter((c) => c['Produit'] && wanted.has(normTxt(c['Produit'])))) {
    const porkOk = isPork(c['Produit']); // du porc seulement s'il est demandé explicitement dans la liste
    const { q, words, bonus } = searchTerms(c['Produit']);
    // Leclerc renvoie des articles sans rapport quand il ne trouve rien (promos) : on ne garde que ceux qui contiennent un mot du produit.
    // D'abord ceux dont le nom commence par le produit, puis ceux qui ont tous les mots, puis les mots de la parenthèse.
    const score = (p) => {
      // Mots entiers seulement : « eau » ne doit pas trouver « peaux »
      const l = normTxt(p.l), has = (w) => new RegExp('(^|[^a-z0-9])' + w).test(l), hits = words.filter(has).length;
      if (!hits) return 0;
      return (words[0] && l.startsWith(words[0]) ? 4 : 0) + (hits === words.length ? 2 : 0) + hits * 0.1 + bonus.filter(has).length;
    };
    const search = async (query) => {
      try { return parseProducts(await drive.call('search_product', { query })).filter((p) => p.ok && (porkOk || !isPork(p.l))); }
      catch (e) { log('  recherche impossible :', query, e.message); return []; }
    };
    let found = (await search(q)).map((p, i) => ({ p, i, s: score(p) })).filter((x) => x.s > 0);
    // Rien de pertinent : nouvelle recherche avec les deux premiers mots
    if (!found.length && words.length > 2) found = (await search(words.slice(0, 2).join(' '))).map((p, i) => ({ p, i, s: score(p) })).filter((x) => x.s > 0);
    found = found.sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.p);
    const m = memo.get(normTxt(c['Produit']));
    const known = m && found.find((p) => String(p.id) === String(m['ID']));
    const price = lastPrice(ctx, c['Produit']);
    let cands = found.filter((p) => p !== known).slice(0, known ? 4 : 5);
    if (known) cands.unshift({ ...known, m: 1 });
    if (price) {
      const near = cands.filter((p) => !p.m && Math.abs(p.p - price) / price < 0.1).sort((a, b) => Math.abs(a.p - price) - Math.abs(b.p - price))[0];
      if (near) near.h = 1;
    }
    cands = cands.map(({ ok, ...p }) => p);
    items.push({ produit: c['Produit'], quantite: packs(c), candidats: cands, choix: known ? known.id : '' });
    log(`  ${c['Produit']} : ${cands.length} article(s)${known ? ' (habituel trouvé)' : ''}`);
  }
  const toChoose = items.filter((i) => !i.choix).length;
  return { items, resume: `${items.length} produits · ${toChoose ? toChoose + ' à choisir' : 'tous déjà choisis, à valider'}` };
}

async function driveFill(t, ctx, drive) {
  const rows = (ctx.drive || []).filter((r) => String(r['Ticket']) === String(t['ID']) && r['Statut'] === 'Choisi' && r['Choix']);
  const lignes = [], memo = [];
  for (const r of rows) {
    const cand = JSON.parse(r['Candidats'] || '[]').find((p) => String(p.id) === String(r['Choix']));
    try {
      await drive.call('add_to_cart', { product_id: String(r['Choix']), quantity: Math.max(1, Math.round(toNum(r['Quantité']) || 1)) });
      lignes.push({ produit: r['Produit'], statut: 'Au panier' });
      memo.push({ produit: r['Produit'], id: String(r['Choix']), libelle: cand ? cand.l : '' });
      log('  +', r['Produit']);
    } catch (e) {
      lignes.push({ produit: r['Produit'], statut: 'Erreur' });
      log('  ✗', r['Produit'], e.message);
    }
  }
  const ok = lignes.filter((l) => l.statut === 'Au panier').length;
  if (rows.length && !ok) throw new Error('Leclerc ne répond pas : reconnecte-toi sur leclercdrive.fr dans le Chrome du PC');
  const total = (await drive.call('get_cart').catch(() => '')).match(/Total : ([\d.]+) €/);
  const errors = lignes.length - ok;
  const resume = `${ok} produit${ok > 1 ? 's' : ''} au panier${total ? ` · total ${total[1].replace('.', ',')} €` : ''}${errors ? ` · ${errors} non ajouté${errors > 1 ? 's' : ''}` : ''}`;
  await call('driveDone', { id: t['ID'], lignes, memo, resume });
  return resume;
}

async function processDrive(t, ctx) {
  const { openDrive, isLoggedIn } = await import('./drive/drive.mjs');
  const drive = await openDrive();
  try {
    if (t['Statut'] === 'Validé') {
      await drive.call('get_cart'); // ouvre la page du magasin dans Chrome
      if (!(await isLoggedIn())) throw new Error('Pas connecté à Leclerc : connecte-toi dans la fenêtre Chrome Leclerc du PC, puis Réessayer');
      return await driveFill(t, ctx, drive);
    }
    let produits = [];
    try { produits = JSON.parse(t['Fichier'] || '{}').produits || []; } catch {}
    // Demande d'une ancienne version de l'appli : les produits cochés
    if (!produits.length) produits = ctx.courses.filter((c) => /^(S[ée]lectionn|Achet)/.test(c['Statut'])).map((c) => c['Produit']);
    const { items, resume } = await driveSearch(ctx, drive, produits);
    if (TRIAL) { console.log(JSON.stringify(items, null, 2)); return 'essai : rien enregistré'; }
    await call('driveProposals', { id: t['ID'], items, resume });
    return resume;
  } finally {
    await drive.close().catch(() => {});
  }
}

// À chaque passage : articles et prix Leclerc de tout ce qui est dans la liste de courses (onglet Prix Drive),
// pour choisir l'article directement dans l'appli. Produits marqués « pas au Drive » (choix « - ») ignorés.
async function refreshPrices() {
  const ctx = await call('pending');
  const skip = new Set((ctx.choixDrive || []).filter((m) => String(m['ID']) === '-').map((m) => normTxt(m['Produit'])));
  const produits = ctx.courses.map((c) => c['Produit']).filter((p) => p && !skip.has(normTxt(p)));
  if (!produits.length) { log('Prix Drive : liste de courses vide'); return; }
  log(`Prix Drive de ${produits.length} produit(s)…`);
  const { openDrive } = await import('./drive/drive.mjs');
  const drive = await openDrive();
  try {
    const { items } = await driveSearch(ctx, drive, produits);
    const out = items.map((it) => ({ produit: it.produit, quantite: it.quantite, candidats: it.candidats }));
    if (TRIAL) { console.log(JSON.stringify(out.map((o) => ({ produit: o.produit, q: o.quantite, premier: o.candidats[0] })), null, 2)); return; }
    await call('drivePrices', { items: out });
    log(`  ✓ ${out.filter((o) => o.candidats.length).length}/${out.length} produits trouvés`);
  } finally {
    await drive.close().catch(() => {});
  }
}

async function processAll() {
  const ctx = await call('pending');
  for (const t of ctx.tickets.filter(isMine)) {
    if (t['Type'] === DRIVE) {
      log(`Panier Drive (${t['Statut']}) de ${t['Envoyé par']} (${t['ID']})…`);
      try { log('  ✓', await processDrive(t, ctx)); }
      catch (e) {
        log('  ✗', e.message);
        await call('fail', { id: t['ID'], error: e.message.slice(0, 200) }).catch(() => {});
      }
      continue;
    }
    if (RECIPES_MODE) {
      log(`Idées de recettes pour ${t['Envoyé par']} (${t['ID']})…`);
      try { log('  ✓', await processIdeas(t, ctx)); }
      catch (e) {
        log('  ✗', e.message);
        await call('fail', { id: t['ID'], error: e.message.slice(0, 200) }).catch(() => {});
      }
      continue;
    }
    log(`${t['Type']} de ${t['Envoyé par']} (${t['ID']})…`);
    const dir = fs.mkdtempSync(path.join(TMP, t['ID'] + '-'));
    try {
      const img = await call('image', { id: t['ID'] });
      const file = 'photo.' + (img.mime.includes('png') ? 'png' : 'jpg');
      fs.writeFileSync(path.join(dir, file), Buffer.from(img.data, 'base64'));
      if (t['Type'] === PLANTE) {
        const result = cleanPlant(await runClaude(plantPrompt(file), dir));
        await call('applyPlant', { id: t['ID'], result });
        log('  ✓', `${result.commonName} (${result.scientificName}, certitude ${result.confidence})`);
        continue;
      }
      const result = await runClaude(prompt(t, ctx, file), dir);
      await call('apply', { id: t['ID'], result });
      log('  ✓', result.resume || 'traité');
    } catch (e) {
      log('  ✗', e.message);
      await call('fail', { id: t['ID'], error: e.message.slice(0, 200) }).catch(() => {});
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    if (await hasPending()) await processAll();
  } catch (e) {
    log('Erreur :', e.message);
  } finally {
    busy = false;
  }
}

// --once : un seul passage puis arrêt (lancé à heures fixes par le Planificateur de tâches Windows)
if (PLANTS_MODE && TRIAL) {
  // node worker/worker.js --plantes --essai chemin/photo.jpg : identifie une photo locale, sans rien envoyer au Sheets
  const src = process.argv[process.argv.indexOf('--essai') + 1];
  const dir = fs.mkdtempSync(path.join(TMP, 'essai-'));
  const file = 'photo' + path.extname(src || '.jpg');
  Promise.resolve()
    .then(() => fs.copyFileSync(src, path.join(dir, file)))
    .then(() => runClaude(plantPrompt(file), dir))
    .then((r) => log(JSON.stringify(cleanPlant(r), null, 2)), (e) => log('Erreur :', e.message))
    .finally(() => fs.rmSync(dir, { recursive: true, force: true }));
} else if (process.argv.includes('--prix')) {
  refreshPrices().then(() => log('Terminé.'), (e) => log('Erreur :', e.message));
} else if (TRIAL && !RECIPES_MODE) {
  call('pending')
    .then((ctx) => processDrive({ 'ID': 'essai', 'Statut': 'En attente', 'Fichier': JSON.stringify({ produits: ctx.courses.slice(0, 4).map((c) => c['Produit']) }) }, ctx))
    .then((m) => log(m), (e) => log('Erreur :', e.message));
} else if (TRIAL) {
  call('pending')
    .then((ctx) => processIdeas({ 'ID': 'essai', 'Envoyé par': 'Henda', 'Fichier': JSON.stringify(process.argv.includes('--menu') ? { nombre: 4, temps: 'normal', menu: true, pour: ['Henda', 'Gérémy'] } : { nombre: 2, temps: 'rapide', type: 'Plat', pour: ['Henda', 'Gérémy'] }) }, ctx))
    .then((m) => log(m), (e) => log('Erreur :', e.message));
} else if (process.argv.includes('--once')) {
  log('Passage unique.');
  // Passage photos (8 h, 11 h, 14 h, 17 h, 20 h) : tickets en attente, puis prix Drive de la liste de courses
  // Passage --plantes (toutes les 5 min) : seulement les photos de plantes, rien d'autre
  tick().then(() => (RECIPES_MODE || PLANTS_MODE ? null : refreshPrices().catch((e) => log('Prix Drive :', e.message)))).then(() => log('Terminé.'));
} else {
  log(`Surveillance des photos toutes les ${POLL_MS / 1000} s. Ctrl+C pour arrêter.`);
  tick();
  setInterval(tick, POLL_MS);
}
