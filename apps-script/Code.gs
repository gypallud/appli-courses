/**
 * Appli Courses : écritures dans le Google Sheets.
 * À coller dans Extensions > Apps Script du Google Sheets « Appli Courses – Base de données ».
 * Déployer en Application Web : exécuter en tant que « Moi », accès « Tout le monde ».
 *
 * Actions de l'appli : setStatus, addCourses, updateCourse, removeCourses, addStock, updateStock, removeStock, setEmplacements, setListe, upload,
 *   saveRecipe, setFavorite, deleteRecipe, requestIdeas, requestDrive, driveSelect, driveCancel.
 * Actions du PC (protégées par la clé WORKER_KEY des propriétés du script) : pending, image, apply, applyRecipes,
 *   driveProposals, driveDone, fail.
 */
// Les photos attendent dans l'onglet caché « Photos » (découpées en morceaux de 45 000 caractères, limite d'une cellule),
// puis sont effacées une fois traitées. Pas de Google Drive : Google bloque l'accès Drive pour un script non vérifié.
const PHOTO_CHUNK = 45000;
const HEADERS = {
  Stock: ['Produit', 'Catégorie', 'Quantité', 'Unité', 'Emplacement', "Date d'ajout", 'DLC', 'Dernière MAJ'],
  Courses: ['Produit', 'Quantité', 'Unité', 'Catégorie', 'Priorité', 'Ajouté par', 'Statut'],
  Historique: ['Date', 'Magasin', 'Produit', 'Quantité', 'Prix'],
  Tickets: ['ID', 'Date', 'Type', 'Emplacement', 'Envoyé par', 'Fichier', 'Statut', 'Résumé'],
  Emplacements: ['Nom'],
  'Catégories': ['Nom'],
  'Unités': ['Nom'],
  Photos: ['ID', 'Type MIME', 'Données'],
  // Panier Drive en cours : une ligne par produit de la liste, Candidats = articles Leclerc proposés (JSON)
  Drive: ['Ticket', 'Produit', 'Quantité', 'Candidats', 'Choix', 'Statut'],
  // Article Leclerc choisi pour chaque produit : proposé d'office la fois suivante
  'Choix Drive': ['Produit', 'ID', 'Libellé', 'Date'],
};
const DRIVE = 'Panier Drive';
const DRIVE_OPEN = ['En attente', 'À choisir', 'Validé'];
// Listes réglables dans l'appli (Réglages), avec leurs valeurs de départ
const DEFAULT_LISTS = {
  Emplacements: ['Frigo', 'Congélateur', 'Placard'],
  'Catégories': ['Produits laitiers', 'Fruits & légumes', 'Viande', 'Poisson', 'Frais', 'Surgelés', 'Épicerie', 'Boulangerie', 'Boissons', 'Hygiène', 'Entretien', 'Autre'],
  'Unités': ['pièces', 'g', 'kg', 'ml', 'cl', 'L', 'paquet', 'pot', 'boîte', 'bouteille', 'sachet', 'tranches'],
};

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

  addStock: {
    run(b) {
      const t = table('Stock');
      const today = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
      (b.items || []).forEach((it) => {
        if (!it.produit) return;
        const r = t.findWhere((row) => same(row['Produit'], it.produit) && same(row['Emplacement'], it.emplacement));
        if (r >= 0) {
          // Même produit au même endroit : on additionne les quantités
          const cur = parseFloat(String(t.get(r, 'Quantité')).replace(',', '.'));
          const add = parseFloat(String(it.quantite).replace(',', '.'));
          t.set(r, 'Quantité', !isNaN(cur) && !isNaN(add) ? cur + add : it.quantite);
          if (it.unite) t.set(r, 'Unité', it.unite);
          if (it.dlc) t.set(r, 'DLC', it.dlc);
          t.set(r, 'Dernière MAJ', today);
        } else {
          t.append({
            'Produit': it.produit, 'Catégorie': it.categorie || 'Autre', 'Quantité': it.quantite || '',
            'Unité': it.unite || '', 'Emplacement': it.emplacement || '', "Date d'ajout": today,
            'DLC': it.dlc || '', 'Dernière MAJ': today,
          });
        }
      });
      return {};
    },
  },

  updateStock: {
    run(b) {
      const t = table('Stock');
      const r = t.findWhere((row) => same(row['Produit'], b.produit) && same(row['Emplacement'], b.emplacement));
      if (r < 0) throw new Error('produit introuvable');
      const it = b.item || {};
      const cols = { produit: 'Produit', quantite: 'Quantité', unite: 'Unité', emplacement: 'Emplacement', categorie: 'Catégorie', dlc: 'DLC' };
      Object.keys(cols).forEach((k) => { if (it[k] !== undefined) t.set(r, cols[k], it[k]); });
      t.set(r, 'Dernière MAJ', Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd'));
      return {};
    },
  },

  removeStock: {
    run(b) {
      const t = table('Stock');
      let removed = 0;
      (b.items || []).forEach((it) => {
        const r = t.findWhere((row) => same(row['Produit'], it.produit) && same(row['Emplacement'], it.emplacement));
        if (r >= 0) {
          t.remove(r);
          removed++;
        }
      });
      return { removed };
    },
  },

  updateCourse: {
    run(b) {
      const t = table('Courses');
      const r = t.find('Produit', b.produit);
      if (r < 0) throw new Error('produit introuvable');
      t.set(r, 'Quantité', b.quantite);
      t.set(r, 'Unité', b.unite);
      return {};
    },
  },

  removeCourses: {
    run(b) {
      const t = table('Courses');
      let removed = 0;
      (b.produits || []).forEach((p) => {
        const r = t.find('Produit', p);
        if (r >= 0) {
          t.remove(r);
          removed++;
        }
      });
      return { removed };
    },
  },

  setEmplacements: {
    run(b) {
      return ACTIONS.setListe.run({ onglet: 'Emplacements', noms: b.noms });
    },
  },

  // Remplace une liste réglable : Emplacements, Catégories ou Unités
  setListe: {
    run(b) {
      if (!DEFAULT_LISTS[b.onglet]) throw new Error('liste inconnue');
      const noms = (b.noms || []).map((n) => String(n).trim()).filter(Boolean);
      if (!noms.length) throw new Error('liste vide');
      const sh = sheet(b.onglet);
      sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).clearContent();
      sh.getRange(2, 1, noms.length, 1).setValues(noms.map((n) => [n]));
      return {};
    },
  },

  upload: {
    run(b) {
      if (['ticket', 'stock'].indexOf(b.type) === -1) throw new Error('type invalide');
      if (!b.image || b.image.length > 40 * PHOTO_CHUNK) throw new Error('photo absente ou trop lourde');
      const id = Utilities.getUuid().slice(0, 8);
      const now = new Date();
      const chunks = [];
      for (let i = 0; i < b.image.length; i += PHOTO_CHUNK) chunks.push(b.image.slice(i, i + PHOTO_CHUNK));
      sheet('Photos').appendRow([id, b.mime || 'image/jpeg'].concat(chunks));
      table('Tickets').append({
        'ID': id, 'Date': Utilities.formatDate(now, 'Europe/Paris', 'yyyy-MM-dd HH:mm'),
        'Type': b.type === 'ticket' ? 'Ticket de caisse' : 'Photo du stock',
        'Emplacement': b.emplacement || '', 'Envoyé par': b.par || '', 'Fichier': chunks.length + ' morceaux',
        'Statut': 'En attente', 'Résumé': '',
      });
      return { id };
    },
  },

  saveRecipe: {
    run(b) {
      const rec = b.recette || {};
      if (!rec['Nom']) throw new Error('nom manquant');
      const t = table('Recettes');
      const r = t.find('Nom', b.original || rec['Nom']);
      if (r >= 0) {
        Object.keys(rec).forEach((k) => {
          try { t.set(r, k, rec[k]); } catch (e) { /* colonne absente du tableur */ }
        });
      } else {
        rec['Date'] = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
        t.append(rec);
      }
      return {};
    },
  },

  // Colonne Favoris : liste des profils qui ont mis la recette en favori (« Henda, Gérémy »)
  setFavorite: {
    run(b) {
      const t = table('Recettes');
      const r = t.find('Nom', b.nom);
      if (r < 0) throw new Error('recette introuvable');
      const list = String(t.get(r, 'Favoris') || '').split(',').map((s) => s.trim()).filter(Boolean)
        .filter((p) => !same(p, b.profil));
      if (b.on) list.push(b.profil);
      t.set(r, 'Favoris', list.join(', '));
      return {};
    },
  },

  deleteRecipe: {
    run(b) {
      const t = table('Recettes');
      const r = t.find('Nom', b.nom);
      if (r >= 0) t.remove(r);
      return {};
    },
  },

  // Demande d'idées de recettes : traitée par le PC (colonne Fichier = paramètres de la demande)
  requestIdeas: {
    run(b) {
      const id = Utilities.getUuid().slice(0, 8);
      table('Tickets').append({
        'ID': id, 'Date': Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd HH:mm'),
        'Type': 'Idées recettes', 'Emplacement': '', 'Envoyé par': b.par || '',
        'Fichier': JSON.stringify({ nombre: Math.max(1, Math.min(5, +b.nombre || 3)), envie: String(b.envie || '').slice(0, 200) }),
        'Statut': 'En attente', 'Résumé': '',
      });
      return { id };
    },
  },

  // Panier Drive : le PC cherche les articles au prochain passage, on choisit dans l'appli, le PC remplit le panier.
  // La commande (créneau, paiement) se termine toujours à la main sur Leclerc Drive.
  requestDrive: {
    run(b) {
      const open = table('Tickets').rows().find((r) => r['Type'] === DRIVE && DRIVE_OPEN.indexOf(r['Statut']) >= 0);
      if (open) return { id: open['ID'] };
      const id = Utilities.getUuid().slice(0, 8);
      table('Tickets').append({
        'ID': id, 'Date': Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd HH:mm'),
        'Type': DRIVE, 'Emplacement': '', 'Envoyé par': b.par || '', 'Fichier': '', 'Statut': 'En attente', 'Résumé': '',
      });
      return { id };
    },
  },

  driveSelect: {
    run(b) {
      const t = table('Drive');
      (b.choix || []).forEach((c) => {
        const r = t.findWhere((row) => String(row['Ticket']) === String(b.id) && same(row['Produit'], c.produit));
        if (r < 0) return;
        t.set(r, 'Choix', c.id || '');
        t.set(r, 'Quantité', c.id ? Math.max(1, Math.min(20, Math.round(+c.quantite || 1))) : '');
        t.set(r, 'Statut', c.id ? 'Choisi' : 'Ignoré');
      });
      setTicket(b.id, 'Validé', 'Ajout au panier au prochain passage');
      return {};
    },
  },

  driveCancel: {
    run(b) {
      setTicket(b.id, 'Annulé', '');
      return {};
    },
  },

  // ---- PC ----
  pending: {
    worker: true,
    run() {
      const t = table('Tickets');
      return {
        tickets: t.rows().filter((r) => r['Statut'] === 'En attente' || (r['Type'] === DRIVE && r['Statut'] === 'Validé')),
        drive: table('Drive').rows(),
        choixDrive: table('Choix Drive').rows(),
        historique: table('Historique').rows(),
        stock: table('Stock').rows(),
        courses: table('Courses').rows(),
        recettes: table('Recettes').rows().map((r) => r['Nom']),
        emplacements: listValues('Emplacements'),
        categories: listValues('Catégories'),
        unites: listValues('Unités'),
      };
    },
  },

  applyRecipes: {
    worker: true,
    run(b) {
      const t = table('Recettes');
      const today = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
      (b.recettes || []).forEach((rec) => {
        if (!rec['Nom'] || t.find('Nom', rec['Nom']) >= 0) return;
        rec['Date'] = today;
        t.append(rec);
      });
      setTicket(b.id, 'Traité', b.resume || '');
      return {};
    },
  },

  // Remplace les propositions du panier précédent
  driveProposals: {
    worker: true,
    run(b) {
      const sh = sheet('Drive');
      if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
      const t = table('Drive');
      (b.items || []).forEach((it) => t.append({
        'Ticket': b.id, 'Produit': it.produit, 'Quantité': it.quantite || 1,
        'Candidats': JSON.stringify(it.candidats || []), 'Choix': it.choix || '', 'Statut': 'À choisir',
      }));
      setTicket(b.id, 'À choisir', b.resume || '');
      return {};
    },
  },

  driveDone: {
    worker: true,
    run(b) {
      const t = table('Drive');
      (b.lignes || []).forEach((l) => {
        const r = t.findWhere((row) => String(row['Ticket']) === String(b.id) && same(row['Produit'], l.produit));
        if (r >= 0) t.set(r, 'Statut', l.statut);
      });
      const memo = table('Choix Drive');
      const today = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
      (b.memo || []).forEach((m) => {
        const r = memo.find('Produit', m.produit);
        if (r >= 0) {
          memo.set(r, 'ID', m.id); memo.set(r, 'Libellé', m.libelle); memo.set(r, 'Date', today);
        } else {
          memo.append({ 'Produit': m.produit, 'ID': m.id, 'Libellé': m.libelle, 'Date': today });
        }
      });
      setTicket(b.id, 'Traité', b.resume || '');
      return {};
    },
  },

  image: {
    worker: true,
    run(b) {
      const sh = sheet('Photos');
      const values = sh.getDataRange().getValues();
      const row = values.find((r) => String(r[0]) === String(b.id));
      if (!row) throw new Error('photo introuvable');
      return { mime: row[1], data: row.slice(2).join('') };
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
  if (r >= 0) {
    t.set(r, 'Statut', statut);
    t.set(r, 'Résumé', resume);
  }
  const photos = table('Photos');
  const p = photos.find('ID', id);
  if (p >= 0) photos.remove(p);
}

function listValues(name) {
  const list = table(name).rows().map((r) => r['Nom']).filter(Boolean);
  return list.length ? list : DEFAULT_LISTS[name];
}

function sheet(name) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
    const def = DEFAULT_LISTS[name];
    if (def) sh.getRange(2, 1, def.length, 1).setValues(def.map((n) => [n]));
    if (name === 'Photos') sh.hideSheet();
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

function same(a, b) {
  return normalize(a) === normalize(b);
}

function normalize(s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** À lancer une fois depuis l'éditeur (bouton ▶ Exécuter) : crée les onglets manquants et la clé du PC. */
function installer() {
  Object.keys(HEADERS).forEach(sheet);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('WORKER_KEY')) props.setProperty('WORKER_KEY', Utilities.getUuid());
  Logger.log('Clé du PC (WORKER_KEY) : ' + props.getProperty('WORKER_KEY'));
}
