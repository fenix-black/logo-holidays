import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { Holiday } from './types';

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Cache for holiday details to avoid redundant API calls
 * Key format: "${country}::${holidayName}"
 * Value: { data: Holiday, timestamp: number }
 */
const holidayDetailsCache = new Map<string, { data: Holiday, timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 50; // Maximum number of cached entries

/**
 * Helper function to manage cache size using LRU eviction
 */
const evictOldestCacheEntry = (): void => {
    if (holidayDetailsCache.size < MAX_CACHE_SIZE) return;
    
    // Find the oldest entry by timestamp
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    // Convert to array to avoid iteration issues
    const entries = Array.from(holidayDetailsCache.entries());
    for (const [key, value] of entries) {
        if (value.timestamp < oldestTime) {
            oldestTime = value.timestamp;
            oldestKey = key;
        }
    }
    
    if (oldestKey) {
        holidayDetailsCache.delete(oldestKey);
        console.log(`Cache evicted oldest entry: ${oldestKey}`);
    }
};

/**
 * Gets holiday details from cache or fetches them if not cached/expired
 */
const getCachedOrFetchHolidayDetails = async (country: string, holidayName: string): Promise<Holiday> => {
    const cacheKey = `${country}::${holidayName}`;
    const cached = holidayDetailsCache.get(cacheKey);
    
    // Check if we have a valid cached entry
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`✓ Using cached holiday details for: ${cacheKey}`);
        return cached.data;
    }
    
    // If cache is expired or doesn't exist, fetch fresh data
    console.log(`↻ Fetching fresh holiday details for: ${cacheKey}`);
    const details = await fetchHolidayDetails(country, holidayName);
    
    // Evict oldest entry if cache is full
    evictOldestCacheEntry();
    
    // Store in cache
    holidayDetailsCache.set(cacheKey, {
        data: details,
        timestamp: Date.now()
    });
    
    console.log(`✓ Cached holiday details for: ${cacheKey} (cache size: ${holidayDetailsCache.size}/${MAX_CACHE_SIZE})`);
    return details;
};

/**
 * Utility function to clear the holiday details cache
 * Useful for testing or when data needs to be refreshed
 */
export const clearHolidayDetailsCache = (): void => {
    const size = holidayDetailsCache.size;
    holidayDetailsCache.clear();
    console.log(`Cache cleared. Removed ${size} entries.`);
};

/**
 * Get cache statistics for debugging
 */
export const getHolidayDetailsCacheStats = (): { size: number; maxSize: number; ttlMinutes: number; entries: string[] } => {
    return {
        size: holidayDetailsCache.size,
        maxSize: MAX_CACHE_SIZE,
        ttlMinutes: CACHE_TTL / 60000,
        entries: Array.from(holidayDetailsCache.keys())
    };
};

/**
 * Creates a minimal blank PNG image using a pre-generated base64 string
 * This is a 16x9 (16:9 aspect ratio) transparent PNG that Gemini uses as aspect ratio reference
 * @returns An object with the base64 string and mimeType.
 */
const createBlankImageB64 = (): { b64: string; mimeType: string } => {
    // This is a 16x9 transparent PNG (16:9 aspect ratio)
    // Created using: canvas.width = 16; canvas.height = 9; with transparent background
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAJCAYAAAA7KqwyAAAAEklEQVQoU2NkIBIwjhowCAIAAAkAAWyqEiUAAAAASUVORK5CYII=';
    return { b64, mimeType: 'image/png' };
};

/**
 * Fetches a simplified list of holidays with only names and descriptions.
 * This is Phase 1 of the 2-phase approach - fast loading for the selection UI.
 */
