/**
 * Trouve une belle image libre de droits pour une espèce : image principale de l'article
 * Wikipédia (français puis anglais), avec auteur et licence lus sur Wikimedia Commons.
 * Aucune clé nécessaire, les deux services acceptent les appels depuis le navigateur.
 */

const WIDTH = 500;

/** « Ctenanthe setosa 'Grey Star' » → « Ctenanthe setosa » (genre + espèce). */
export function speciesQuery(name) {
  const words = String(name || '')
    .replace(/['‘’"«»].*$/, '')
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2 && /^[a-z]/.test(words[1])) return `${words[0]} ${words[1]}`;
  return words.join(' ');
}

async function leadImage(lang, title) {
  const res = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  );
  if (!res.ok) return null;
  const page = await res.json();
  if (page.type === 'disambiguation' || !page.originalimage?.source) return null;
  return {
    file: decodeURIComponent(page.originalimage.source.split('?')[0].split('/').pop()),
    description: `${page.description || ''} ${page.extract || ''}`.slice(0, 400),
  };
}

async function commonsInfo(file) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo' +
    `&iiprop=url|extmetadata&iiurlwidth=${WIDTH}&titles=${encodeURIComponent('File:' + file)}`;
  const data = await (await fetch(url)).json();
  const info = Object.values(data.query?.pages || {})[0]?.imageinfo?.[0];
  if (!info) return null;
  const text = (v) => String(v?.value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return {
    image: (info.thumburl || info.url).split('?')[0],
    imageCredit: {
      author: text(info.extmetadata?.Artist) || 'Wikimedia Commons',
      license: text(info.extmetadata?.LicenseShortName),
      source: info.descriptionurl,
    },
  };
}

/** { image, imageCredit } ou null si rien trouvé. */
export async function findPlantImage(name) {
  const query = speciesQuery(name);
  if (!query) return null;
  // Espèce d'abord ; sinon le genre seul, mais seulement si la page est bien celle d'un genre de plantes
  const tries = [query, query.split(' ')[0]].filter((q, i, all) => q && all.indexOf(q) === i);
  for (const [i, q] of tries.entries()) {
    for (const lang of ['fr', 'en']) {
      try {
        const lead = await leadImage(lang, q);
        if (!lead || /\.(svg|tif?f)$/i.test(lead.file)) continue;
        if (i > 0 && !/\b(genus|genre)\b/i.test(lead.description)) continue;
        const found = await commonsInfo(lead.file);
        if (found) return found;
      } catch {
        /* réseau ou page absente : on essaie la suivante */
      }
    }
  }
  return null;
}
