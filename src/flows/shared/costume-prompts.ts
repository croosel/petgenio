import type { CostumeTemplate } from '@/flows/shared/types';

/**
 * Costume templates with AI generation prompts.
 * Each prompt uses {petName} and {breed} placeholders,
 * replaced at runtime by the serverless function.
 *
 * Prompt engineering principles:
 * - Subject description first (who)
 * - Costume/scene description second (what)
 * - Art style / mood third (how)
 * - Quality modifiers last (technical)
 */
export const COSTUME_TEMPLATES: CostumeTemplate[] = [
  {
    id: 'royal',
    emoji: '👑',
    title: 'Royal Portrait',
    desc: 'Renaissance oil painting',
    color: '#7C3AED',
    prompt:
      'A majestic royal portrait of {petName} the {breed}, wearing an elaborate golden crown with precious gems and luxurious royal robes with ermine trim, Renaissance oil painting style reminiscent of Velázquez and Rembrandt, rich warm lighting from candles, ornate palace background with heavy velvet drapes and gilded frames, dignified pose, masterpiece quality, highly detailed, 4K',
  },
  {
    id: 'superhero',
    emoji: '🦸',
    title: 'Superhero',
    desc: 'Save the world, one nap at a time',
    color: '#DC2626',
    prompt:
      'A dynamic action shot of {petName} the {breed} as a superhero, wearing a sleek fitted superhero costume with a flowing cape and chest emblem, standing heroically on a rooftop overlooking a city skyline at golden hour, dramatic wind blowing the cape, cinematic lighting with lens flare, comic book movie poster style, bold colors, epic composition, highly detailed, 4K',
  },
  {
    id: 'beach',
    emoji: '🏖️',
    title: 'Beach Vacation',
    desc: 'Tropical vibes & tiny sunglasses',
    color: '#0891B2',
    prompt:
      'A cheerful vacation photo of {petName} the {breed} at a tropical beach, wearing tiny sunglasses and a colorful Hawaiian shirt, sitting on a beach towel with a coconut drink nearby, turquoise ocean and palm trees in the background, bright sunny day with fluffy white clouds, warm vibrant colors, lifestyle photography style, natural lighting, joyful mood, highly detailed, 4K',
  },
  {
    id: 'europe',
    emoji: '🗼',
    title: 'Paris Trip',
    desc: 'Café, croissant, cute pet',
    color: '#DB2777',
    prompt:
      'A charming scene of {petName} the {breed} at a Parisian sidewalk café, wearing a tiny beret and a chic scarf, sitting at a small round table with a croissant and coffee cup, the Eiffel Tower visible in the background, soft golden afternoon light, impressionist color palette with warm pinks and golds, romantic European atmosphere, lifestyle photography, highly detailed, 4K',
  },
  {
    id: 'sagrada',
    emoji: '⛪',
    title: 'Sagrada Familia',
    desc: 'Gaudi meets kitty',
    color: '#D97706',
    prompt:
      'A whimsical artistic portrait of {petName} the {breed} in front of the Sagrada Familia basilica in Barcelona, wearing a tiny artist beret and paint-stained smock, colorful mosaic tiles (trencadís style) framing the composition, Gaudí-inspired organic architectural elements, warm Mediterranean sunlight, vibrant saturated colors, architectural photography meets pet portrait, highly detailed, 4K',
  },
  {
    id: 'space',
    emoji: '🚀',
    title: 'Space Explorer',
    desc: 'One small step for petkind',
    color: '#4F46E5',
    prompt:
      'An awe-inspiring scene of {petName} the {breed} as a space explorer, wearing a detailed astronaut suit with helmet visor open, standing on a lunar surface with Earth visible in the starry sky, a small flag planted next to them, dramatic space lighting with Earth glow, sci-fi movie poster composition, cool blue and purple tones with warm highlights, cinematic, highly detailed, 4K',
  },
  {
    id: 'christmas',
    emoji: '🎄',
    title: 'Holiday Festive',
    desc: 'Cozy holiday sweater vibes',
    color: '#059669',
    prompt:
      'A heartwarming holiday portrait of {petName} the {breed} wearing a cozy Christmas sweater with reindeer pattern and a small Santa hat, sitting in front of a beautifully decorated Christmas tree with warm fairy lights, wrapped gift boxes nearby, a fireplace with stockings in the background, warm golden ambient lighting, cozy festive atmosphere, lifestyle photography, highly detailed, 4K',
  },
  {
    id: 'anime',
    emoji: '🎌',
    title: 'Anime Hero',
    desc: 'Studio Ghibli cuteness',
    color: '#E11D48',
    prompt:
      'An adorable anime-style illustration of {petName} the {breed} as a Studio Ghibli character, big expressive sparkling eyes, soft pastel color palette, standing in a magical meadow with cherry blossom petals floating in the wind, whimsical clouds in a bright blue sky, gentle watercolor textures, heartwarming and nostalgic mood, anime key visual style, highly detailed, 4K',
  },
];

/**
 * Build the final prompt by replacing placeholders with actual pet data.
 */
export function buildPrompt(
  templateId: string,
  petName: string,
  breed: string,
): string {
  const template = COSTUME_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Unknown costume template: ${templateId}`);
  }

  const safeName = petName.trim() || 'the pet';
  const safeBreed = breed.trim() || 'adorable pet';

  return template.prompt
    .replace(/\{petName\}/g, safeName)
    .replace(/\{breed\}/g, safeBreed);
}