export const fetchHolidayList = async (country: string): Promise<Holiday[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a cultural expert. List the top 8 most popular and visually distinct holidays celebrated in ${country}.

For each holiday, provide ONLY:
- The holiday name in both English and Spanish
- A brief, one-sentence description of what the holiday celebrates in both English and Spanish

Focus on the most culturally significant and visually interesting celebrations.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        holidays: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name_en: { type: Type.STRING, description: 'The name of the holiday in English.' },
                                    name_es: { type: Type.STRING, description: 'The name of the holiday in Spanish.' },
                                    description_en: { type: Type.STRING, description: 'A brief, one-sentence description of the holiday in English.' },
                                    description_es: { type: Type.STRING, description: 'A brief, one-sentence description of the holiday in Spanish.' },
                                },
                            },
                        },
                    },
                },
            },
        });

        const jsonStr = response.text?.trim();
        if (!jsonStr) {
            throw new Error("No response received from AI");
        }
        const parsed = JSON.parse(jsonStr);
        return parsed.holidays;
    } catch (error) {
        console.error("Error fetching holiday list:", error);
        throw new Error("Failed to fetch holiday list from AI.");
    }
};

/**
 * Fetches complete details for a specific holiday.
 * This is Phase 2 of the 2-phase approach - detailed data fetched on demand.
 */
export const fetchHolidayDetails = async (country: string, holidayName: string): Promise<Holiday> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a cultural expert and cinematographer. Provide comprehensive details about the holiday "${holidayName}" as celebrated in ${country}. This information will be used to create professional video productions.

Provide ALL of the following details for this specific holiday:
- VISUAL DETAILS: Traditional clothing, decorations, props, and visual symbols
- LOCATIONS: Typical celebration venues (e.g., "town squares", "family homes", "beaches")
- TIMING: When celebrations typically occur (time of day/night)
- ACTIVITIES: Key rituals, dances, or traditional activities
- COLOR PALETTE: Traditional colors associated with this holiday
- AUDIO: Traditional music styles and ambient sounds  
- FLAG USAGE: Whether the national flag is prominently featured

Focus on authentic cultural details that would help a cinematographer create accurate, respectful scenes.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name_en: { type: Type.STRING, description: 'The name of the holiday in English.' },
                        name_es: { type: Type.STRING, description: 'The name of the holiday in Spanish.' },
                        description_en: { type: Type.STRING, description: 'A brief, one-sentence description of the holiday in English.' },
                        description_es: { type: Type.STRING, description: 'A brief, one-sentence description of the holiday in Spanish.' },
                        clothing: { type: Type.STRING, description: 'Detailed description of traditional clothing and costumes worn for this holiday.' },
                        elements: { type: Type.STRING, description: 'Key decorative elements, props, and objects used in celebrations.' },
                        visualSymbols: { type: Type.STRING, description: 'Important visual symbols and motifs (e.g., "candles, stars, religious icons").' },
                        locations: { type: Type.STRING, description: 'Typical venues where celebrations occur (e.g., "cathedral steps, beach bonfires, city plazas").' },
                        timeOfDay: { type: Type.STRING, description: 'When key celebrations happen (e.g., "midnight mass", "sunrise ceremony", "evening parade").' },
                        activities: { type: Type.STRING, description: 'Traditional activities and rituals (e.g., "lighting candles, folk dancing, firework displays").' },
                        colorPalette: { type: Type.STRING, description: 'Traditional colors associated with this holiday (e.g., "red and gold", "purple and white").' },
                        flagIsProminent: { type: Type.BOOLEAN, description: 'Boolean indicating if the national flag is a prominent symbol in this celebration.' },
                        soundEffects: { type: Type.STRING, description: 'Typical ambient sounds and effects (e.g., "church bells, fireworks, ocean waves").' },
                        musicStyles: { type: Type.STRING, description: 'Traditional music genres and instruments (e.g., "mariachi bands, steel drums, bagpipes").' },
                    },
                },
            },
        });

        const jsonStr = response.text?.trim();
        if (!jsonStr) {
            throw new Error("No response received from AI");
        }
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error fetching holiday details:", error);
        throw new Error("Failed to fetch holiday details from AI.");
    }
};

