import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

/**
 * Identification d'une plante à partir d'une photo, via l'API Claude (vision).
 * L'appel part directement du navigateur avec la clé API de l'utilisateur,
 * stockée uniquement dans son navigateur (usage personnel).
 */

const MODEL = 'claude-opus-5-5';

export const PlantIdSchema = z.object({
  isPlant: z.boolean().describe('false si la photo ne montre pas de plante identifiable'),
  commonName: z.string().describe('Nom courant en français, ex : "Monstera", "Pothos doré"'),
  scientificName: z.string().describe('Nom botanique, ex : "Monstera deliciosa"'),
  confidence: z.enum(['faible', 'moyenne', 'élevée']),
  alternatives: z.array(z.string()).describe("Jusqu'à 3 autres espèces possibles (noms courants), vide si certain"),
  avatar: z.enum(['monstera', 'broad', 'palm', 'spiky', 'fern']).describe(
    'Forme du feuillage la plus proche : monstera = grandes feuilles larges/rondes, broad = feuilles en pagaie, palm = palmes, spiky = feuilles fines et pointues, fern = fougère ou rosette',
  ),
  light: z.enum(['directe', 'indirecte', 'ombre']),
  waterSummer: z.number().int().describe("Jours entre deux arrosages au printemps/été"),
  waterWinter: z.number().int().describe("Jours entre deux arrosages en automne/hiver"),
  fertilizerEvery: z.number().int().describe("Jours entre deux apports d'engrais de mars à août (0 = aucun)"),
  soil: z.string().describe('Terreau recommandé, une phrase'),
  repotting: z.string().describe('Fréquence et période de rempotage, une phrase'),
  humidity: z.string().describe('Humidité idéale, ex : "Élevée (60 %)"'),
  temperature: z.string().describe('Plage idéale, ex : "18 – 25 °C"'),
  notes: z.string().describe('Un conseil clé ou une particularité (toxicité pour animaux incluse si pertinent)'),
  healthNote: z.string().describe("Observation sur l'état visible de la plante sur la photo, chaîne vide si rien à signaler"),
});

const SYSTEM = `Tu es un botaniste spécialiste des plantes d'intérieur. On te montre la photo d'une plante prise par un particulier.
Identifie l'espèce (ou le cultivar s'il est reconnaissable) et donne ses paramètres d'entretien optimaux en intérieur, pour un logement en France.
Réponds en français. Sois honnête sur ton niveau de certitude : si la photo est floue, partielle ou ambiguë, indique "faible" et propose des alternatives.
Si la photo ne montre pas de plante, mets isPlant à false et remplis les autres champs avec des valeurs neutres.`;

export class PlantIdError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function splitDataUrl(dataUrl) {
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new PlantIdError("Format d'image non reconnu.", 'format');
  return { mediaType: match[1], data: match[2] };
}

export async function identifyPlant(dataUrl, apiKey) {
  if (!apiKey) throw new PlantIdError('Ajoutez votre clé API Claude dans les réglages.', 'no-key');
  const { mediaType, data } = splitDataUrl(dataUrl);

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Si le modèle décline la demande, l'API bascule automatiquement sur un autre modèle.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: zodOutputFormat(PlantIdSchema) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
            { type: 'text', text: 'Quelle est cette plante et comment en prendre soin ?' },
          ],
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new PlantIdError('Clé API invalide. Vérifiez-la dans les réglages.', 'auth');
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      throw new PlantIdError("Cette clé API n'a pas accès au modèle.", 'permission');
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new PlantIdError('Trop de demandes, réessayez dans un instant.', 'rate');
    }
    if (err instanceof Anthropic.BadRequestError) {
      throw new PlantIdError(`Requête refusée : ${err.message}`, 'bad-request');
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new PlantIdError('Pas de connexion au service. Vérifiez votre réseau.', 'network');
    }
    if (err instanceof Anthropic.APIError) {
      throw new PlantIdError(`Le service a répondu une erreur (${err.status}). Réessayez.`, 'api');
    }
    throw err;
  }

  if (response.stop_reason === 'refusal') {
    throw new PlantIdError("L'identification a été refusée pour cette image.", 'refusal');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new PlantIdError('Réponse incomplète, réessayez.', 'truncated');
  }

  const text = response.content.find((b) => b.type === 'text')?.text;
  let parsed;
  try {
    parsed = PlantIdSchema.safeParse(JSON.parse(text ?? ''));
  } catch {
    parsed = { success: false };
  }
  if (!parsed.success) throw new PlantIdError('Réponse inattendue du service, réessayez.', 'parse');

  const r = parsed.data;
  if (!r.isPlant) throw new PlantIdError("Aucune plante n'a été reconnue sur la photo.", 'not-plant');

  return {
    ...r,
    waterSummer: Math.min(60, Math.max(1, r.waterSummer)),
    waterWinter: Math.min(90, Math.max(1, r.waterWinter)),
    fertilizerEvery: Math.min(120, Math.max(0, r.fertilizerEvery)),
  };
}
