// Analyse les photos envoyées depuis l'appli, sur le PC, avec Claude Code.
// Surveille l'onglet Tickets (lecture publique, gratuite) et ne lance Claude que quand une photo attend.
// Usage : node worker/worker.js        (config dans worker/config.json, voir config.example.json)

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

async function hasPending() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=Tickets&tq=${encodeURIComponent("select count(A) where G = 'En attente'")}&t=${Date.now()}`;
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
- Catégories : Produits laitiers, Fruits & légumes, Viande, Poisson, Frais, Surgelés, Épicerie, Boulangerie, Boissons, Hygiène, Entretien, Autre.
- Emplacements possibles : ${ctx.emplacements.join(', ')}.
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

async function processAll() {
  const ctx = await call('pending');
  for (const t of ctx.tickets) {
    log(`${t['Type']} de ${t['Envoyé par']} (${t['ID']})…`);
    const dir = fs.mkdtempSync(path.join(TMP, t['ID'] + '-'));
    try {
      const img = await call('image', { fichier: t['Fichier'] });
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

log(`Surveillance des photos toutes les ${POLL_MS / 1000} s. Ctrl+C pour arrêter.`);
tick();
setInterval(tick, POLL_MS);