/**
 * Legacy function name for backward compatibility.
 * @deprecated Use fetchHolidayList instead
 */
export const fetchHolidays = fetchHolidayList;

export const analyzeLogoStyle = async (logoB64: string, logoMimeType: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: {
                parts: [
                    { inlineData: { data: logoB64, mimeType: logoMimeType } },
                    { text: "Analyze the provided logo. Describe its style (e.g., modern, minimalist, vintage, playful), color palette, and overall theme in a concise phrase of 15-20 words." },
                ],
            },
        });
        if (!response.text) {
            throw new Error("No response received from AI");
        }
        return response.text;
    } catch(error) {
        console.error("Error analyzing logo style:", error);
        throw new Error("Failed to analyze the logo's style.");
    }
};

export const generateHolidayImage = async (
    logoB64: string, 
    logoMimeType: string, 
    holiday: Holiday, 
    country: string, 
    logoAnalysis: string, 
    style: string,
    blankCanvasB64?: string,
    blankCanvasMimeType?: string
): Promise<{b64: string, mimeType: string}> => {
    try {
        // Check if we have complete holiday details, fetch from cache if missing
        if (!holiday.clothing || !holiday.locations || !holiday.activities) {
            try {
                const fullDetails = await getCachedOrFetchHolidayDetails(country, holiday.name_en);
                holiday = { ...holiday, ...fullDetails };
            } catch (detailsError) {
                console.error('Failed to get holiday details:', detailsError);
                throw new Error(`Failed to get complete details for ${holiday.name_en}. Please try again.`);
            }
        }
        
        // Ensure all required fields are present
        if (!holiday.locations || !holiday.timeOfDay || !holiday.activities || 
            !holiday.visualSymbols || !holiday.elements || !holiday.colorPalette || 
            !holiday.clothing || holiday.flagIsProminent === undefined) {
            throw new Error(`Missing required holiday details for ${holiday.name_en}. Details fetching may have failed.`);
        }
        
        const flagInstruction = holiday.flagIsProminent
            ? `**FLAG ACCURACY**: The flag of ${country} is a key symbol for this holiday and MUST be included prominently. It must be depicted with 100% accuracy. Do not flip, invert, distort, or alter it.`
            : `**FLAG USAGE**: The flag of ${country} is NOT a typical symbol for this holiday. Do NOT include the flag in the scene.`;

        const styleInstruction = style !== 'Default'
            ? `The overall mood and aesthetic must be strongly influenced by this guiding style: **${style}**.`
            : `The style should be a standard, photorealistic festive representation.`;

        const textPrompt = `Create a cinematic, professional scene celebrating '${holiday.name_en}' in ${country}. 

SCENE COMPOSITION:
- Setting: ${holiday.locations} during ${holiday.timeOfDay}
- Activities: Show ${holiday.activities} in progress
- Visual Elements: Feature ${holiday.visualSymbols} and ${holiday.elements}
- Color Palette: Use ${holiday.colorPalette} as the dominant color scheme
- Style: The scene should complement the logo's style: '${logoAnalysis}'
- Mood: ${styleInstruction}

CRITICAL REQUIREMENTS:
1. **ASPECT RATIO**: The final image MUST have a 16:9 aspect ratio (landscape format).

2. **LOGO INTEGRATION**: The brand logo is the HERO element. It MUST be:
   - Displayed prominently and clearly visible
   - Preserved with 100% accuracy - original shape, colors, and proportions
   - NOT altered, redrawn, or reinterpreted in any way
   - Integrated naturally into the scene (e.g., on banners, projections, or displays)

3. **PEOPLE & AGE RESTRICTIONS**:
   ⚠️ ABSOLUTELY NO CHILDREN, MINORS, OR YOUNG PEOPLE UNDER 18
   - The scene must ONLY feature ADULTS (18+ years old) if any people are shown
   - All people must have clearly adult features and mature appearance
   - NO babies, toddlers, children, teenagers, or anyone who could appear underage
   - When depicting families, show ONLY adult family members (parents, grandparents, adult siblings)
   - For festive crowds, ensure ALL individuals are clearly adults

4. **CULTURAL AUTHENTICITY**:
   - Location must reflect: ${holiday.locations}
   - Time setting must be: ${holiday.timeOfDay}
   - If ADULT people are shown, they MUST wear: "${holiday.clothing}"
   - Cultural elements must be accurate and respectful
   - Focus on adult participants in traditional celebrations

5. **VISUAL QUALITY**:
   - Cinematic lighting appropriate for ${holiday.timeOfDay}
   - Professional composition with depth and atmosphere
   - If adults are depicted, faces must be realistic with natural expressions
   - Mature, sophisticated visual treatment

6. ${flagInstruction}

7. **CANVAS CONFORMITY**: The output MUST match the exact 16:9 dimensions of the provided blank canvas template.`;
        
        // Create a blank 16:9 canvas to enforce aspect ratio
        const blankCanvas = blankCanvasB64 && blankCanvasMimeType 
            ? { b64: blankCanvasB64, mimeType: blankCanvasMimeType }
            : createBlankImageB64();
        
        const parts: any[] = [
            { inlineData: { data: logoB64, mimeType: logoMimeType } },
            // IMPORTANT: The blank canvas serves as a size/aspect ratio template for the output
            // Gemini will generate an image that matches this canvas's 16:9 dimensions
            { inlineData: { data: blankCanvas.b64, mimeType: blankCanvas.mimeType } },
            { text: textPrompt },
        ];
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: parts,
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        if (!response.candidates?.[0]?.content?.parts) {
            throw new Error("Invalid response structure from image generation");
        }
        
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType) {
            return {
                b64: part.inlineData.data,
                mimeType: part.inlineData.mimeType,
            };
          }
        }
        throw new Error("No image was generated from the composition step.");

    } catch (error) {
        console.error("Error generating holiday image:", error);
        throw new Error("Failed to generate the holiday image.");
    }
};

