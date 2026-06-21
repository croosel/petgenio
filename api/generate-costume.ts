import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── CORS Headers ───
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── Costume Prompt Templates ───
// Duplicated from src/flows/shared/costume-prompts.ts because
// Vercel serverless functions can't import from src/ easily.
const COSTUME_PROMPTS: Record<string, string> = {
  royal:
    'A majestic royal portrait of {petName} the {breed}, wearing an elaborate golden crown with precious gems and luxurious royal robes with ermine trim, Renaissance oil painting style reminiscent of Velázquez and Rembrandt, rich warm lighting from candles, ornate palace background with heavy velvet drapes and gilded frames, dignified pose, masterpiece quality, highly detailed, 4K',
  superhero:
    'A dynamic action shot of {petName} the {breed} as a superhero, wearing a sleek fitted superhero costume with a flowing cape and chest emblem, standing heroically on a rooftop overlooking a city skyline at golden hour, dramatic wind blowing the cape, cinematic lighting with lens flare, comic book movie poster style, bold colors, epic composition, highly detailed, 4K',
  beach:
    'A cheerful vacation photo of {petName} the {breed} at a tropical beach, wearing tiny sunglasses and a colorful Hawaiian shirt, sitting on a beach towel with a coconut drink nearby, turquoise ocean and palm trees in the background, bright sunny day with fluffy white clouds, warm vibrant colors, lifestyle photography style, natural lighting, joyful mood, highly detailed, 4K',
  europe:
    'A charming scene of {petName} the {breed} at a Parisian sidewalk café, wearing a tiny beret and a chic scarf, sitting at a small round table with a croissant and coffee cup, the Eiffel Tower visible in the background, soft golden afternoon light, impressionist color palette with warm pinks and golds, romantic European atmosphere, lifestyle photography, highly detailed, 4K',
  sagrada:
    'A whimsical artistic portrait of {petName} the {breed} in front of the Sagrada Familia basilica in Barcelona, wearing a tiny artist beret and paint-stained smock, colorful mosaic tiles (trencadís style) framing the composition, Gaudí-inspired organic architectural elements, warm Mediterranean sunlight, vibrant saturated colors, architectural photography meets pet portrait, highly detailed, 4K',
  space:
    'An awe-inspiring scene of {petName} the {breed} as a space explorer, wearing a detailed astronaut suit with helmet visor open, standing on a lunar surface with Earth visible in the starry sky, a small flag planted next to them, dramatic space lighting with Earth glow, sci-fi movie poster composition, cool blue and purple tones with warm highlights, cinematic, highly detailed, 4K',
  christmas:
    'A heartwarming holiday portrait of {petName} the {breed} wearing a cozy Christmas sweater with reindeer pattern and a small Santa hat, sitting in front of a beautifully decorated Christmas tree with warm fairy lights, wrapped gift boxes nearby, a fireplace with stockings in the background, warm golden ambient lighting, cozy festive atmosphere, lifestyle photography, highly detailed, 4K',
  anime:
    'An adorable anime-style illustration of {petName} the {breed} as a Studio Ghibli character, big expressive sparkling eyes, soft pastel color palette, standing in a magical meadow with cherry blossom petals floating in the wind, whimsical clouds in a bright blue sky, gentle watercolor textures, heartwarming and nostalgic mood, anime key visual style, highly detailed, 4K',
};

// ─── Helpers ───

function buildPrompt(costumeId: string, petName: string, breed: string): string {
  const template = COSTUME_PROMPTS[costumeId];
  if (!template) throw new Error(`Unknown costume template: ${costumeId}`);

  const safeName = petName.trim() || 'the pet';
  const safeBreed = breed.trim() || 'adorable pet';

  return template
    .replace(/\{petName\}/g, safeName)
    .replace(/\{breed\}/g, safeBreed);
}

function validateBase64Photo(photo: string): boolean {
  if (!photo || typeof photo !== 'string') return false;
  // Must be a data URL with image media type
  if (!photo.startsWith('data:image/')) return false;
  // Size check: max 4MB base64 (Vercel body limit is 4.5MB)
  if (photo.length > 4 * 1024 * 1024) return false;
  return true;
}

// ─── Main Handler ───

export const config = {
  maxDuration: 60, // seconds — needed for AI image generation
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
  }

  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').json({ error: 'Method not allowed' });
  }

  try {
    const { photo, costumeId, petName, breed } = req.body as {
      photo?: string;
      costumeId?: string;
      petName?: string;
      breed?: string;
    };

    // ── Validate input ──
    if (!costumeId || !COSTUME_PROMPTS[costumeId]) {
      return res.status(400).json({ error: `Invalid costumeId: ${costumeId}` });
    }
    if (!petName?.trim()) {
      return res.status(400).json({ error: 'petName is required' });
    }
    if (photo && !validateBase64Photo(photo)) {
      return res.status(400).json({ error: 'Invalid photo: must be a data URL under 4MB' });
    }

    // ── Build prompt ──
    const prompt = buildPrompt(costumeId, petName, breed || '');

    // ── Call 火山引擎方舟 Seedream API ──
    const apiKey = process.env.ARK_API_KEY;
    const endpointId = process.env.MODEL_ENDPOINT_ID;

    if (!apiKey || !endpointId) {
      // Fallback: return a placeholder when API is not configured
      console.warn('ARK_API_KEY or MODEL_ENDPOINT_ID not configured, returning placeholder');
      return res.status(200).setHeader('Access-Control-Allow-Origin', '*').json({
        imageUrl: null,
        imageBase64: null,
        placeholder: true,
        prompt,
        message: 'API not configured. Set ARK_API_KEY and MODEL_ENDPOINT_ID env vars.',
      });
    }

    // Build the API request body
    const requestBody: Record<string, unknown> = {
      model: endpointId,
      prompt,
      size: '1024x1024',
      n: 1,
      response_format: 'b64_json',
    };

    // If photo is provided, include it as a reference for image-to-image
    if (photo) {
      // Extract base64 data from data URL
      const base64Data = photo.split(',')[1];
      if (base64Data) {
        requestBody.image = base64Data;
        requestBody.strength = 0.6; // How much to follow the reference image
      }
    }

    const apiResponse = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`Seedream API error ${apiResponse.status}:`, errorText);
      return res.status(502).json({
        error: `AI generation failed: ${apiResponse.status}`,
        detail: errorText,
      });
    }

    const result = (await apiResponse.json()) as {
      data: Array<{ b64_json?: string; url?: string }>;
    };

    if (!result.data?.[0]) {
      return res.status(502).json({ error: 'AI generation returned empty result' });
    }

    const imageData = result.data[0];

    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').json({
      imageUrl: imageData.url,
      imageBase64: imageData.b64_json,
      prompt,
    });
  } catch (err) {
    console.error('generate-costume error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
