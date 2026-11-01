/**
 * Appli Courses : écritures dans le Google Sheets.
 * À coller dans Extensions > Apps Script du Google Sheets « Appli Courses – Base de données ».
 * Déployer en Application Web : exécuter en tant que « Moi », accès « Tout le monde ».
 *
 * Actions de l'appli : setStatus, addCourses, setEmplacements, upload.
 * Actions du PC (protégées par la clé WORKER_KEY des propriétés du script) : pending, image, apply, fail.
 */
const PHOTO_FOLDER = 'Appli Courses – Photos';
const HEADERS = {
  Stock: ['Produit', 'Catégorie', 'Quantité', 'Unité', 'Emplacement', "Date d'ajout", 'DLC', 'Dernière MAJ'],
  Courses: ['Produit', 'Quantité', 'Unité', 'Catégorie', 'Priorité', 'Ajouté par', 'Statut'],
  Historique: ['Date', 'Magasin', 'Produit', 'Quantité', 'Prix'],
  Tickets: ['ID', 'Date', 'Type', 'Emplacement', 'Envoyé par', 'Fichier', 'Statut', 'Résumé'],
  Emplacements: ['Nom'],
};
const DEFAULT_EMPLACEMENTS = ['Frigo', 'Congélateur', 'Placard'];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const handler = ACTIONS[body.action];
    if (!handler) return json({ ok: false, error: 'action inconnue' });
    if (handler.worker && body.key !== PropertiesService.getScriptProperties().getProperty('WORKER_KEY')) {
      return json({ ok: false, error: 'clé invalide' });
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      return json(Object.assign({ ok: true }, handler.run(body)));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, service: 'appli-courses' });
}

const ACTIONS = {
  setStatus: {
    run(b) {
      if (['À acheter', 'Acheté'].indexOf(b.statut) === -1) throw new Error('statut invalide');
      const t = table('Courses');
      const r = t.find('Produit', b.produit);
      if (r < 0) throw new Error('produit introuvable');
      t.set(r, 'Statut', b.statut);
      return {};
    },
  },

  addCourses: {
    run(b) {
      const t = table('Courses');
      let added = 0;
      (b.items || []).forEach((it) => {
        if (!it.produit) return;
        const r = t.find('Produit', it.produit);
        if (r >= 0) {
          t.set(r, 'Statut', 'À acheter');
        } else {
          t.append({
            'Produit': it.produit, 'Quantité': it.quantite || '', 'Unité': it.unite || '',
            'Catégorie': it.categorie || 'Autre', 'Priorité': it.priorite || 'Moyenne',
            'Ajouté par': b.par || '', 'Statut': 'À acheter',
          });
          added++;
        }
      });
      return { added };
    },
  },

  setEmplacements: {
    run(b) {
      const noms = (b.noms || []).map((n) => String(n).trim()).filter(Boolean);
      if (!noms.length) throw new Error('liste vide');
      const sh = sheet('Emplacements');
      sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).clearContent();
      sh.getRange(2, 1, noms.length, 1).setValues(noms.map((n) => [n]));
      return {};
    },
  },

  upload: {
    run(b) {
      if (['ticket', 'stock'].indexOf(b.type) === -1) throw new Error('type invalide');
      const id = Utilities.getUuid().slice(0, 8);
      const now = new Date();
      const name = Utilities.formatDate(now, 'Europe/Paris', 'yyyy-MM-dd_HH-mm') + '_' + b.type + '_' + id + '.jpg';
      const blob = Utilities.newBlob(Utilities.base64Decode(b.image), b.mime || 'image/jpeg', name);
      const file = folder().createFile(blob);
      table('Tickets').append({
        'ID': id, 'Date': Utilities.formatDate(now, 'Europe/Paris', 'yyyy-MM-dd HH:mm'),
        'Type': b.type === 'ticket' ? 'Ticket de caisse' : 'Photo du stock',
        'Emplacement': b.emplacement || '', 'Envoyé par': b.par || '', 'Fichier': file.getId(),
        'Statut': 'En attente', 'Résumé': '',
      });
      return { id };
    },
  },

  // ---- PC ----
  pending: {
    worker: true,
    run() {
      const t = table('Tickets');
      return {
        tickets: t.rows().filter((r) => r['Statut'] === 'En attente'),
        stock: table('Stock').rows(),
        courses: table('Courses').rows(),
        emplacements: emplacements(),
      };
    },
  },

  image: {
    worker: true,
    run(b) {
      const blob = DriveApp.getFileById(b.fichier).getBlob();
      return { mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
    },
  },

  apply: {
    worker: true,
    run(b) {
      const res = b.result || {};
      const today = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
      const stock = table('Stock');
      (res.stock || []).forEach((it) => {
        if (!it.produit) return;
        const r = stock.findWhere((row) => same(row['Produit'], it.produit) && same(row['Emplacement'], it.emplacement));
        if (r >= 0) {
          const cur = parseFloat(String(stock.get(r, 'Quantité')).replace(',', '.'));
          const add = parseFloat(String(it.quantite).replace(',', '.'));
          const qty = res.mode === 'ajout' && !isNaN(cur) && !isNaN(add) ? cur + add : it.quantite;
          stock.set(r, 'Quantité', qty);
          if (it.unite) stock.set(r, 'Unité', it.unite);
          if (it.dlc) stock.set(r, 'DLC', it.dlc);
          stock.set(r, 'Dernière MAJ', today);
        } else {
          stock.append({
            'Produit': it.produit, 'Catégorie': it.categorie || '', 'Quantité': it.quantite || '',
            'Unité': it.unite || '', 'Emplacement': it.emplacement || '', "Date d'ajout": today,
            'DLC': it.dlc || '', 'Dernière MAJ': today,
          });
        }
      });
      (res.retirer || []).forEach((it) => {
        const r = stock.findWhere((row) => same(row['Produit'], it.produit) && same(row['Emplacement'], it.emplacement));
        if (r >= 0) stock.remove(r);
      });
      const hist = table('Historique');
      (res.historique || []).forEach((it) => {
        hist.append({ 'Date': res.date || today, 'Magasin': res.magasin || '', 'Produit': it.produit, 'Quantité': it.quantite || '', 'Prix': it.prix || '' });
      });
      const courses = table('Courses');
      (res.achetes || []).forEach((p) => {
        const r = courses.find('Produit', p);
        if (r >= 0) courses.set(r, 'Statut', 'Acheté');
      });
      setTicket(b.id, 'Traité', res.resume || '');
      return {};
    },
  },

  fail: {
    worker: true,
    run(b) {
      setTicket(b.id, 'Erreur', b.error || '');
      return {};
    },
  },
};