const VIDEO_PROMPT_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        shot: {
            type: Type.OBJECT,
            properties: {
                composition: { type: Type.STRING, description: "Camera setup and framing (e.g., 'Wide establishing shot, 24mm lens on gimbal stabilizer', 'Medium shot, 50mm lens on tripod', 'Aerial drone shot with slow descent'). Specify lens, mount, and framing." },
                camera_motion: { type: Type.STRING, description: "8-second camera movement path (e.g., 'Smooth dolly push-in from wide to medium', 'Static locked-off shot', 'Slow circular orbit around subject'). Must complete within 8 seconds." },
                frame_rate: { type: Type.STRING, description: "Frame rate specification (e.g., '24fps for cinematic feel', '30fps standard', '60fps with 50% slow-motion for dreamy effect')." },
                film_grain: { type: Type.STRING, description: "Visual texture and color treatment (e.g., 'Clean digital with warm festive LUT', 'Film-emulated grain for nostalgic feel', 'HDR with vibrant saturation')." }
            },
            required: ["composition", "camera_motion", "frame_rate", "film_grain"]
        },
        subject: {
            type: Type.OBJECT,
            properties: {
                people: { type: Type.STRING, description: "ADULTS ONLY (18+): Detailed description of adult participants with mature features. NO CHILDREN or anyone under 18. Specify clear adult characteristics. NULL if no people in shot." },
                wardrobe: { type: Type.STRING, description: "Complete traditional holiday attire for ADULT participants only. Include colors, textures, accessories. NULL if no people." },
                character_consistency: { type: Type.STRING, description: "Key identifying features of ADULT characters to maintain throughout. NULL if no people." }
            },
            required: ["people", "wardrobe", "character_consistency"]
        },
        logo_display: {
            type: Type.OBJECT,
            properties: {
                integration_method: { type: Type.STRING, description: "How logo appears in EVERY frame (e.g., 'Mounted on festival banner center frame', 'Projected onto building wall', 'Printed on flags throughout shot'). Must be on PHYSICAL object." },
                visibility_throughout: { type: Type.STRING, description: "Exactly how logo STAYS visible for full 8 seconds (e.g., 'Banner remains in frame as camera dollies in', 'Logo on building stays centered during orbit', 'Multiple flag instances ensure constant visibility')." },
                physical_behavior: { type: Type.STRING, description: "Realistic logo physics (e.g., 'Gentle fabric ripple in breeze', 'Stable on rigid signage', 'Natural perspective shift with camera angle'). NO magical effects." }
            },
            required: ["integration_method", "visibility_throughout", "physical_behavior"]
        },
        scene: {
            type: Type.OBJECT,
            properties: {
                location: { type: Type.STRING, description: "Specific celebration venue (e.g., 'Historic town square with cobblestones', 'Beachfront at sunset', 'Decorated family courtyard')." },
                time_of_day: { type: Type.STRING, description: "Exact time setting affecting lighting (e.g., 'Golden hour at 6pm', 'Midnight under full moon', 'Dawn at 5:30am')." },
                environment: { type: Type.STRING, description: "Atmospheric details and weather (e.g., 'Light snow falling, warm streetlights glowing', 'Clear night with fireworks launching', 'Morning mist with birds')." }
            },
            required: ["location", "time_of_day", "environment"]
        },
        visual_details: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, description: "The continuous 8-second action (e.g., 'Crowd gathers as fireworks build to climax', 'Dancers perform traditional routine', 'Family lights ceremonial candles in sequence')." },
                props: { type: Type.STRING, description: "All visible festive props and decorations (e.g., 'Paper lanterns, flower garlands, traditional altar', 'National flags, confetti cannons, stage setup')." },
                holiday_elements: { type: Type.STRING, description: "Specific cultural symbols and decorations that identify this holiday." },
                physics: { type: Type.STRING, description: "Natural physical dynamics (e.g., 'Confetti floating down, fabric swaying, candle flames flickering')." }
            },
            required: ["action", "props", "holiday_elements", "physics"]
        },
        cinematography: {
            type: Type.OBJECT,
            properties: {
                lighting: { type: Type.STRING, description: "Complete lighting setup (e.g., 'Natural golden hour with warm key light, cool shadow fill, practical festival lights adding depth')." },
                color_grading: { type: Type.STRING, description: "Color treatment and mood (e.g., 'Warm amber highlights with cool blue shadows, slightly desaturated for cinematic feel')." },
                depth_of_field: { type: Type.STRING, description: "Focus approach (e.g., 'Shallow f/2.8 with dreamy bokeh', 'Deep focus f/8 keeping all planes sharp', 'Focus pull from foreground to logo at 4 seconds')." },
                tone: { type: Type.STRING, description: "Overall visual mood (e.g., 'Celebratory and vibrant', 'Intimate and warm', 'Epic and grand')." }
            },
            required: ["lighting", "color_grading", "depth_of_field", "tone"]
        },
        audio: {
            type: Type.OBJECT,
            properties: {
                music: { type: Type.STRING, description: "Single continuous 8-second music piece (e.g., 'Traditional folk melody building to festive crescendo', 'Orchestral celebration theme with cultural instruments')." },
                ambient: { type: Type.STRING, description: "Environmental soundscape layer (e.g., 'Crowd murmur growing louder, distant fireworks popping', 'Ocean waves, seabirds, festival preparation sounds')." },
                sound_effects: { type: Type.STRING, description: "Key synchronized sound moments (e.g., 'Firework launches at 2 and 5 seconds', 'Bell chimes at 3-second mark', 'Cheers erupting at 6 seconds')." },
                logo_audio: { type: Type.STRING, description: "Subtle logo-related sound if any (e.g., 'Soft fabric rustle', 'Gentle wind across banner'). Keep natural and quiet." }
            },
            required: ["music", "ambient", "sound_effects", "logo_audio"]
        },
        color_palette: {
            type: Type.STRING,
            description: "Dominant colors in order of prominence (e.g., 'Warm golds and reds with white accents and deep blue shadows')."
        },
        visual_rules: {
            type: Type.OBJECT,
            properties: {
                required_elements: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "MANDATORY elements for every shot. Must include at minimum: ['Logo visible in every single frame', 'Logo on physical object not floating', 'Culturally accurate clothing if people shown', 'Authentic holiday symbols', 'Natural physics throughout']."
                },
                prohibited_elements: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "STRICTLY FORBIDDEN elements. Must include at minimum: ['Children or anyone under 18', 'Babies or toddlers', 'Teenagers or minors', 'Logo fading or disappearing', 'Logo leaving frame', 'Magical glowing on realistic objects', 'Floating or ethereal logos', 'Supernatural effects on flags/symbols', 'Fantasy particles', 'Unrealistic transformations', 'Text overlays or subtitles']."
                }
            },
            required: ["required_elements", "prohibited_elements"]
        }
    },
    required: ["shot", "subject", "logo_display", "scene", "visual_details", "cinematography", "audio", "color_palette", "visual_rules"]
};

