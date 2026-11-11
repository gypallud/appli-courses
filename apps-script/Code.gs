/**
 * Appli Courses : écritures dans le Google Sheets.
 * À coller dans Extensions > Apps Script du Google Sheets « Appli Courses – Base de données ».
 * Déployer en Application Web : exécuter en tant que « Moi », accès « Tout le monde ».
 *
 * Actions de l'appli : setStatus, addCourses, updateCourse, removeCourses, addStock, updateStock, removeStock, setEmplacements, setListe, upload,
 *   saveRecipe, setFavorite, deleteRecipe, keepRecipe, refuseRecipe, cookRecipe, clearMenu, setProfil, setHabituel, setDriveChoice, requestIdeas, requestDrive, driveSelect, driveCancel.
 * Action de l'appli Ménage & Maison (dossier maison/) : menageSync.
 * Actions du PC (protégées par la clé WORKER_KEY des propriétés du script) : pending, image, apply, applyRecipes,
 *   driveProposals, drivePrices, driveDone, fail.
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
  Recettes: ['Nom', 'Portions', 'Temps (min)', 'Ingrédients', 'Étapes', 'Sans porc', 'Date', 'Profil', 'Partagée', 'Type', 'Difficulté', 'Coût',
    'Préparation (min)', 'Cuisson (min)', 'Image', 'Catégorie', 'Favoris', 'Statut', 'Astuce',
    // Menu : « 1|Lundi » (ordre|jour) pour le menu de la semaine ; Avis : « Henda:+, Gérémy:- » après l'avoir cuisinée
    'Menu', 'Cuisinée', 'Fois', 'Avis'],
  // Goûts de chaque profil, utilisés pour les idées de recettes. Refusées : recettes proposées puis rejetées (à ne plus proposer)
  // Articles Leclerc trouvés pour chaque produit de la liste de courses, mis à jour à chaque passage du PC
  'Prix Drive': ['Produit', 'Quantité', 'Candidats', 'Date'],
  // Produits habituels : remis dans la liste de courses quand il n'y en a plus en stock
  Habituels: ['Produit', 'Catégorie', 'Unité', 'Depuis'],
  Profils: ['Profil', 'Cuisines', 'Aime', "N'aime pas", 'Allergies', 'Niveau', 'Épicé', 'Équipement', 'Refusées'],
  // Appli « Ménage & Maison » : une ligne par élément (tâche, entrée du journal, garantie, référence, profil).
  // Données = l'élément en JSON ; Modifié = horodatage (ms) de la dernière modification ; Supprimé = « oui » (gardé pour prévenir les autres téléphones)
  'Ménage': ['Type', 'ID', 'Nom', 'Données', 'Modifié', 'Supprimé'],
};
const MENAGE_TYPES = ['tasks', 'history', 'warranties', 'materials', 'profiles'];
const PROFIL_FIELDS = ['Cuisines', 'Aime', "N'aime pas", 'Allergies', 'Niveau', 'Épicé', 'Équipement'];
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
      // Sélectionné = coché dans l'appli, à prendre aux prochaines courses (Acheté : ancien nom)
      if (['À acheter', 'Sélectionné', 'Acheté'].indexOf(b.statut) === -1) throw new Error('statut invalide');
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
      return { restock: restock([b.produit, it.produit]) };
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
      return { removed, restock: restock((b.items || []).map((it) => it.produit)) };
    },
  },

  updateCourse: {
    run(b) {
      const t = table('Courses');
      const r = t.find('Produit', b.produit);
      if (r < 0) throw new Error('produit introuvable');
      if (b.quantite !== undefined) t.set(r, 'Quantité', b.quantite);
      if (b.unite !== undefined) t.set(r, 'Unité', b.unite);
      if (b.categorie) t.set(r, 'Catégorie', b.categorie);
      if (b.priorite) t.set(r, 'Priorité', b.priorite);
      // Nouveau nom : l'article Leclerc choisi et ses prix suivent le produit
      if (b.nouveau && !same(b.nouveau, b.produit)) {
        if (t.find('Produit', b.nouveau) >= 0) throw new Error('« ' + b.nouveau + ' » est déjà dans la liste');
        t.set(r, 'Produit', b.nouveau);
        ['Choix Drive', 'Prix Drive'].forEach((name) => {
          const o = table(name), k = o.find('Produit', b.produit);
          if (k >= 0 && o.find('Produit', b.nouveau) < 0) o.set(k, 'Produit', b.nouveau);
        });
      }
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

  // Recette proposée par le PC : « Garder » la range avec les autres, « Pas pour moi » la supprime et l'écarte des prochaines idées
  keepRecipe: {
    run(b) {
      const t = table('Recettes');
      const r = t.find('Nom', b.nom);
      if (r >= 0) t.set(r, 'Statut', '');
      return {};
    },
  },

  refuseRecipe: {
    run(b) {
      const t = table('Recettes');
      const r = t.find('Nom', b.nom);
      if (r >= 0) t.remove(r);
      const p = profilRow(b.profil);
      const list = String(p.t.get(p.r, 'Refusées') || '').split(';').map((s) => s.trim()).filter(Boolean)
        .filter((n) => !same(n, b.nom));
      list.push(String(b.nom));
      p.t.set(p.r, 'Refusées', list.slice(-40).join('; '));
      return {};
    },
  },

  // « J'ai cuisiné » : met à jour le stock (quantité restante, 0 = plus rien) et note la recette
  cookRecipe: {
    run(b) {
      const now = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
      const s = table('Stock');
      let changed = 0;
      (b.stock || []).forEach((it) => {
        const r = s.findWhere((row) => same(row['Produit'], it.produit) && same(row['Emplacement'], it.emplacement));
        if (r < 0) return;
        const q = parseFloat(String(it.quantite).replace(',', '.'));
        if (!(q > 0)) s.remove(r);
        else { s.set(r, 'Quantité', String(it.quantite).replace('.', ',')); s.set(r, 'Dernière MAJ', now); }
        changed++;
      });
      restock((b.stock || []).map((it) => it.produit));
      const t = table('Recettes');
      const r = t.find('Nom', b.nom);
      if (r >= 0) {
        t.set(r, 'Cuisinée', now);
        t.set(r, 'Fois', (+t.get(r, 'Fois') || 0) + 1);
        if (b.avis === '+' || b.avis === '-') {
          const list = String(t.get(r, 'Avis') || '').split(',').map((x) => x.trim()).filter(Boolean)
            .filter((x) => !same(x.split(':')[0], b.profil));
          list.push(b.profil + ':' + b.avis);
          t.set(r, 'Avis', list.join(', '));
        }
      }
      return { changed };
    },
  },

  clearMenu: {
    run() {
      const t = table('Recettes');
      t.rows().forEach((row, i) => { if (row['Menu']) t.set(t.find('Nom', row['Nom']), 'Menu', ''); });
      return {};
    },
  },

  setHabituel: {
    run(b) {
      const t = table('Habituels');
      const r = t.find('Produit', b.produit);
      if (!b.on) { if (r >= 0) t.remove(r); return {}; }
      if (r < 0) t.append({ 'Produit': b.produit, 'Catégorie': b.categorie || '', 'Unité': b.unite || '', 'Depuis': Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd') });
      return { restock: restock([b.produit]) };
    },
  },

  // Article Leclerc choisi pour un produit (id « - » = ne pas le prendre au Drive) : retenu pour les fois suivantes
  setDriveChoice: {
    run(b) {
      const memo = table('Choix Drive');
      const today = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
      const r = memo.find('Produit', b.produit);
      if (r >= 0) { memo.set(r, 'ID', String(b.id || '')); memo.set(r, 'Libellé', b.libelle || ''); memo.set(r, 'Date', today); }
      else memo.append({ 'Produit': b.produit, 'ID': String(b.id || ''), 'Libellé': b.libelle || '', 'Date': today });
      return {};
    },
  },

  setProfil: {
    run(b) {
      const p = profilRow(b.profil);
      PROFIL_FIELDS.forEach((k) => { if (b.prefs && b.prefs[k] !== undefined) p.t.set(p.r, k, String(b.prefs[k]).slice(0, 300)); });
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
        'Fichier': JSON.stringify({
          nombre: Math.max(1, Math.min(b.menu ? 7 : 5, +b.nombre || 3)), envie: String(b.envie || '').slice(0, 200), menu: !!b.menu,
          temps: ['ultra', 'rapide', 'normal', 'long'].indexOf(b.temps) >= 0 ? b.temps : 'normal',
          type: String(b.type || '').slice(0, 20), pour: (b.pour || []).map(String).slice(0, 5), stockSeul: !!b.stockSeul,
        }),
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
      if (b.items && b.items.length) {
        // Articles déjà choisis dans la liste de courses : le PC remplit le panier au prochain passage
        if (open) setTicket(open['ID'], 'Annulé', 'Remplacé par un nouveau panier');
        const id = Utilities.getUuid().slice(0, 8);
        const sh = sheet('Drive');
        if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
        const d = table('Drive');
        b.items.slice(0, 100).forEach((it) => d.append({
          'Ticket': id, 'Produit': it.produit, 'Quantité': Math.max(1, Math.min(20, Math.round(+it.quantite || 1))),
          'Candidats': JSON.stringify([{ id: String(it.id), l: it.libelle || '', p: +it.prix || 0 }]), 'Choix': String(it.id), 'Statut': 'Choisi',
        }));
        table('Tickets').append({
          'ID': id, 'Date': Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd HH:mm'),
          'Type': DRIVE, 'Emplacement': '', 'Envoyé par': b.par || '', 'Fichier': '', 'Statut': 'Validé', 'Résumé': 'Ajout au panier au prochain passage',
        });
        return { id };
      }
      if (open) return { id: open['ID'] };
      const id = Utilities.getUuid().slice(0, 8);
      table('Tickets').append({
        'ID': id, 'Date': Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd HH:mm'),
        'Type': DRIVE, 'Emplacement': '', 'Envoyé par': b.par || '',
        'Fichier': JSON.stringify({ produits: (b.produits || []).map(String).slice(0, 100) }), 'Statut': 'En attente', 'Résumé': '',
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
        favoris: table('Recettes').rows().filter((r) => r['Favoris']).map((r) => ({ nom: r['Nom'], par: r['Favoris'] })),
        avis: table('Recettes').rows().filter((r) => r['Avis']).map((r) => ({ nom: r['Nom'], avis: r['Avis'] })),
        profils: table('Profils').rows(),
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
      // Un nouveau menu remplace le précédent
      if (b.menu) t.rows().forEach((row) => { if (row['Menu']) t.set(t.find('Nom', row['Nom']), 'Menu', ''); });
      (b.recettes || []).forEach((rec) => {
        if (!rec['Nom']) return;
        const old = t.find('Nom', rec['Nom']);
        if (old >= 0) { if (rec['Menu']) t.set(old, 'Menu', rec['Menu']); return; }
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

  // Prix Drive des produits de la liste de courses, remplacés à chaque passage
  drivePrices: {
    worker: true,
    run(b) {
      const sh = sheet('Prix Drive');
      if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
      const now = Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd HH:mm');
      const rows = (b.items || []).map((it) => [it.produit, it.quantite || 1, JSON.stringify(it.candidats || []), now]);
      if (rows.length) sh.getRange(2, 1, rows.length, 4).setValues(rows);
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
      restock((res.retirer || []).concat(res.stock || []).map((it) => it.produit));
      const hist = table('Historique');
      (res.historique || []).forEach((it) => {
        hist.append({ 'Date': res.date || today, 'Magasin': res.magasin || '', 'Produit': it.produit, 'Quantité': it.quantite || '', 'Prix': it.prix || '' });
      });
      // Produits du ticket : achetés, ils quittent la liste de courses
      const courses = table('Courses');
      (res.achetes || []).forEach((p) => {
        const r = courses.find('Produit', p);
        if (r >= 0) courses.remove(r);
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

  // Ménage & Maison : enregistre les modifications du téléphone puis renvoie toutes les données.
  // changes = [{ type, id, data (null = supprimé), at }]. Pour un même élément, la modification la plus récente gagne.
  // Lecture et écriture de l'onglet en un seul bloc : un premier envoi peut compter des centaines de lignes.
  menageSync: {
    run(b) {
      const sh = sheet('Ménage');
      const values = sh.getDataRange().getValues();
      const head = values[0].map(String);
      const c = (k) => head.indexOf(k);
      const iType = c('Type'), iId = c('ID'), iNom = c('Nom'), iData = c('Données'), iMod = c('Modifié'), iDel = c('Supprimé');
      const index = {};
      for (let r = 1; r < values.length; r++) index[values[r][iType] + ':' + values[r][iId]] = r;

      let changed = false;
      (b.changes || []).forEach((ch) => {
        if (MENAGE_TYPES.indexOf(ch.type) < 0 || !ch.id) return;
        const key = ch.type + ':' + ch.id;
        const at = Number(ch.at) || 0;
        let r = index[key];
        if (r !== undefined && Number(values[r][iMod]) > at) return; // une version plus récente est déjà enregistrée
        if (r === undefined) {
          r = values.length;
          values.push(head.map(() => ''));
          index[key] = r;
        }
        const row = values[r];
        row[iType] = ch.type;
        row[iId] = String(ch.id);
        if (ch.data) {
          // Nom lisible dans le tableur ; l'apostrophe empêche Sheets de lire « =… » comme une formule
          const nom = String(ch.data.name || ch.data.taskName || '').slice(0, 100);
          row[iNom] = /^[=+\-@]/.test(nom) ? "'" + nom : nom;
          row[iData] = JSON.stringify(ch.data);
          row[iDel] = '';
        } else {
          row[iData] = '';
          row[iDel] = 'oui';
        }
        row[iMod] = at;
        changed = true;
      });
      if (changed) sh.getRange(1, 1, values.length, head.length).setValues(values);

      const items = [];
      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        if (row[iDel] === 'oui' || !row[iData]) continue;
        try {
          items.push({ type: String(row[iType]), id: String(row[iId]), at: Number(row[iMod]) || 0, data: JSON.parse(row[iData]) });
        } catch (err) { /* cellule modifiée à la main et illisible : ignorée */ }
      }
      return { items };
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

