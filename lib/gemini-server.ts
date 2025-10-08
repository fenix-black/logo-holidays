import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { Holiday } from './types';
import { holidayService } from './holiday-service';

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
    
    // First, try to get details from our holiday service (pre-generated data)
    const holidayFromService = holidayService.getHolidayDetails(country, holidayName);
    if (holidayFromService) {
        console.log(`✓ Using holiday details from service for: ${cacheKey}`);
        
        // Store in cache for consistency
        evictOldestCacheEntry();
        holidayDetailsCache.set(cacheKey, {
            data: holidayFromService,
            timestamp: Date.now()
        });
        
        return holidayFromService;
    }
    
    // If not in service (e.g., new country/holiday), fall back to Gemini API
    console.log(`↻ Fetching fresh holiday details from Gemini for: ${cacheKey}`);
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
    compositeB64: string, 
    compositeMimeType: string, 
    holiday: Holiday, 
    country: string, 
    logoAnalysis: string, 
    style: string
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

        const textPrompt = `⛔ EXTREME AGE RESTRICTIONS: Generate ONLY fully-grown adults (25+ years old). ZERO tolerance for children, minors, teens, or young-looking people.

Create a cinematic, professional scene celebrating '${holiday.name_en}' in ${country}. 

SCENE COMPOSITION:
- Setting: ${holiday.locations} during ${holiday.timeOfDay}
- Activities: Show ${holiday.activities} in progress (performed by mature adults only)
- Visual Elements: Feature ${holiday.visualSymbols} and ${holiday.elements}
- Color Palette: Use ${holiday.colorPalette} as the dominant color scheme
- Style: The scene should complement the logo's style: '${logoAnalysis}'
- Mood: ${styleInstruction}

CRITICAL REQUIREMENTS:
1. **ASPECT RATIO**: The final image MUST have a 16:9 aspect ratio (landscape format).

2. **LOGO INTEGRATION**: The brand logo is the HERO element. It MUST be:
   - Displayed in 1-2 natural locations maximum (e.g., ONE main banner/sign, optionally ONE subtle secondary placement)
   - Preserved with 100% accuracy - original shape, colors, and proportions
   - NOT altered, redrawn, or reinterpreted in any way
   - Integrated naturally into the scene as if it belongs there
   - Do NOT repeat the logo excessively or create patterns with it

3. **ADULT-ONLY PEOPLE POLICY**:
   🚫 ZERO CHILDREN, MINORS, TEENS, OR YOUNG-LOOKING PEOPLE
   - If showing people: ONLY mature adults (25+ years old) with clearly adult features
   - Adult faces must have mature characteristics: defined jawlines, adult proportions
   - If depicting families: show "adult family gatherings" (parents 30+, grandparents, adult children 25+)
   - Multi-generational = adults of different ages (30s, 40s, 50s+), NOT children
   - Holiday crowds = mature adult celebrations, professional gatherings, adult communities
   - NO baby faces, childlike features, small statures, or youthful appearances

4. **CULTURAL AUTHENTICITY**:
   - Location must reflect: ${holiday.locations}
   - Time setting must be: ${holiday.timeOfDay}
   - If ADULT people are shown, they MUST wear: "${holiday.clothing}"
   - Cultural elements must be accurate and respectful
   - Focus on mature adult participants in traditional celebrations

5. **VISUAL QUALITY**:
   - Cinematic lighting appropriate for ${holiday.timeOfDay}
   - Professional composition with depth and atmosphere
   - If adults are depicted, faces must be realistic with natural expressions
   - Mature, sophisticated visual treatment befitting adult celebrations

6. ${flagInstruction}

7. **CANVAS CONFORMITY**: The output MUST match the exact 16:9 dimensions of the provided input image (1920x1080).

🚫 ABSOLUTE PROHIBITIONS:
- NO children, babies, toddlers, kids, minors, teenagers, young people, or anyone under 25
- NO small people, childlike faces, baby features, youthful appearances
- NO family scenes with children, parent-child interactions, or kid-focused activities
- NO school-age people, young adults, college-age, or anyone who looks young
- NO cute, innocent, or childlike elements that might imply minors
- When showing "families": ONLY show adult relatives (parents 30+, grandparents, adult siblings 25+)

FINAL ENFORCEMENT: This scene represents MATURE ADULT celebrations only. Zero tolerance for minors.`;
        
        // The composite image already contains the logo on a 16:9 canvas
        // This enforces the aspect ratio while giving Gemini full freedom to reposition the logo
        const parts: any[] = [
            { inlineData: { data: compositeB64, mimeType: compositeMimeType } },
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
        video_structure: {
            type: Type.OBJECT,
            properties: {
                total_scenes: { type: Type.NUMBER, description: "Number of scenes (maximum 2). Each scene should be 4 seconds for a total of 8 seconds." },
                transition: { type: Type.STRING, description: "How scenes connect (e.g., 'Smooth cut', 'Cross-dissolve', 'Match cut on action'). Only needed if 2 scenes." }
            },
            required: ["total_scenes", "transition"]
        },
        people_consistency: {
            type: Type.OBJECT,
            properties: {
                count: { type: Type.STRING, description: "EXACT number and description of people from the source image (e.g., '2 adult women', '1 adult man', 'no people'). MUST match source image exactly." },
                outfit_preservation: { type: Type.STRING, description: "EXACT clothing/outfits from source image. Every detail must be preserved (colors, styles, accessories). Critical: DO NOT change or add clothing." },
                //gender_preservation: { type: Type.STRING, description: "Gender identities that MUST remain consistent throughout video. NO transformations allowed (e.g., 'Woman remains woman', 'Man remains man')." },
                physical_features: { type: Type.STRING, description: "Key identifying features to maintain (hair color/style, skin tone, approximate age, body type). These CANNOT change between scenes." }
            },
            required: ["count", "outfit_preservation", "physical_features"]
        },
        logo_preservation: {
            type: Type.OBJECT,
            properties: {
                text_integrity: { type: Type.STRING, description: "Logo text must be 100% legible and undistorted. NEVER replace the brand name - use exact original text. Specify exact placement to avoid warping (e.g., 'On flat rigid surface', 'Center of banner with minimal fold')." },
                icon_integrity: { type: Type.STRING, description: "Logo icon/symbol must maintain exact proportions and shape. NO stretching, squashing, or perspective distortion beyond natural viewing angles." },
                color_integrity: { type: Type.STRING, description: "Logo colors must be preserved EXACTLY as in original. NO color changes, tinting, or filters that alter brand colors. Specify how original colors are maintained (e.g., 'Original blue and white preserved', 'Brand red stays consistent')." },
                placement_strategy: { type: Type.STRING, description: "Strategic placement across scenes to ensure visibility without distortion (e.g., 'Scene 1: on rigid signboard, Scene 2: on flat wall projection')." },
                size_consistency: { type: Type.STRING, description: "Logo must maintain readable size throughout. Specify minimum size relative to frame (e.g., 'At least 10% of frame width')." }
            },
            required: ["text_integrity", "icon_integrity", "color_integrity", "placement_strategy", "size_consistency"]
        },
        scenes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    scene_number: { type: Type.NUMBER, description: "Scene number (1 or 2)" },
                    duration: { type: Type.STRING, description: "Duration in seconds (e.g., '4 seconds' for 2-scene video, '8 seconds' for single scene)" },
                    shot: {
                        type: Type.OBJECT,
                        properties: {
                            composition: { type: Type.STRING, description: "Camera setup and framing. Specify lens, mount, and framing." },
                            camera_motion: { type: Type.STRING, description: "Camera movement for this scene duration." },
                            focus: { type: Type.STRING, description: "Focus approach and depth of field." }
                        },
                        required: ["composition", "camera_motion", "focus"]
                    },
                    subject_placement: {
                        type: Type.OBJECT,
                        properties: {
                            people: { type: Type.STRING, description: "EXACT people from source image with SAME outfits, genders, and count. If source has 2 women in red dresses, this MUST have 2 women in the SAME red dresses." },
                            positions: { type: Type.STRING, description: "Where people are positioned in frame." },
                            actions: { type: Type.STRING, description: "What people are doing (must be culturally appropriate)." }
                        },
                        required: ["people", "positions", "actions"]
                    },
                    logo_display: {
                        type: Type.OBJECT,
                        properties: {
                            method: { type: Type.STRING, description: "How logo appears WITHOUT distortion or color changes (e.g., 'On rigid signboard with original colors', 'Flat wall projection preserving brand colors', 'Center of taut banner')." },
                            visibility: { type: Type.STRING, description: "How logo remains visible, legible, and in original colors throughout scene." }
                        },
                        required: ["method", "visibility"]
                    },
                    environment: {
                        type: Type.OBJECT,
                        properties: {
                            location: { type: Type.STRING, description: "Specific setting for this scene." },
                            time: { type: Type.STRING, description: "Time of day affecting lighting." },
                            atmosphere: { type: Type.STRING, description: "Weather and environmental details." },
                            props: { type: Type.STRING, description: "Holiday-specific props and decorations." }
                        },
                        required: ["location", "time", "atmosphere", "props"]
                    },
                    action: { type: Type.STRING, description: "Main action happening in this scene." },
                    holiday_elements: { type: Type.STRING, description: "Cultural symbols and holiday-specific elements visible." }
                },
                required: ["scene_number", "duration", "shot", "subject_placement", "logo_display", "environment", "action", "holiday_elements"]
            },
            description: "Array of 1 or 2 scenes maximum. Each scene is 4 seconds if 2 scenes, or 8 seconds if 1 scene."
        },
        cinematography: {
            type: Type.OBJECT,
            properties: {
                visual_style: { type: Type.STRING, description: "Overall visual treatment and color grading." },
                lighting: { type: Type.STRING, description: "Lighting setup across scenes." },
                color_palette: { type: Type.STRING, description: "Dominant colors maintaining holiday theme." }
            },
            required: ["visual_style", "lighting", "color_palette"]
        },
        audio: {
            type: Type.OBJECT,
            properties: {
                music: { type: Type.STRING, description: "8-second music track covering all scenes." },
                ambient: { type: Type.STRING, description: "Environmental sounds." },
                effects: { type: Type.STRING, description: "Sound effects synchronized with action." }
            },
            required: ["music", "ambient", "effects"]
        },
        critical_rules: {
            type: Type.OBJECT,
            properties: {
                people_rules: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Rules for people consistency: ['Exact same number of people as source', 'Same genders - no transformations', 'Same outfits - no changes', 'Same physical features', 'Adults only (18+)']."
                },
                logo_rules: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Rules for logo integrity: ['NEVER replace or change the brand logo text', 'NEVER change the brand logo colors', 'Original logo text must be preserved exactly', 'Original logo colors must be preserved exactly', 'Text must be 100% legible', 'No warping or distortion', 'Icon maintains exact proportions', 'Visible in every frame', 'On physical objects only']."
                },
                prohibited: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Strictly forbidden: ['Replacing brand logo text', 'Changing logo colors', 'Changing logo wording', 'Changing people count', 'Gender transformations', 'Outfit changes', 'Logo distortion', 'Text warping', 'Children or minors', 'Magical effects', 'More than 2 scenes']."
                }
            },
            required: ["people_rules", "logo_rules", "prohibited"]
        }
    },
    required: ["video_structure", "people_consistency", "logo_preservation", "scenes", "cinematography", "audio", "critical_rules"]
};