export const generateVideoPromptJson = async (holiday: Holiday, country: string, style: string): Promise<string> => {
    try {
        // Check if we have complete holiday details, fetch from cache if missing
        if (!holiday.clothing || !holiday.locations || !holiday.activities) {
            const fullDetails = await getCachedOrFetchHolidayDetails(country, holiday.name_en);
            holiday = { ...holiday, ...fullDetails };
        }
        
        const flagInstruction = holiday.flagIsProminent
            ? `National flag of ${country} MUST be featured as a prominent prop with 100% accurate colors and design.`
            : `National flag should NOT be included as it's not traditional for this holiday.`;
        
        const styleInstruction = style !== 'Default'
            ? `Apply a ${style} aesthetic to all visual choices while respecting cultural authenticity.`
            : `Use standard cinematic treatment with natural, festive tones.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `You are a world-class cinematographer creating a single continuous 8-second shot for a premium brand holiday video. Generate a detailed JSON shot description for the Veo 3.0 video model to animate an image celebrating '${holiday.name_en}' in ${country}.

📽️ SHOT SPECIFICATIONS: ONE CONTINUOUS 8-SECOND TAKE

PRODUCTION DETAILS:
Holiday: "${holiday.name_en}" - ${holiday.description_en}
Location: ${country}
Duration: Exactly 8 seconds, single continuous shot
Hero Element: Brand logo visible in EVERY frame

CULTURAL CONTEXT:
- Locations: ${holiday.locations}
- Peak Time: ${holiday.timeOfDay}
- Activities: ${holiday.activities}
- Visual Symbols: ${holiday.visualSymbols}
- Props/Elements: ${holiday.elements}
- Colors: ${holiday.colorPalette}
- Traditional Attire: ${holiday.clothing}
- Soundscape: ${holiday.soundEffects}
- Music Style: ${holiday.musicStyles}

STYLE DIRECTION: ${styleInstruction}

🎬 SINGLE-SHOT REQUIREMENTS:

1. CAMERA APPROACH:
   - Design ONE continuous camera move that tells a complete story in 8 seconds
   - Choose appropriate lens (24mm wide, 50mm standard, 85mm portrait, etc.)
   - Camera motion should be smooth and purposeful (dolly, crane, orbit, or static)
   - Frame rate: 24fps for cinematic, 30fps standard, or mixed with slow-mo sections

2. LOGO INTEGRATION (CRITICAL):
   ⚠️ Logo MUST be visible in EVERY FRAME of the 8-second shot
   - Place logo on a PHYSICAL OBJECT that stays in frame (banner, building, multiple flags, signage)
   - Design camera movement that keeps logo visible throughout
   - Logo should feel naturally integrated, not digitally overlaid
   - Physical behavior only: fabric movement, perspective shifts, natural lighting

3. SHOT COMPOSITION:
   - Start with a compelling opening frame that immediately establishes context
   - Design movement/action that builds to a climax around 6-7 seconds
   - End on a satisfying final frame at 8 seconds
   - Consider depth layers: foreground, midground, background

4. SUBJECT & ACTION:
   - If people are included: ADULTS ONLY (18+) - Describe mature adults with clear adult features
   - NO CHILDREN, teenagers, or anyone who could appear under 18 years old
   - Adults should wear traditional ${holiday.clothing}
   - Primary action should tell the holiday story (e.g., lighting ceremony, dance performance, fireworks launch)
   - Action must complete within 8 seconds

5. LOCATION & ATMOSPHERE:
   - Choose ONE specific location from: ${holiday.locations}
   - Set at optimal time: ${holiday.timeOfDay}
   - Include weather/atmospheric elements that enhance mood

6. VISUAL AUTHENTICITY:
   - ${flagInstruction}
   - Feature key activities: ${holiday.activities}
   - Include authentic symbols: ${holiday.visualSymbols}
   - Color palette based on: ${holiday.colorPalette}

7. CINEMATOGRAPHY DETAILS:
   - Lighting: Natural or motivated by scene (golden hour, fireworks, candles, etc.)
   - Depth of field: Choose based on story needs (shallow for intimacy, deep for spectacle)
   - Color grading: ${style !== 'Default' ? style + ' aesthetic' : 'Natural festive warmth'}
   
8. AUDIO DESIGN:
   - ONE continuous music track: ${holiday.musicStyles} style, 8 seconds
   - Layer ambient sounds: ${holiday.soundEffects}
   - Time specific sound effects to action moments
   - Logo audio should be subtle and realistic (fabric, wind, etc.)

9. PHYSICS & REALISM:
   ✅ REQUIRED: Natural physics, real shadows, authentic materials, practical effects
   ❌ PROHIBITED: Magical glows, floating objects, fantasy particles, supernatural effects, logo fading/disappearing

Remember: This is ONE CONTINUOUS 8-SECOND SHOT where the logo never leaves frame. Think "premium commercial cinematography" with cultural authenticity.

⚠️ FINAL CRITICAL REQUIREMENT: NO CHILDREN OR MINORS
The shot must NOT include any children, babies, teenagers, or anyone who could appear under 18 years old. If people are shown, they must be clearly mature adults with adult features. This is an absolute requirement for video generation compatibility.

Output a valid JSON object following the single-shot schema.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: VIDEO_PROMPT_SCHEMA,
            },
        });
        
        const jsonStr = response.text?.trim();
        if (!jsonStr) {
            throw new Error("No response received from AI");
        }
        return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch (error) {
        console.error("Error generating video prompt:", error);
        throw new Error("Failed to generate video animation prompt.");
    }
};

