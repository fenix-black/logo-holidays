# Logo Holiday Generator - Next.js Migration

## 🚀 Migration Complete!

This project has been successfully migrated from a client-side React (Vite) application to a full-stack Next.js application with secure API endpoints.

## 📋 What Changed

### Security Improvements
- **API Key Protection**: Gemini API key is now stored server-side only
- **Secure API Routes**: All AI operations happen through protected Next.js API endpoints
- **No Client Exposure**: Sensitive operations moved to server-side

### Architecture Changes
- **Framework**: React + Vite → Next.js 14 with App Router
- **API Layer**: Added server-side API routes in `/app/api/`
- **Image Processing**: Client-side canvas → Server-side Sharp library
- **Deployment Ready**: Configured for Vercel deployment

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📁 Project Structure

```
/app
  /api              # Server-side API routes
    /holidays       # Fetch holidays endpoint
    /analyze-logo   # Logo analysis endpoint
    /generate-image # Image generation endpoint
    /generate-video-prompt  # Video prompt generation
    /refine-video-prompt    # Prompt refinement
    /generate-video # Video generation endpoint
  layout.tsx        # Root layout with providers
  page.tsx          # Main application page
  globals.css       # Global styles

/components         # React components
  /icons           # Icon components
  Step1LogoCountry.tsx
  Step2HolidaySelection.tsx
  Step3ImageGeneration.tsx
  Step4VideoGeneration.tsx
  LanguageSwitcher.tsx
  LocaleProvider.tsx
  Loader.tsx

/lib               # Utilities and services
  /locales         # i18n translations (en/es)
  api-client.ts    # Client-side API wrapper
  gemini-server.ts # Server-side Gemini service
  types.ts         # TypeScript definitions

/hooks             # Custom React hooks
  useLocale.ts
```

## 🚀 Deployment to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Migrate to Next.js"
git push origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variable:
   - `GEMINI_API_KEY` = your_api_key
4. Deploy!

## 🔑 API Endpoints

All endpoints are POST requests that accept JSON:

- `/api/holidays` - Fetch holidays for a country
- `/api/analyze-logo` - Analyze logo style
- `/api/generate-image` - Generate holiday image with logo
- `/api/generate-video-prompt` - Create video animation script
- `/api/refine-video-prompt` - Refine animation script
- `/api/generate-video` - Generate video from image

## 🎨 Features

- **Multi-language Support**: English and Spanish
- **Logo Upload**: Support for PNG, JPG, GIF, WEBP
- **Holiday Selection**: AI-powered holiday suggestions by country
- **Image Generation**: Create festive images with your logo
- **Video Generation**: Animate images into videos
- **Style Options**: Multiple visual styles to choose from
- **Download Options**: Save generated images and videos

## ⚙️ Configuration

### Next.js Config
The `next.config.js` file includes:
- Strict mode enabled
- Server action body size limit for large file uploads
- Optimized for Vercel deployment

### Tailwind CSS
Configured with custom animations and responsive design

### TypeScript
Full TypeScript support with strict type checking

## 📝 Important Notes

1. **API Key**: Never commit your `.env.local` file
2. **File Size Limits**: 
   - Logo upload: 4MB max
   - API routes configured for 10MB body size
3. **Video Generation**: Can take 2-5 minutes
4. **Vercel Limits**: 
   - Free tier has 10-second timeout (upgrade for video generation)
   - Pro tier supports up to 5-minute functions

## 🔧 Troubleshooting

### Common Issues

1. **API Key Error**: Ensure `GEMINI_API_KEY` is set in `.env.local`
2. **Build Errors**: Run `npm run build` locally to check for issues
3. **Timeout on Vercel**: Video generation requires Vercel Pro for longer timeouts

### Development Tips

- Use `npm run dev` for hot-reloading
- Check `npm run build` before deploying
- Monitor API usage in Google AI Studio

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Google Gemini API](https://ai.google.dev/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)

## ✅ Migration Checklist

- [x] Initialize Next.js with TypeScript and Tailwind
- [x] Create API routes for all Gemini operations
- [x] Migrate all React components
- [x] Implement i18n support
- [x] Set up client-side API service
- [x] Configure environment variables
- [x] Handle server-side image processing
- [x] Test all functionality
- [x] Configure for Vercel deployment

## 🎉 Ready to Deploy!

Your application is now ready for production deployment on Vercel with secure API key handling and optimized performance.