// Schema for structured image analysis response
const IMAGE_PEOPLE_ANALYSIS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        peopleCount: { 
            type: Type.STRING, 
            description: "Exact number of people in image (e.g., '2 people', 'no people', '1 person', '3 people')" 
        },
        peopleDescription: { 
            type: Type.STRING, 
            description: "Brief description of people if present (e.g., 'two adult women', 'one adult man', 'no people visible')" 
        },
        outfits: { 
            type: Type.STRING, 
            description: "EXACT clothing details including colors, styles, patterns, accessories. Be very specific (e.g., 'red traditional sari with gold embroidery', 'blue suit with white shirt'). If no people: 'n/a - no people'" 
        },
        genders: { 
            type: Type.STRING, 
            description: "Clear gender presentation of each person (e.g., 'person 1: woman, person 2: man'). If no people: 'n/a - no people'" 
        },
        physicalFeatures: { 
            type: Type.STRING, 
            description: "Key identifying features - hair, age, build (e.g., 'woman 1: long black hair, 30s; man 1: short gray hair, 50s'). If no people: 'n/a - no people'" 
        }
    },
    required: ["peopleCount", "peopleDescription", "outfits", "genders", "physicalFeatures"]
};

/**
 * Analyzes a generated holiday image to extract details about people for video consistency
 */
