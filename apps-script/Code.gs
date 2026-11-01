/**
 * Synchronisation des coches de la liste de courses (V2).
 * À coller dans Extensions > Apps Script du Google Sheets « Appli Courses – Base de données ».
 * Déployer en Application Web : exécuter en tant que « Moi », accès « Tout le monde ».
 */
const SHEET_COURSES = 'Courses';
const STATUTS = ['À acheter', 'Acheté'];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action !== 'setStatus') return json({ ok: false, error: 'action inconnue' });
    if (STATUTS.indexOf(body.statut) === -1) return json({ ok: false, error: 'statut invalide' });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_COURSES);
      const values = sheet.getDataRange().getValues();
      const head = values[0].map(String);
      const colProduit = head.indexOf('Produit');
      const colStatut = head.indexOf('Statut');
      const target = normalize(body.produit);
      for (let r = 1; r < values.length; r++) {
        if (normalize(values[r][colProduit]) === target) {
          sheet.getRange(r + 1, colStatut + 1).setValue(body.statut);
          return json({ ok: true });
        }
      }
      return json({ ok: false, error: 'produit introuvable' });
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

function normalize(s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
