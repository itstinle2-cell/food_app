'use client';

import { useRef, useState } from 'react';
import type { EstimateResponse } from '@/lib/types';

export default function HomePage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResponse['result'] | null>(null);
  const [mode, setMode] = useState<EstimateResponse['mode']>(undefined);

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  async function setFromFile(file?: File | null) {
    if (!file) return;
    setError(null);
    setResult(null);
    setMode(undefined);
    setImage(await fileToDataUrl(file));
  }

  async function pasteImage() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((entry) => entry.startsWith('image/'));
        if (!type) continue;
        const blob = await item.getType(type);
        await setFromFile(new File([blob], 'clipboard-image.png', { type: blob.type }));
        return;
      }
      setError('Clipboard does not contain an image right now.');
    } catch {
      setError('Clipboard access is blocked or unsupported in this browser.');
    }
  }

  async function analyze() {
    if (!image) {
      setError('Choose or paste an image first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      const data = (await response.json()) as EstimateResponse;
      if (!data.success || !data.result) {
        throw new Error(data.error ?? 'Estimate failed');
      }
      setResult(data.result);
      setMode(data.mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  function clearAll() {
    setImage(null);
    setError(null);
    setResult(null);
    setMode(undefined);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <main>
      <div className="container">
        <section className="hero">
          <h1>Food calorie estimator</h1>
          <p>
            Upload or paste a food image and get a realistic calorie estimate with a range, confidence level,
            and assumptions. This is designed for useful guesses, not fake certainty.
          </p>
        </section>

        <section className="grid">
          <div className="card">
            <div className="drop">
              <strong>Choose or paste a food image</strong>
              <p className="note">Screenshots, photos, and copied images from the web all work.</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFromFile(e.target.files?.[0])} />
              <div className="actions">
                <button className="buttonSecondary" type="button" onClick={pasteImage}>Paste from clipboard</button>
                <button className="buttonSecondary" type="button" onClick={() => fileRef.current?.click()}>Choose image</button>
              </div>
            </div>

            {image ? <img className="preview" src={image} alt="Selected food preview" /> : null}

            <div className="actions">
              <button className="buttonPrimary" type="button" onClick={analyze} disabled={!image || isLoading}>
                {isLoading ? 'Analyzing…' : 'Estimate calories'}
              </button>
              <button className="buttonSecondary" type="button" onClick={clearAll} disabled={!image || isLoading}>Clear</button>
            </div>

            {error ? <p className="note">{error}</p> : null}
            <p className="note">Without an API key, the app still works in mock/demo mode for testing the whole flow.</p>
          </div>

          <div className="card">
            <h2>Result</h2>
            {!result ? <p className="note">No estimate yet.</p> : null}
            {result ? (
              <>
                <div className="stat"><small>Detected food</small><strong>{result.foodName}</strong></div>
                <div className="stat"><small>Estimated calories</small><strong>{result.estimatedCalories} kcal</strong></div>
                <div className="stat"><small>Range</small><strong>{result.calorieRange.min}–{result.calorieRange.max} kcal</strong></div>
                <div className="stat"><small>Confidence</small><strong>{result.confidence}</strong></div>
                <div className="stat"><small>Explanation</small><div>{result.explanation}</div></div>
                <div className="stat"><small>Assumptions</small><ul>{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <p className="note">Mode: {mode === 'ai' ? 'AI vision' : 'Mock/demo fallback'}</p>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