export const refineVideoPromptJson = async (currentJson: string, userInstructions: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a professional cinematographer refining a single 8-second shot description. Apply the director's notes while maintaining all technical requirements.

Director's Notes: "${userInstructions}"

Current Shot JSON:
${currentJson}

⚠️ CRITICAL CONSTRAINTS (MUST NOT BE VIOLATED):
1. **Single Shot**: This is ONE continuous 8-second take, NOT multiple scenes
2. **Logo Visibility**: Logo MUST be visible in EVERY FRAME on a PHYSICAL object
3. **NO CHILDREN**: Absolutely NO people under 18 - adults only if people are shown
4. **Duration**: Exactly 8 seconds of continuous action
5. **Realism**: NO magical effects, everything must obey real physics
6. **Audio**: ONE continuous music track for the full 8 seconds

EDITING GUIDELINES:
1. Apply director's notes to the relevant JSON sections
2. Maintain single-shot structure (no scene breaks or cuts)
3. If logo placement changes, ensure it stays visible throughout
4. Keep professional cinematography terminology
5. Preserve cultural authenticity
6. Maintain realistic physics and lighting

SINGLE-SHOT SCHEMA REFERENCE:
- shot: Camera setup (composition, motion, frame_rate, film_grain)
- subject: People details (people, wardrobe, character_consistency) - can be null
- logo_display: How logo stays visible (integration_method, visibility_throughout, physical_behavior)
- scene: Location details (location, time_of_day, environment)
- visual_details: Action and props (action, props, holiday_elements, physics)
- cinematography: Visual treatment (lighting, color_grading, depth_of_field, tone)
- audio: Sound design (music, ambient, sound_effects, logo_audio)
- color_palette: Dominant colors
- visual_rules: Required and prohibited elements

VALIDATION CHECKLIST:
✓ Still a single continuous shot?
✓ Logo visible throughout entire 8 seconds?
✓ NO children, teenagers, or minors included?
✓ Action completes within 8 seconds?
✓ All effects realistic and grounded?
✓ Audio described as continuous?

Apply the requested changes while maintaining the single-shot format. Return the updated JSON only.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: VIDEO_PROMPT_SCHEMA,
            },
        });

        const jsonStr = response.text?.trim();
        if (!jsonStr) {
            throw new Error("No response received from AI");
        }
        return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch (error) {
        console.error("Error refining video prompt:", error);
        throw new Error("Failed to apply changes to the animation script.");
    }
};