// Produits habituels qui ne sont plus en stock (ni ligne, ni quantité > 0) : remis dans la liste de courses, non cochés
function restock(names) {
  const want = (names || []).filter(Boolean);
  if (!want.length) return 0;
  const hab = table('Habituels').rows();
  if (!hab.length) return 0;
  const stock = table('Stock').rows(), courses = table('Courses');
  const inStock = (p) => stock.some((s) => same(s['Produit'], p) && !(parseFloat(String(s['Quantité']).replace(',', '.')) <= 0));
  let added = 0;
  hab.filter((h) => want.some((n) => same(n, h['Produit']))).forEach((h) => {
    if (inStock(h['Produit']) || courses.find('Produit', h['Produit']) >= 0) return;
    courses.append({ 'Produit': h['Produit'], 'Quantité': '', 'Unité': '', 'Catégorie': h['Catégorie'] || 'Autre', 'Priorité': 'Moyenne', 'Ajouté par': 'Habituel', 'Statut': 'À acheter' });
    added++;
  });
  return added;
}

function profilRow(name) {
  if (!name) throw new Error('profil manquant');
  const t = table('Profils');
  let r = t.find('Profil', name);
  if (r < 0) { t.append({ 'Profil': name }); r = t.find('Profil', name); }
  return { t, r };
}

function listValues(name) {
  const list = table(name).rows().map((r) => r['Nom']).filter(Boolean);
  return list.length ? list : DEFAULT_LISTS[name];
}

const checked = {};
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
  } else if (HEADERS[name] && !checked[name]) {
    // Onglet créé par une version précédente : ajoute les colonnes apparues depuis
    checked[name] = true;
    const head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
    const missing = HEADERS[name].filter((h) => head.indexOf(h) < 0);
    if (missing.length) sh.getRange(1, head.filter(Boolean).length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
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
