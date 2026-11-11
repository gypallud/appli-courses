'use strict';
// Test automatique (npm run selftest) : capture, annotations, OCR et vidéo, sans souris.
const fs = require('fs');
const path = require('path');

module.exports = function selftest(h) {
  const out = path.join(require('os').tmpdir(), 'captur-selftest');
  fs.mkdirSync(out, { recursive: true });
  const log = (...a) => console.log('[selftest]', ...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, ms = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(100); }
    throw new Error('délai dépassé');
  };
  const results = [];
  const check = (name, ok, extra = '') => { results.push({ name, ok }); log(ok ? 'OK ' : 'ÉCHEC', name, extra); };

  return (async () => {
    try {
      await sleep(1500);
      const before = new Set(fs.readdirSync(h.LIB));

      // 1. Capture d'une zone
      h.startCapture('image');
      const overlays = await waitFor(() => (h.state().ready ? h.state().overlays : null));
      check('écrans de sélection ouverts', overlays.length > 0, `(${overlays.length})`);
      const shotPng = await overlays[0].webContents.capturePage();
      fs.writeFileSync(path.join(out, '1-selection.png'), shotPng.toPNG());
      h.select({ displayId: overlays[0].displayId, x: 0.05, y: 0.05, w: 0.4, h: 0.45 });
      const newFile = await waitFor(() => fs.readdirSync(h.LIB).find((f) => !before.has(f) && f.endsWith('.png')));
      check('capture enregistrée', !!newFile, newFile);

      // 2. Éditeur : annotations
      const ed = h.editor().webContents;
      await waitFor(() => h.editor().isVisible());
      await sleep(1200);
      const r = await ed.executeJavaScript(`(async () => {
        const v = view();
        const add = (s) => { s.id = nextId++; shapes().push(s); commit(); };
        add({ type: 'arrow', color: '#ff3b30', width: 6, size: 28, x1: v.w*0.1, y1: v.h*0.8, x2: v.w*0.4, y2: v.h*0.5 });
        add({ type: 'rect', color: '#0a84ff', width: 5, size: 28, x1: v.w*0.5, y1: v.h*0.1, x2: v.w*0.9, y2: v.h*0.4 });
        add({ type: 'blur', color: '#000', width: 5, size: 28, x1: v.w*0.05, y1: v.h*0.05, x2: v.w*0.35, y2: v.h*0.25 });
        add({ type: 'highlight', color: '#ffcc00', width: 5, size: 28, x1: v.w*0.5, y1: v.h*0.6, x2: v.w*0.9, y2: v.h*0.7 });
        add({ type: 'callout', color: '#34c759', width: 5, size: 34, x1: v.w*0.45, y1: v.h*0.75, text: 'Bonjour Captur\\nTexte de test 2026' });
        add({ type: 'step', color: '#af52de', width: 5, size: 28, x1: v.w*0.2, y1: v.h*0.4, n: 1 });
        add({ type: 'step', color: '#af52de', width: 5, size: 28, x1: v.w*0.3, y1: v.h*0.4, n: 2 });
        add({ type: 'ellipse', color: '#ff9500', width: 4, size: 28, x1: v.w*0.6, y1: v.h*0.45, x2: v.w*0.8, y2: v.h*0.58 });
        add({ type: 'text', color: '#1c1c1e', width: 4, size: 40, x1: v.w*0.05, y1: v.h*0.55, text: 'Lecture OCR' });
        add({ type: 'pen', color: '#ff3b30', width: 4, size: 28, x1: 0, y1: 0, points: [[v.w*0.6,v.h*0.85],[v.w*0.65,v.h*0.9],[v.w*0.7,v.h*0.83],[v.w*0.75,v.h*0.92]] });
        const n = shapes().length;
        undo(); const afterUndo = shapes().length; redo();
        return { n, afterUndo, after: shapes().length, w: v.w, h: v.h };
      })()`);
      check('annotations dessinées', r.n === 10, JSON.stringify(r));
      check('annuler / rétablir', r.afterUndo === 9 && r.after === 10);
      await sleep(900);
      const edShot = await h.editor().webContents.capturePage();
      fs.writeFileSync(path.join(out, '2-editeur.png'), edShot.toPNG());
      const metaOk = fs.existsSync(path.join(h.LIB, '.captur', newFile + '.json'));
      check('annotations sauvegardées', metaOk);

      // 3. Copie et OCR
      const copied = await ed.executeJavaScript('copyImage().then(() => true)');
      check('copie dans le presse-papier', copied && await require('electron').clipboard.has('image/png'));
      const ocr = await ed.executeJavaScript(`api.ocr(flatten(2).toDataURL('image/png')).then(t => t, e => 'ERREUR ' + e.message)`);
      check('lecture du texte (OCR)', /Captur|Lecture/i.test(ocr), JSON.stringify(ocr.slice(0, 200)));

      // 4. Recadrage
      const crop = await ed.executeJavaScript(`(() => { const v = view(); doc.state.crop = { x: 10, y: 10, w: Math.round(v.w/2), h: Math.round(v.h/2) }; commit(); fit(); return view().w; })()`);
      check('recadrage', crop > 0);
      fs.writeFileSync(path.join(out, '3-recadre.png'), (await h.editor().webContents.capturePage()).toPNG());
      await ed.executeJavaScript('undo()');

      // 5. Loupe (bulle zoom)
      const mag = await ed.executeJavaScript(`(() => {
        const v = view();
        const s = { id: nextId++, type: 'magnify', color: '#0a84ff', width: 5, size: 28, zoom: 2.5, shape: 'circle',
          x1: v.w*0.27, y1: v.h*0.62, x2: v.w*0.27 + 70, y2: v.h*0.62 + 70 };
        placeBubble(s); shapes().push(s); commit();
        const g = magGeo(s);
        selectedId = s.id; setTool('select'); selectedId = s.id; updateUi(); render();
        return { bubbleW: Math.round(g.bub.w), hasOptions: !document.getElementById('toolOptions').hidden };
      })()`);
      check('loupe (bulle zoom)', mag.bubbleW === 175 && mag.hasOptions, JSON.stringify(mag));
      // Une loupe posée sur une zone floutée doit montrer le flou, pas l'original
      const leak = await ed.executeJavaScript(`(() => {
        const bl = shapes().find(s => s.type === 'blur'); const r = norm(bl);
        const probe = (src) => { const c = document.createElement('canvas'); c.width = Math.round(r.w); c.height = Math.round(r.h);
          c.getContext('2d').drawImage(src, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height); return c.toDataURL(); };
        return probe(blurredBase()) !== probe(base().src);
      })()`);
      check('la loupe ne dévoile pas les zones floutées', leak);
      await sleep(400);
      const exportPng = async (name) => {
        const url = await ed.executeJavaScript(`flatten().toDataURL('image/png')`);
        fs.writeFileSync(path.join(out, name), Buffer.from(url.split(',')[1], 'base64'));
      };
      await exportPng('5-loupe.png');

      // 6. Découper : une bande horizontale (zigzag) puis une verticale (droite)
      const cut = await ed.executeJavaScript(`(() => {
        const b0 = base();
        const arrowY = shapes().find(s => s.type === 'arrow').y1;
        style.cutEdge = 'zigzag'; applyCut({ dir: 'h', a: b0.h * 0.45, b: b0.h * 0.6 });
        const b1 = base();
        const arrowY2 = shapes().find(s => s.type === 'arrow').y1;
        style.cutEdge = 'straight'; applyCut({ dir: 'v', a: b1.w * 0.3, b: b1.w * 0.4 });
        const b2 = base();
        setTool('cut');
        return { h0: b0.h, h1: b1.h, w1: b1.w, w2: b2.w, arrowShift: Math.round(arrowY - arrowY2), cuts: doc.state.cuts.length,
          ellipseGone: !shapes().some(s => s.type === 'ellipse') };
      })()`);
      const expectedBand = Math.round(cut.h0 * 0.6) - Math.round(cut.h0 * 0.45);
      check('découpe horizontale', cut.h1 === cut.h0 - expectedBand, JSON.stringify(cut));
      check('découpe verticale', cut.w2 < cut.w1);
      check('annotations décalées avec la découpe', cut.arrowShift === expectedBand);
      check('annotation dans la bande retirée supprimée', cut.ellipseGone);
      await sleep(900);
      await exportPng('6-decoupe.png');
      const savedCuts = JSON.parse(fs.readFileSync(path.join(h.LIB, '.captur', newFile + '.json'), 'utf8')).cuts || [];
      check('découpes sauvegardées', savedCuts.length === 2);
      const undone = await ed.executeJavaScript(`(() => { undo(); undo(); return { cuts: doc.state.cuts.length, h: base().h }; })()`);
      check('découpes annulées avec Ctrl+Z', undone.cuts === 0 && undone.h === cut.h0, JSON.stringify(undone));

      // 5. Vidéo d'une zone, 3 secondes
      const beforeVid = new Set(fs.readdirSync(h.LIB));
      h.startCapture('video');
      const ov2 = await waitFor(() => (h.state().ready ? h.state().overlays : null));
      h.select({ displayId: ov2[0].displayId, x: 0.1, y: 0.1, w: 0.3, h: 0.3 });
      await waitFor(() => h.state().rec && h.state().rec.go && h.state().rec.ready, 20000);
      await sleep(3000);
      h.stopRecording();
      const vid = await waitFor(() => fs.readdirSync(h.LIB).find((f) => !beforeVid.has(f) && /\.(mp4|webm)$/.test(f)), 20000);
      await waitFor(() => !h.state().rec, 20000);
      const size = fs.statSync(path.join(h.LIB, vid)).size;
      check('vidéo enregistrée', size > 20000, `${vid} ${Math.round(size / 1024)} Ko`);
      await sleep(1500);
      fs.writeFileSync(path.join(out, '4-video.png'), (await h.editor().webContents.capturePage()).toPNG());
      const dur = await h.editor().webContents.executeJavaScript(`new Promise(r => { const p = document.getElementById('player'); if (p.readyState >= 1) r(p.videoWidth + 'x' + p.videoHeight); else p.onloadedmetadata = () => r(p.videoWidth + 'x' + p.videoHeight); setTimeout(() => r('?'), 4000); })`);
      check('vidéo lisible', dur !== '?' && !dur.startsWith('0x'), dur);
      const shown = await h.editor().webContents.executeJavaScript(`({ doc: !!doc, video: !!videoInfo, canvasHidden: wrap.hidden, videoHidden: videoWrap.hidden, width: innerWidth })`);
      check('vidéo affichée dans l\'éditeur', shown.video && !shown.doc && shown.canvasHidden && !shown.videoHidden, JSON.stringify(shown));

      // Nettoyage : on retire les fichiers créés par le test
      for (const f of fs.readdirSync(h.LIB)) {
        if (!before.has(f) && f !== '.captur') fs.rmSync(path.join(h.LIB, f), { force: true });
      }
      fs.rmSync(path.join(h.LIB, '.captur', newFile + '.json'), { force: true });
      fs.rmSync(path.join(h.LIB, '.captur', newFile + '.thumb.jpg'), { force: true });
    } catch (err) {
      check('déroulement', false, err.stack);
    }
    const failed = results.filter((x) => !x.ok).length;
    log(`${results.length - failed}/${results.length} réussis — images dans ${out}`);
    h.quit(failed ? 1 : 0);
  })();
};
