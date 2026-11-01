// Analyse les photos envoyées depuis l'appli, sur le PC, avec Claude Code.
// Surveille l'onglet Tickets (lecture publique, gratuite) et ne lance Claude que quand une photo attend.
// Usage : node worker/worker.js --once   un passage photos (tâche planifiée à 12 h et 20 h, voir install-taches.ps1)
//         node worker/worker.js --once --recipes   un passage idées de recettes (12 h 10 et 20 h 10)
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
const isMine = (t) => (t['Type'] === IDEAS) === RECIPES_MODE;
// --essai (avec --recipes) : génère 2 idées pour Henda et les affiche, sans rien enregistrer
const TRIAL = process.argv.includes('--essai');

async function hasPending() {
  const where = `G = 'En attente' and C ${RECIPES_MODE ? '=' : '<>'} '${IDEAS}'`;
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=Tickets&tq=${encodeURIComponent('select count(A) where ' + where)}&t=${Date.now()}`;
  const text = await (await fetch(url)).text();
  if (text.trimStart().startsWith('<')) return true; // Sheets non public : on demande directement à Apps Script
  const n = parseInt(text.split('\n')[1]?.replace(/"/g, ''), 10);
  return n > 0;
}

function prompt(t, ctx, file) {
  const stockLoc = ctx.stock.filter((s) => String(s['Emplacement']).toLowerCase() === String(t['Emplacement']).toLowerCase());
  const aAcheter = ctx.courses.filter((c) => c['Statut'] !== 'Acheté').map((c) => c['Produit']);
  const common = `Tu mets à jour l'appli de courses d'un foyer français de 3 adultes.
Lis l'image ${file} (outil Read), puis réponds UNIQUEMENT avec un objet JSON, sans texte autour, sans bloc de code.

Règles :
- Noms de produits simples et lisibles en français (« Lait demi-écrémé », pas « LT 1/2 ECR UHT »). Réutilise exactement le nom d'un produit existant quand c'est le même.
- Catégories : Produits laitiers, Fruits & légumes, Viande, Poisson, Frais, Surgelés, Épicerie, Boulangerie, Boissons, Hygiène (papier toilette, savon…), Entretien (lessive, éponges…), Autre.
- Emplacements possibles : ${ctx.emplacements.join(', ')}.
- Produits déjà en stock (nom | emplacement) : ${ctx.stock.map((s) => `${s['Produit']} | ${s['Emplacement']}`).join(' ; ')}.
  Si un article correspond à l'un d'eux (même au singulier/pluriel ou avec une variante de marque), réutilise ce nom ET cet emplacement pour que les quantités s'additionnent.
- Quantité numérique quand c'est possible, unité courte (L, kg, g, pièces, paquet, pot, boîte…).
- DLC au format AAAA-MM-JJ seulement si elle est lisible, sinon "".
- Ne range pas dans le stock ce qui n'est pas de la nourriture ou un produit ménager (sacs, consigne, remises).
`;
  if (t['Type'] === 'Ticket de caisse') {
    return common + `
C'est un TICKET DE CAISSE. Ajoute chaque article acheté au stock dans l'emplacement le plus logique.
Produits de la liste de courses encore à acheter : ${JSON.stringify(aAcheter)}. Mets dans "achetes" ceux qui figurent sur le ticket (nom exact de la liste).

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

function ideasPrompt(t, ctx) {
  const req = JSON.parse(t['Fichier'] || '{}');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = (s) => (s['DLC'] ? (new Date(s['DLC']) - today) / 86400000 : Infinity);
  const urgent = ctx.stock.filter((s) => days(s) >= 0 && days(s) < 3).map((s) => s['Produit']);
  const expired = ctx.stock.filter((s) => days(s) < 0).map((s) => s['Produit']);
  const henda = String(t['Envoyé par']).toLowerCase() === 'henda';
  return `Tu proposes des recettes pour un foyer français de 3 adultes.
Propose ${req.nombre || 3} recette(s) différente(s), réalistes et familiales, pour 3 personnes.
${req.envie ? `Envie exprimée : « ${req.envie} ».` : ''}

Règles :
- SANS PORC, sans exception (ni jambon, lardons, chorizo, saucisson, gélatine de porc…)${henda ? '' : ', sauf si l\'envie ci-dessus le demande explicitement'}.
- Utilise surtout ce qui est en stock. Priorité absolue aux produits à finir vite : ${urgent.length ? urgent.join(', ') : 'aucun'}.
- N'utilise jamais ces produits périmés : ${expired.length ? expired.join(', ') : 'aucun'}.
- Stock actuel (produit | quantité | emplacement) : ${ctx.stock.filter((s) => days(s) >= 0).map((s) => `${s['Produit']} | ${s['Quantité']} ${s['Unité']} | ${s['Emplacement']}`).join(' ; ')}.
- Évite ces recettes déjà enregistrées : ${(ctx.recettes || []).join(', ') || 'aucune'}.
- Ingrédients au format « Nom quantité unité » (ex. « Blancs de poulet 500 g », « Oignon 1 », « Crème fraîche 20 cl »), en reprenant le nom du produit en stock quand c'est lui.
- Étapes courtes et claires, une action par étape.

Réponds UNIQUEMENT avec un objet JSON, sans texte autour, sans bloc de code :
{"recettes":[{"nom":"…","type":"Plat","difficulte":"Facile|Moyen|Difficile","cout":"Bon marché|Moyen|Cher","preparation":15,"cuisson":20,"ingredients":["…"],"etapes":["…"],"sans_porc":true}],"resume":"3 recettes ajoutées"}`;
}

async function processIdeas(t, ctx) {
  const dir = fs.mkdtempSync(path.join(TMP, t['ID'] + '-'));
  try {
    const out = await runClaude(ideasPrompt(t, ctx), dir);
    const henda = String(t['Envoyé par']).toLowerCase() === 'henda';
    const recettes = (out.recettes || [])
      .filter((r) => r.nom && !(henda && r.sans_porc === false))
      .map((r) => ({
        'Nom': r.nom, 'Portions': 3, 'Temps (min)': (+r.preparation || 0) + (+r.cuisson || 0) || '',
        'Ingrédients': (r.ingredients || []).map((x) => String(x).replace(/;/g, ',')).join('; '),
        'Étapes': (r.etapes || []).map((x) => String(x).replace(/;/g, ',')).join('; '),
        'Sans porc': r.sans_porc === false ? 'Non' : 'Oui', 'Profil': t['Envoyé par'], 'Partagée': 'Oui',
        'Type': r.type || 'Plat', 'Difficulté': r.difficulte || 'Facile', 'Coût': r.cout || 'Bon marché',
        'Préparation (min)': r.preparation || '', 'Cuisson (min)': r.cuisson || '', 'Image': '',
      }));
    if (!recettes.length) throw new Error('aucune recette proposée');
    if (TRIAL) { console.log(JSON.stringify(recettes, null, 2)); return 'essai : rien enregistré'; }
    const resume = recettes.length === 1 ? '1 recette ajoutée : ' + recettes[0]['Nom'] : `${recettes.length} recettes ajoutées`;
    await call('applyRecipes', { id: t['ID'], recettes, resume });
    return resume;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function processAll() {
  const ctx = await call('pending');
  for (const t of ctx.tickets.filter(isMine)) {
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
if (TRIAL) {
  call('pending')
    .then((ctx) => processIdeas({ 'ID': 'essai', 'Envoyé par': 'Henda', 'Fichier': '{"nombre":2}' }, ctx))
    .then((m) => log(m), (e) => log('Erreur :', e.message));
} else if (process.argv.includes('--once')) {
  log('Passage unique.');
  tick().then(() => log('Terminé.'));
} else {
  log(`Surveillance des photos toutes les ${POLL_MS / 1000} s. Ctrl+C pour arrêter.`);
  tick();
  setInterval(tick, POLL_MS);
}
