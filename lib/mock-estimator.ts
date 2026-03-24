import type { CalorieEstimate } from '@/lib/types';

const samples: CalorieEstimate[] = [
  {
    foodName: 'Pepperoni pizza',
    estimatedCalories: 610,
    calorieRange: { min: 520, max: 720 },
    confidence: 'medium',
    explanation: 'This looks like a pizza-style meal. The estimate assumes about two large slices with cheese and cured meat.',
    assumptions: ['Assumed serving size: 2 slices', 'Oil and crust thickness can change calories a lot'],
  },
  {
    foodName: 'Chicken rice bowl',
    estimatedCalories: 540,
    calorieRange: { min: 430, max: 650 },
    confidence: 'medium',
    explanation: 'This appears similar to a rice bowl with protein and sauce. The range reflects medium-portion uncertainty.',
    assumptions: ['Assumed serving size: 1 bowl', 'Sauce and cooking oil can shift the total'],
  },
  {
    foodName: 'Burger and fries',
    estimatedCalories: 840,
    calorieRange: { min: 700, max: 1020 },
    confidence: 'medium',
    explanation: 'This resembles a burger meal with fries. The range captures uncertainty in portion size and fry oil.',
    assumptions: ['Assumed serving: 1 burger + medium fries', 'Condiments may add calories'],
  }
];

export function mockEstimate(seed: string): CalorieEstimate {
  const total = seed.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return samples[Math.abs(total) % samples.length];
}
