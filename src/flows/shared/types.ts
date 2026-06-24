export type EntryMode = 'playful' | 'memorial';

export type ToolType = 'age-calculator' | 'id-card';

export type AIStyle = 'pixar' | 'blind-box' | 'royal';

export type Softness = 'soft' | 'medium' | 'firm';
export type Size = 'mini' | 'standard' | 'jumbo';
export type Scent = 'lavender' | 'vanilla' | 'unscented';
export type BoxColor = 'teal' | 'sand' | 'mint' | 'deep';

export interface ProductConfig {
  softness: Softness;
  size: Size;
  scent: Scent;
  boxColor: BoxColor;
}

export interface PetData {
  name: string;
  photo: string | null;
  breed: string;
  age: number;
  birthday: string;
  gender: 'male' | 'female' | '';
  personality: string;
}

export interface OrderData {
  id: string;
  pet: PetData;
  style: AIStyle;
  config: ProductConfig;
  price: number;
  estimatedDelivery: string;
}

export type ScreenIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ─── AI Costume Generation ───

export interface GenerationRequest {
  photo: string;        // base64 data URL of pet photo
  costumeId: string;    // costume template ID
  petName: string;
  breed: string;
}

export interface GenerationResponse {
  imageUrl?: string;    // URL to generated image
  imageBase64?: string; // base64 encoded image (without data: prefix)
  error?: string;
}

export interface CostumeTemplate {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  color: string;
  prompt: string;       // prompt template with {petName}/{breed} placeholders
}
