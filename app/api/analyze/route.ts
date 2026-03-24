import { NextResponse } from 'next/server';
import { mockEstimate } from '@/lib/mock-estimator';
import type { CalorieEstimate, EstimateResponse } from '@/lib/types';

function extractImage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const image = (payload as { image?: unknown }).image;
  return typeof image === 'string' && image.startsWith('data:image/') ? image : null;
}

function clampCalories(value: unknown, fallback: number) {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.round(num);
}

function normalizeAssumptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').slice(0, 6);
}

function normalizeVisualCues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').slice(0, 6);
}

function normalizeConfidence(value: unknown): CalorieEstimate['confidence'] {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'low';
}

function sanitizeResult(payload: unknown): CalorieEstimate | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Record<string, unknown>;
  const foodName = typeof raw.foodName === 'string' && raw.foodName.trim() ? raw.foodName.trim() : 'Unknown food';
  const estimatedCalories = clampCalories(raw.estimatedCalories, 250);

  const range = raw.calorieRange && typeof raw.calorieRange === 'object'
    ? raw.calorieRange as Record<string, unknown>
    : null;

  const min = clampCalories(range?.min, Math.max(estimatedCalories - 120, 50));
  const max = clampCalories(range?.max, estimatedCalories + 120);

  return {
    foodName,
    estimatedCalories,
    calorieRange: {
      min: Math.min(min, max),
      max: Math.max(min, max),
    },
    confidence: normalizeConfidence(raw.confidence),
    explanation: typeof raw.explanation === 'string' && raw.explanation.trim()
      ? raw.explanation.trim()
      : 'The estimate is based on visible ingredients, portion size, and common calorie ranges for similar foods.',
    assumptions: normalizeAssumptions(raw.assumptions),
    servingEstimate: typeof raw.servingEstimate === 'string' ? raw.servingEstimate : undefined,
    visualCues: normalizeVisualCues(raw.visualCues),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const image = extractImage(body);

    if (!image) {
      return NextResponse.json<EstimateResponse>({ success: false, error: 'Missing image payload.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini';

    if (!apiKey) {
      return NextResponse.json<EstimateResponse>({
        success: true,
        mode: 'mock',
        result: mockEstimate(image.slice(-60)),
      });
    }

    const prompt = [
      'You are estimating calories from a food photo.',
      'Be conservative and honest about uncertainty.',
      'If the image is unclear, return low confidence and explain why.',
      'Return strict JSON only with keys:',
      '{',
      '  "foodName": string,',
      '  "estimatedCalories": number,',
      '  "calorieRange": { "min": number, "max": number },',
      '  "confidence": "low" | "medium" | "high",',
      '  "explanation": string,',
      '  "assumptions": string[],',
      '  "servingEstimate": string,',
      '  "visualCues": string[]',
      '}',
      'Do not invent exact nutrition facts. Estimate from visible portion size, likely ingredients, cooking method, and plating clues.'
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ],
        max_tokens: 700
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json<EstimateResponse>({ success: false, error: `AI request failed: ${detail}` }, { status: 500 });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const result = sanitizeResult(parsed);

    if (!result) {
      return NextResponse.json<EstimateResponse>({ success: false, error: 'Model returned an invalid result.' }, { status: 500 });
    }

    return NextResponse.json<EstimateResponse>({ success: true, mode: 'ai', result });
  } catch (error) {
    return NextResponse.json<EstimateResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected server error'
    }, { status: 500 });
  }
}
