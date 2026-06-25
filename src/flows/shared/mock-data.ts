import type { PetData, ProductConfig, OrderData } from './types';

export const MOCK_PET: PetData = {
  name: 'Mochi',
  photo: null,
  breed: 'Orange Tabby Cat',
  age: 3,
  birthday: '',
  gender: '',
  personality: '35-year-old middle manager who naps 16 hours a day',
};

export const MOCK_CONFIG: ProductConfig = {
  softness: 'medium',
  size: 'standard',
  scent: 'lavender',
  boxColor: 'teal',
};

export const MOCK_ORDER: OrderData = {
  id: 'PP-2026-0621',
  pet: MOCK_PET,
  style: 'pixar',
  config: MOCK_CONFIG,
  price: 99,
  estimatedDelivery: 'Jun 28 – Jul 2, 2026',
};

export const PERSONALITY_TAGS = [
  '35-year-old middle manager who naps 16 hours a day',
  'CEO of demanding treats at 3am',
  'Freelance sunbeam inspector',
  'Part-time model, full-time nap enthusiast',
  'Head of Security (the treat bag)',
];

export const BREEDS = [
  'Orange Tabby Cat', 'British Shorthair', 'Golden Retriever',
  'French Bulldog', 'Maine Coon', 'Corgi', 'Persian Cat', 'Husky',
];