export const generateVideo = async (imageB64: string, imageMimeType: string, prompt: string): Promise<string> => {
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.0-fast-generate-001', //veo-3.0-fast-generate-001',
            prompt: prompt,
            image: {
                imageBytes: imageB64,
                mimeType: imageMimeType,
            },
            config: {
                aspectRatio: "16:9", 
                numberOfVideos: 1,
                negativePrompt: "low quality, pixelated, blurry, deformed logo, distorted logo, logo disappearing, logo fading out, logo leaving frame, obscured logo, hidden logo, warped branding, incorrect flag colors, inverted flag, distorted national symbols, deformed faces, uncanny valley, creepy expressions, distorted hands, extra limbs, morphing objects, inconsistent lighting, jarring transitions, abrupt cuts, audio desync, flickering, glitchy effects, culturally inaccurate clothing, wrong traditional attire, inappropriate gestures, child-like features, oversaturated, washed out colors, amateur composition, shaky camera, motion blur on logo, text artifacts, watermarks, inappropriate content"
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        // Debug logging to understand the response structure
        console.log("Operation completed. Full operation object:", JSON.stringify(operation, null, 2));
        console.log("Operation.response:", operation.response);
        console.log("Operation.response?.generatedVideos:", operation.response?.generatedVideos);
        
        let downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            // Try alternative paths that might contain the video URL
            // Using 'any' type to explore the actual response structure
            const resp = operation.response as any;
            const alternativeLink = resp?.videos?.[0]?.uri || 
                                   resp?.video?.uri || 
                                   resp?.uri ||
                                   resp?.generatedVideos?.[0]?.uri;
            
            if (alternativeLink) {
                console.log("Found video at alternative path:", alternativeLink);
                downloadLink = alternativeLink;
            } else {
                console.error("Could not find video URI in response. Full response structure:", JSON.stringify(operation.response, null, 2));
                throw new Error("Video generation completed, but no download link was found.");
            }
        }
        
        const response = await fetch(`${downloadLink}&key=${process.env.GEMINI_API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch video file: ${response.statusText}`);
        }
        const videoBlob = await response.blob();
        const arrayBuffer = await videoBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer.toString('base64');
    } catch (error) {
        console.error("Error generating video:", error);
        throw new Error("An error occurred during video generation.");
    }
};
