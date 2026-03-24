# Food Calorie Estimator

A simple full-stack Next.js app for uploading or pasting a food image and getting an estimated calorie result.

## Run locally
```bash
npm install
npm run dev
```

## Environment variables
Create `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_VISION_MODEL=gpt-4.1-mini
```

If `OPENAI_API_KEY` is missing, the app runs in mock/demo mode.

## Deploy
The easiest path is Vercel:
1. Push repo to GitHub
2. Import project in Vercel
3. Add env vars
4. Deploy
