# GeminiVideoGenerator

A TypeScript class for video generation with polling support using Google Gemini API (VEO models).

## Features

- Async video generation with automatic polling
- VEO3 model support
- Configurable polling intervals and timeouts  
- Multiple output formats (URL, base64, Blob)
- Progress tracking callbacks
- Cancellable operations

## Usage

```typescript
import { GeminiVideoGenerator } from './shared/gemini-video-generator';

const videoGen = new GeminiVideoGenerator({
  apiKey: process.env.GOOGLE_GENAI_API_KEY!,
  model: 'models/video-01', // VEO3
  outputFormat: 'blob'
});

const result = await videoGen.generate({
  prompt: "Your video prompt",
  imageData: {
    base64: "...",
    mimeType: "image/jpeg"
  }
});
```

## Configuration

- `apiKey`: Google Gemini API key
- `model`: Model identifier (default: 'models/video-01' for VEO3)
- `maxPollingTime`: Maximum polling duration in ms (default: 600000)
- `pollingInterval`: Interval between status checks in ms (default: 5000)
- `outputFormat`: Output format - 'url' | 'base64' | 'blob' (default: 'url')
