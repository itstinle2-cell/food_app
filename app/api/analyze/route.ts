import { NextResponse } from 'next/server';
import { mockEstimate } from '@/lib/mock-estimator';
import type { EstimateResponse } from '@/lib/types';

function extractImage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const image = (payload as { image?: unknown }).image;
  return typeof image === 'string' && image.startsWith('data:image/') ? image : null;
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

    const prompt = 'Analyze this food image and return strict JSON with keys foodName, estimatedCalories, calorieRange { min, max }, confidence, explanation, assumptions. Use an honest estimated calorie range, not fake precision.';

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
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json<EstimateResponse>({ success: false, error: `AI request failed: ${detail}` }, { status: 500 });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

    return NextResponse.json<EstimateResponse>({ success: true, mode: 'ai', result: parsed });
  } catch (error) {
    return NextResponse.json<EstimateResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected server error'
    }, { status: 500 });
  }
}
