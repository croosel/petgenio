export type EntryMode = 'playful' | 'memorial';

export type ToolType = 'age-calculator' | 'id-card';

export type AIStyle = 'pixar' | 'blind-box' | 'royal';

export type Softness = 'soft' | 'medium' | 'firm';
export type Size = 'mini' | 'standard' | 'jumbo';
export type Scent = 'lavender' | 'vanilla' | 'unscented';
export type BoxColor = 'orange' | 'gold' | 'cream' | 'charcoal';

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
