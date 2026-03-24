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

  const confidenceTone = result?.confidence === 'high' ? 'pill good' : result?.confidence === 'medium' ? 'pill warn' : 'pill soft';

  return (
    <main>
      <div className="container">
        <section className="hero">
          <span className="eyebrow">PASTE OR UPLOAD A FOOD PHOTO</span>
          <h1>Better calorie estimates, with uncertainty shown honestly.</h1>
          <p>
            Drop in a screenshot or photo and the app will estimate the meal, portion size, calorie range,
            and confidence. It is built to be useful, not fake-precise.
          </p>
        </section>

        <section className="grid">
          <div className="card panelTall">
            <div className="drop">
              <strong>Choose or paste a food image</strong>
              <p className="note">Best results: one meal centered in frame, visible plate/bowl, minimal clutter.</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFromFile(e.target.files?.[0])} />
              <div className="actions">
                <button className="buttonSecondary" type="button" onClick={pasteImage}>Paste from clipboard</button>
                <button className="buttonSecondary" type="button" onClick={() => fileRef.current?.click()}>Choose image</button>
              </div>
            </div>

            {image ? (
              <div className="previewWrap">
                <img className="preview" src={image} alt="Selected food preview" />
              </div>
            ) : (
              <div className="emptyPreview">
                <span>No image selected yet.</span>
                <p className="note">Try a clear top-down or angled shot with the full food item visible.</p>
              </div>
            )}

            <div className="actions">
              <button className="buttonPrimary" type="button" onClick={analyze} disabled={!image || isLoading}>
                {isLoading ? 'Analyzing image…' : 'Estimate calories'}
              </button>
              <button className="buttonSecondary" type="button" onClick={clearAll} disabled={!image || isLoading}>Clear</button>
            </div>

            {error ? <p className="errorBox">{error}</p> : null}

            <div className="tipsBox">
              <div>
                <strong>Tips for better imaging</strong>
                <ul>
                  <li>Fill most of the frame with the meal</li>
                  <li>Avoid heavy shadows and strong filters</li>
                  <li>Include the whole portion, not just a close crop</li>
                  <li>One meal per photo works better than busy tables</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="card panelTall">
            <div className="resultHeader">
              <div>
                <h2>Estimate</h2>
                <p className="note">The app gives a range and confidence instead of pretending it knows exact calories.</p>
              </div>
              <span className="modeBadge">{mode === 'ai' ? 'AI vision' : 'Demo mode'}</span>
            </div>

            {!result ? <div className="emptyResult"><p className="note">No estimate yet. Add a food image and run the analyzer.</p></div> : null}

            {result ? (
              <>
                <div className="heroStat">
                  <div>
                    <small>Likely food</small>
                    <strong>{result.foodName}</strong>
                  </div>
                  <span className={confidenceTone}>{result.confidence} confidence</span>
                </div>

                <div className="statGrid">
                  <div className="stat"><small>Estimated calories</small><strong>{result.estimatedCalories} kcal</strong></div>
                  <div className="stat"><small>Calorie range</small><strong>{result.calorieRange.min}–{result.calorieRange.max} kcal</strong></div>
                  <div className="stat"><small>Serving estimate</small><strong>{result.servingEstimate ?? 'Not specified'}</strong></div>
                </div>

                <div className="stat"><small>Why this estimate</small><div>{result.explanation}</div></div>

                {result.visualCues?.length ? (
                  <div className="stat">
                    <small>Visual cues used</small>
                    <div className="chipRow">
                      {result.visualCues.map((item) => (
                        <span key={item} className="chip">{item}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="stat">
                  <small>Assumptions</small>
                  <ul>
                    {result.assumptions.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
