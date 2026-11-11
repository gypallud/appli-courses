/** Lit un fichier image et le redimensionne (côté le plus long = max px) en JPEG dataURL. */
export function resizeImage(file, max = 480, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Prépare deux versions d'une photo :
 * - `photo` : petite (480 px), enregistrée dans la fiche (localStorage)
 * - `idImage` : plus grande (1280 px), envoyée à l'IA pour l'identification, jamais stockée
 */
export async function preparePhoto(file) {
  const [photo, idImage] = await Promise.all([resizeImage(file, 480, 0.82), resizeImage(file, 1280, 0.85)]);
  return { photo, idImage };
}
