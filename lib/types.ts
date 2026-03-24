export interface CalorieEstimate {
  foodName: string;
  estimatedCalories: number;
  calorieRange: { min: number; max: number };
  confidence: 'low' | 'medium' | 'high';
  explanation: string;
  assumptions: string[];
  servingEstimate?: string;
  visualCues?: string[];
}

export interface EstimateResponse {
  success: boolean;
  result?: CalorieEstimate;
  error?: string;
  mode?: 'mock' | 'ai';
}