// ---- Outils ----
function setTicket(id, statut, resume) {
  const t = table('Tickets');
  const r = t.find('ID', id);
  if (r < 0) return;
  t.set(r, 'Statut', statut);
  t.set(r, 'Résumé', resume);
}

function emplacements() {
  const list = table('Emplacements').rows().map((r) => r['Nom']).filter(Boolean);
  return list.length ? list : DEFAULT_EMPLACEMENTS;
}

function sheet(name) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
    if (name === 'Emplacements') sh.getRange(2, 1, DEFAULT_EMPLACEMENTS.length, 1).setValues(DEFAULT_EMPLACEMENTS.map((n) => [n]));
  }
  return sh;
}

// Accès par nom de colonne. Les numéros de ligne renvoyés sont ceux de la feuille (2 = première donnée).
function table(name) {
  const sh = sheet(name);
  const values = sh.getDataRange().getValues();
  const head = values[0].map(String);
  const col = (k) => {
    const i = head.indexOf(k);
    if (i < 0) throw new Error('colonne « ' + k + ' » absente de ' + name);
    return i;
  };
  const toObj = (row) => Object.fromEntries(head.map((h, i) => [h, row[i] instanceof Date ? Utilities.formatDate(row[i], 'Europe/Paris', 'yyyy-MM-dd') : row[i]]));
  return {
    rows: () => values.slice(1).filter((r) => r.some((v) => v !== '')).map(toObj),
    find: (k, v) => {
      const i = col(k);
      for (let r = 1; r < values.length; r++) if (same(values[r][i], v)) return r + 1;
      return -1;
    },
    findWhere: (fn) => {
      for (let r = 1; r < values.length; r++) if (fn(toObj(values[r]))) return r + 1;
      return -1;
    },
    get: (r, k) => values[r - 1][col(k)],
    set: (r, k, v) => {
      sh.getRange(r, col(k) + 1).setValue(v);
      values[r - 1][col(k)] = v;
    },
    append: (obj) => {
      const row = head.map((h) => (obj[h] === undefined ? '' : obj[h]));
      sh.appendRow(row);
      values.push(row);
    },
    remove: (r) => {
      sh.deleteRow(r);
      values.splice(r - 1, 1);
    },
  };
}

function folder() {
  const it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
}

function same(a, b) {
  return normalize(a) === normalize(b);
}

function normalize(s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** À lancer une fois depuis l'éditeur (bouton ▶ Exécuter) : crée les onglets manquants, le dossier photos et la clé du PC. */
function installer() {
  Object.keys(HEADERS).forEach(sheet);
  folder();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('WORKER_KEY')) props.setProperty('WORKER_KEY', Utilities.getUuid());
  Logger.log('Clé du PC (WORKER_KEY) : ' + props.getProperty('WORKER_KEY'));
}