export const analyzeImageForPeople = async (imageB64: string, imageMimeType: string): Promise<{
    peopleCount: string;
    peopleDescription: string;
    outfits: string;
    genders: string;
    physicalFeatures: string;
}> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { data: imageB64, mimeType: imageMimeType } },
                    { text: `Analyze this holiday celebration image and extract EXACT details about the people shown.

Your analysis will be used to maintain consistency in a video generation, so accuracy is critical.

Focus on:
- Exact count of people
- Their clothing and accessories (be very specific about colors and styles)
- Gender presentation as shown in image
- Physical characteristics that identify each person

If there are no people in the image, indicate "no people" for count and "n/a - no people" for other fields.` }
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: IMAGE_PEOPLE_ANALYSIS_SCHEMA,
            },
        });

        const jsonStr = response.text?.trim();
        if (!jsonStr) {
            throw new Error("No response received from image analysis");
        }
        
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error analyzing image for people:", error);
        // Return safe defaults if analysis fails
        return {
            peopleCount: "unable to determine",
            peopleDescription: "unable to determine", 
            outfits: "unable to determine",
            genders: "unable to determine",
            physicalFeatures: "unable to determine"
        };
    }
};

export const generateVideoPromptJson = async (holiday: Holiday, country: string, style: string, imageB64?: string, imageMimeType?: string): Promise<string> => {
    try {
        // Check if we have complete holiday details, fetch from cache if missing
        if (!holiday.clothing || !holiday.locations || !holiday.activities) {
            const fullDetails = await getCachedOrFetchHolidayDetails(country, holiday.name_en);
            holiday = { ...holiday, ...fullDetails };
        }

        // Analyze the image for people details if provided
        let peopleAnalysis = {
            peopleCount: "not specified",
            peopleDescription: "not specified",
            outfits: "traditional holiday attire",
            genders: "not specified",
            physicalFeatures: "not specified"
        };
        
        if (imageB64 && imageMimeType) {
            try {
                peopleAnalysis = await analyzeImageForPeople(imageB64, imageMimeType);
            } catch (analysisError) {
                console.error("Image analysis failed, using defaults:", analysisError);
            }
        }
        
        const flagInstruction = holiday.flagIsProminent
            ? `National flag of ${country} MUST be featured as a prominent prop with 100% accurate colors and design.`
            : `National flag should NOT be included as it's not traditional for this holiday.`;
        
        const styleInstruction = style !== 'Default'
            ? `Apply a ${style} aesthetic to all visual choices while respecting cultural authenticity.`
            : `Use standard cinematic treatment with natural, festive tones.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro", 
            contents: `You are a world-class cinematographer creating a video prompt for a premium brand holiday celebration. Generate a detailed JSON description for the Veo 3.0 video model to animate an image celebrating '${holiday.name_en}' in ${country}.

🎬 VIDEO SPECIFICATIONS
Duration: 8 seconds total
Structure: Maximum 2 scenes (can be 1 scene for 8 seconds OR 2 scenes of 4 seconds each)
Hero Element: Brand logo MUST be visible in EVERY frame without distortion

📸 SOURCE IMAGE ANALYSIS (CRITICAL - MUST MATCH EXACTLY):
- People Count: ${peopleAnalysis.peopleCount}
- People Description: ${peopleAnalysis.peopleDescription}
- Exact Outfits: ${peopleAnalysis.outfits}
- Genders (MUST NOT CHANGE): ${peopleAnalysis.genders}
- Physical Features: ${peopleAnalysis.physicalFeatures}

⚠️ ABSOLUTE REQUIREMENTS:
1. PEOPLE CONSISTENCY:
   - Use EXACT same number of people as in source image (${peopleAnalysis.peopleCount})
   - Preserve EXACT outfits - do not change any clothing details
   - Maintain SAME genders throughout - NO transformations
   - Keep same physical features (hair, age, build)
   
2. LOGO PRESERVATION:
   - NEVER replace or change the brand logo text - use EXACT original text
   - NEVER change the brand logo colors - preserve EXACT original colors
   - Logo text must be 100% legible - NO warping or distortion
   - Logo icon must maintain exact proportions
   - Logo colors must remain identical to original (no tinting, filtering, or color shifts)
   - Place on FLAT or rigid surfaces to avoid distortion
   - Ensure readable size (minimum 10% of frame width)
   - The actual brand name/text and colors in the logo must remain unchanged

3. SCENE STRUCTURE:
   - Maximum 2 scenes total
   - Each scene should be distinct but connected
   - Smooth transitions between scenes if using 2

CULTURAL CONTEXT:
Holiday: "${holiday.name_en}" - ${holiday.description_en}
Location: ${country}
- Locations: ${holiday.locations}
- Peak Time: ${holiday.timeOfDay}
- Activities: ${holiday.activities}
- Visual Symbols: ${holiday.visualSymbols}
- Props/Elements: ${holiday.elements}
- Colors: ${holiday.colorPalette}
- Traditional Attire: ${holiday.clothing} (BUT use exact outfits from image if people present)
- Soundscape: ${holiday.soundEffects}
- Music Style: ${holiday.musicStyles}

STYLE: ${styleInstruction}
${flagInstruction}

SCENE DESIGN GUIDELINES:
If 1 Scene (8 seconds):
- One continuous shot with smooth camera movement
- Logo visible throughout on stable surface
- Complete action arc within 8 seconds

If 2 Scenes (4 seconds each):
- Scene 1: Establishing shot with initial action
- Scene 2: Closer or different angle continuing/completing action
- Logo visible in both scenes on non-distorting surfaces
- Natural transition between scenes

CRITICAL PROHIBITIONS:
❌ Replacing or changing the brand logo text (must use EXACT original text)
❌ Changing the brand logo colors (must preserve EXACT original colors)
❌ Changing number of people from source
❌ Changing genders or transforming people
❌ Altering outfits from source image
❌ Logo text distortion or warping
❌ Logo color shifting, tinting, or filtering
❌ Logo disappearing or fading
❌ Children or anyone under 18
❌ More than 2 scenes
❌ Magical or supernatural effects

Output a valid JSON following the multi-scene schema with people_consistency and logo_preservation sections filled accurately.`,
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
            contents: `You are a professional cinematographer refining a video prompt. Apply the director's notes while maintaining all critical constraints.

Director's Notes: "${userInstructions}"

Current Video JSON:
${currentJson}

⚠️ ABSOLUTE CONSTRAINTS (NEVER VIOLATE):
1. **Maximum 2 Scenes**: Can be 1 scene (8 seconds) or 2 scenes (4 seconds each). NEVER more than 2.
2. **People Consistency**: 
   - EXACT same number of people as specified in people_consistency.count
   - NO gender changes - preserve exact genders
   - NO outfit changes - keep exact clothing from people_consistency.outfit_preservation
3. **Logo Integrity**:
   - NEVER replace or change the brand logo text - preserve EXACT original text
   - NEVER change the brand logo colors - preserve EXACT original colors
   - Text must be 100% legible - NO distortion
   - Icon must maintain proportions - NO warping
   - Colors must remain identical - NO tinting or filtering
   - Must be visible in EVERY frame
   - Place on FLAT/rigid surfaces only
4. **NO CHILDREN**: Adults only (18+) if people shown
5. **Duration**: Exactly 8 seconds total
6. **Realism**: NO magical effects, natural physics only

EDITING GUIDELINES:
1. Apply director's notes to relevant JSON sections
2. Maintain scene count (don't add scenes beyond 2)
3. Preserve all people_consistency details exactly
4. Ensure logo_preservation rules are followed
5. Keep cultural authenticity
6. Professional cinematography terminology

NEW SCHEMA STRUCTURE:
- video_structure: Scene count and transitions
- people_consistency: CRITICAL - preserve all details exactly
- logo_preservation: Text/icon integrity rules
- scenes: Array of 1-2 scene descriptions
- cinematography: Visual style across scenes
- audio: 8-second soundtrack
- critical_rules: Mandatory constraints

VALIDATION CHECKLIST:
✓ Maximum 2 scenes maintained?
✓ People count, genders, outfits unchanged?
✓ Logo text, colors, and icon unchanged?
✓ Logo colors preserved exactly as original?
✓ Logo visible in every frame?
✓ NO children, teenagers, or minors included?
✓ Action completes within 8 seconds?
✓ All effects realistic and grounded?
✓ Audio described as continuous?

Apply the requested changes while maintaining all constraints. Return the updated JSON only.`,
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
