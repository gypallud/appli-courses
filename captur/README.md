# Captur

Outil de capture d'écran pour Windows, dans l'esprit de Snagit : capture, annotations, lecture de texte et vidéo.

## Lancer

```bash
cd captur
npm install
npm start
```

Captur se loge dans la zone de notification (en bas à droite, près de l'horloge) :
clic sur l'icône = capture, clic droit = menu (vidéo, dossier, lancement au démarrage, quitter).

## Raccourcis

| Action | Raccourci |
| --- | --- |
| Capture d'écran | Ctrl + Maj + X (ou Impr. écran si Windows le laisse libre) |
| Vidéo : démarrer / arrêter | Ctrl + Maj + Y |

Pendant la sélection : glisser = zone, clic = fenêtre survolée (ou écran entier), Entrée = écran entier, Échap ou clic droit = annuler.

Dans l'éditeur : V sélection, A flèche, L ligne, R rectangle, E ellipse, P crayon, H surligneur, T texte, U bulle,
N étape numérotée, Z loupe (bulle zoom), B flou, D découper (retirer une bande horizontale ou verticale), C recadrer · Ctrl+Z / Ctrl+Y · Ctrl+C copier · Ctrl+S enregistrer sous ·
Ctrl+T lire le texte · Ctrl+V coller une image · Ctrl+molette zoom · Ctrl+0 ajuster · Suppr effacer · flèches : déplacer.

## Où sont les fichiers

`Images\Captur`, ou `C:\Users\<vous>\Captur` si Windows protège le dossier Images
(accès contrôlé aux dossiers de Windows Defender). Les annotations restent modifiables :
elles sont rangées à part dans le sous-dossier `.captur`, l'image d'origine n'est jamais modifiée.

## Test automatique

```bash
npm run selftest
```

Fait une vraie capture, dessine des annotations, lit le texte, recadre et filme 3 secondes, puis supprime les fichiers créés.
L'écran est recouvert quelques secondes pendant le test.
