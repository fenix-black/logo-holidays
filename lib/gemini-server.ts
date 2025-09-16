import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { Holiday } from './types';

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

export const fetchHolidays = async (country: string): Promise<Holiday[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a cultural expert and cinematographer. List the top 8 most popular and visually distinct holidays in ${country}. For each holiday, provide comprehensive details that would help create a professional video production.

For each holiday, provide ALL of the following details:
- The holiday name in both English and Spanish
- A concise description of what the holiday celebrates
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
                        holidays: {
                            type: Type.ARRAY,
                            items: {
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
        console.error("Error fetching holidays:", error);
        throw new Error("Failed to fetch holidays from AI.");
    }
};

export const analyzeLogoStyle = async (logoB64: string, logoMimeType: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: {
                parts: [
                    { inlineData: { data: logoB64, mimeType: logoMimeType } },
                    { text: "Analyze the provided logo. Describe its style (e.g., modern, minimalist, vintage, playful), color palette, and overall theme in a concise phrase of 10-15 words." },
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

3. **CULTURAL AUTHENTICITY**:
   - Location must reflect: ${holiday.locations}
   - Time setting must be: ${holiday.timeOfDay}
   - If people are shown, they MUST wear: "${holiday.clothing}"
   - Cultural elements must be accurate and respectful

4. **VISUAL QUALITY**:
   - Cinematic lighting appropriate for ${holiday.timeOfDay}
   - Professional composition with depth and atmosphere
   - If people are depicted, faces must be realistic with natural expressions
   - NO children in the scene

5. ${flagInstruction}

6. **CANVAS CONFORMITY**: The output MUST match the exact 16:9 dimensions of the provided blank canvas template.`;
        
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
        overall_treatment: { 
            type: Type.STRING, 
            description: `Overall creative treatment and mood for the entire 8-second video (e.g., 'Cinematic patriotic celebration with warm golden tones', 'Magical winter wonderland with ethereal atmosphere').` 
        },
        scenes: {
            type: Type.ARRAY,
            description: "EXACTLY 2 scenes for the 8-second video. Scene 1: 0-4 seconds, Scene 2: 4-8 seconds.",
            minItems: 2,
            maxItems: 2,
            items: {
                type: Type.OBJECT,
                properties: {
                    shot: {
                        type: Type.OBJECT,
                        properties: {
                            composition: { type: Type.STRING, description: "Camera framing and lens choice (e.g., 'Wide establishing shot, 24mm lens', 'Extreme close-up on logo, 85mm macro lens')." },
                            camera_motion: { type: Type.STRING, description: "Camera movement description (e.g., 'Slow dolly-in', 'Smooth crane shot ascending', 'Static tripod shot', 'Handheld following action')." },
                            frame_rate: { type: Type.STRING, description: "Frame rate for the shot (e.g., '24fps for cinematic', '60fps for slow-motion reveal', '30fps standard')." },
                            depth_of_field: { type: Type.STRING, description: "Focus characteristics (e.g., 'Shallow DOF with bokeh background', 'Deep focus keeping all elements sharp', 'Rack focus from foreground to logo')." }
                        },
                        required: ["composition", "camera_motion", "frame_rate", "depth_of_field"]
                    },
                    subject: {
                        type: Type.OBJECT,
                        properties: {
                            people: { type: Type.STRING, description: "Description of any people in the scene including age, ethnicity, and appearance. NULL if no people." },
                            wardrobe: { type: Type.STRING, description: "Traditional holiday attire and costume details. NULL if no people." },
                            character_actions: { type: Type.STRING, description: "What the people are doing (e.g., 'dancing traditional folk dance', 'lighting candles'). NULL if no people." }
                        },
                        required: ["people", "wardrobe", "character_actions"]
                    },
                    scene: {
                        type: Type.OBJECT,
                        properties: {
                            location: { type: Type.STRING, description: "Where the scene takes place (e.g., 'Town square with colonial architecture', 'Modern living room decorated for holidays')." },
                            time_of_day: { type: Type.STRING, description: "Time setting (e.g., 'Golden hour sunset', 'Midnight fireworks', 'Dawn breaking')." },
                            environment: { type: Type.STRING, description: "Environmental details and atmosphere (e.g., 'Snow gently falling, warm window lights glowing', 'Confetti floating in air, festive banners swaying')." }
                        },
                        required: ["location", "time_of_day", "environment"]
                    },
                    logo_integration: {
                        type: Type.OBJECT,
                        properties: {
                            placement: { type: Type.STRING, description: "CRITICAL: Where the logo stays CONTINUOUSLY VISIBLE throughout the entire scene (e.g., 'Fixed center frame on solid banner', 'Persistent upper third as part of architectural element', 'Mounted on visible flagpole throughout'). Logo must NEVER exit, fade, or be obscured. Keep it REALISTIC - no floating logos." },
                            animation: { type: Type.STRING, description: "REALISTIC logo movement WHILE REMAINING VISIBLE (e.g., 'Gentle sway with banner in breeze', 'Stable with natural light reflections', 'Slight perspective shift with camera'). AVOID: magical glows, supernatural pulsing, fading, dissolving, or unrealistic effects. Keep it NATURAL and PHYSICAL." },
                            interaction: { type: Type.STRING, description: "How scene elements REALISTICALLY interact with the ALWAYS-VISIBLE logo (e.g., 'Natural shadows cast across logo surface', 'Confetti physically falls in front and behind', 'Reflected in wet surfaces'). NO magical particles, ethereal glows, or supernatural effects." }
                        },
                        required: ["placement", "animation", "interaction"]
                    },
                    visual_details: {
                        type: Type.OBJECT,
                        properties: {
                            primary_action: { type: Type.STRING, description: "Main action happening in the scene (e.g., 'Fireworks exploding in synchronized patterns', 'Traditional dancers circling the plaza')." },
                            props: { type: Type.STRING, description: "Key props and objects visible (e.g., 'Ornate candelabras, flower garlands, traditional instruments', 'National flag, festive banners')." },
                            physics: { type: Type.STRING, description: "Physical dynamics and particle effects (e.g., 'Confetti drifting on warm breeze', 'Sparklers leaving light trails', 'Fabric rippling in wind')." },
                            holiday_elements: { type: Type.STRING, description: "Specific holiday symbols and decorations featured prominently in this scene." }
                        },
                        required: ["primary_action", "props", "physics", "holiday_elements"]
                    },
                    cinematography: {
                        type: Type.OBJECT,
                        properties: {
                            lighting: { type: Type.STRING, description: "Lighting setup and quality (e.g., 'Warm golden key light from sunset, blue fill from twilight sky', 'Dramatic rim lighting with lens flares')." },
                            color_grading: { type: Type.STRING, description: "Color treatment (e.g., 'Warm amber tones with teal shadows', 'Desaturated with selective color on logo', 'Vibrant festival colors')." },
                            visual_tone: { type: Type.STRING, description: "Overall visual mood (e.g., 'Nostalgic and warm', 'Epic and grand', 'Intimate and cozy', 'Energetic and vibrant')." }
                        },
                        required: ["lighting", "color_grading", "visual_tone"]
                    },
                    audio: {
                        type: Type.OBJECT,
                        properties: {
                            music_style: { type: Type.STRING, description: "CONTINUOUS music that flows across the entire 8-second video (e.g., 'Sustained orchestral celebration theme', 'Continuous traditional folk melody', 'Uninterrupted festive anthem'). Do NOT specify starts/stops - music plays throughout." },
                            primary_sounds: { type: Type.STRING, description: "Sound effects that LAYER OVER the continuous music (e.g., 'Firework bursts over music', 'Crowd cheers blending with soundtrack', 'Bells accenting the melody')." },
                            ambient: { type: Type.STRING, description: "Environmental sounds that ADD TO the music bed (e.g., 'Gentle crowd murmur beneath music', 'Soft wind ambience under soundtrack', 'Distant celebration atmosphere')." },
                            logo_sound: { type: Type.STRING, description: "REALISTIC, SUBTLE sound for logo interactions (e.g., 'Fabric rustling as banner moves', 'Soft wooden creak', 'Natural wind whoosh'). AVOID magical/fantasy sounds. Must blend naturally with continuous music." }
                        },
                        required: ["music_style", "primary_sounds", "ambient", "logo_sound"]
                    },
                    transition: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, description: "QUICK transition to Scene 2 (e.g., 'Instant cut', 'Fast cross-dissolve', 'Quick match cut on logo'). NULL for Scene 2 (last scene). Avoid slow transitions in 8-second format." },
                            duration: { type: Type.STRING, description: "MUST be under 0.5 seconds for 8-second video (e.g., '0.2 second cut', '0.3 second dissolve', 'Instant'). NULL for Scene 2 (last scene)." }
                        },
                        required: ["type", "duration"]
                    }
                },
                required: ["shot", "subject", "scene", "logo_integration", "visual_details", "cinematography", "audio", "transition"]
            }
        }
    },
    required: ["overall_treatment", "scenes"]
};

export const generateVideoPromptJson = async (holiday: Holiday, country: string, style: string): Promise<string> => {
    try {
        const flagInstruction = holiday.flagIsProminent
            ? `The flag of ${country} is a KEY SYMBOL for this holiday and MUST be featured prominently with 100% accuracy in props and visual elements.`
            : `The flag of ${country} is NOT traditionally used in this celebration and should NOT be included in any scene.`;
        
        const styleInstruction = style !== 'Default'
            ? `ALL cinematography choices, color grading, and visual tone MUST reflect a **${style}** aesthetic throughout every scene. Adapt the traditional color palette of "${holiday.colorPalette}" to align with the ${style} style.`
            : `Use the traditional color palette of "${holiday.colorPalette}" with standard festive cinematography.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `You are an award-winning cinematographer creating a shot list for an 8-SECOND premium brand holiday video. Generate a cinematic JSON prompt for the Veo 3.0 video model to animate an image celebrating '${holiday.name_en}' in ${country}.

⏱️ CRITICAL TIMING CONSTRAINT: Total video duration is EXACTLY 8 SECONDS

PRODUCTION BRIEF:
Holiday: "${holiday.name_en}" - ${holiday.description_en}
Location: ${country}
Duration: 8 seconds total
Brand Focus: Logo MUST be clearly visible in EVERY SINGLE FRAME

CULTURAL REFERENCE:
- Traditional Locations: ${holiday.locations}
- Time Settings: ${holiday.timeOfDay}
- Key Activities: ${holiday.activities}
- Visual Symbols: ${holiday.visualSymbols}
- Decorative Elements: ${holiday.elements}
- Color Palette: ${holiday.colorPalette}
- Traditional Wardrobe: ${holiday.clothing}
- Soundscape: ${holiday.soundEffects}
- Music: ${holiday.musicStyles}

CREATIVE DIRECTION:
${styleInstruction}

🎬 MANDATORY REQUIREMENTS FOR 8-SECOND VIDEO:

1. SCENE COUNT: Create EXACTLY 2 SCENES
   - Scene 1: 0-4 seconds (Establishing shot with logo introduction)
   - Scene 2: 4-8 seconds (Climactic celebration with logo prominence)
   - Transition between scenes should be smooth and quick (under 0.5 seconds)

2. LOGO VISIBILITY & REALISM - ABSOLUTELY CRITICAL:
   ⚠️ The brand logo MUST be CLEARLY VISIBLE in EVERY SINGLE FRAME of both scenes
   - Logo must appear on PHYSICAL OBJECTS (banners, flags, signs, buildings) - NO floating logos
   - Scene 1: Logo visible from first 0.5 seconds and REMAINS throughout
   - Scene 2: Logo continues visibility, NEVER leaves frame
   - REALISTIC animations only: natural movement with wind, camera perspective, lighting changes
   - PROHIBITED: Magical glowing, supernatural pulsing, ethereal effects, fading in/out, dissolving
   - Keep logo integration GROUNDED in physical reality

3. CINEMATOGRAPHY FOR SHORT FORMAT:
   - Avoid overly complex camera moves that take too long
   - Use establishing shots that immediately show context (no slow reveals)
   - Frame rates: 24fps for standard, 48-60fps ONLY for specific slow-mo moments
   - Keep depth of field consistent within scenes for clarity

4. AUDIO CONTINUITY FOR 8 SECONDS:
   - Music: Use ONE continuous musical phrase that spans the full 8 seconds
   - DO NOT specify "music starts" or "music ends" - it should flow throughout
   - Describe the music as a sustained mood (e.g., "Continuous festive ${holiday.musicStyles} melody throughout")
   - Sound effects should layer OVER the continuous music, not interrupt it
   - Logo sound should be subtle and not overpower the music continuity

5. SCENE LOCATIONS & TIMING:
   - Choose the MOST iconic location from: ${holiday.locations}
   - Set at peak celebration time: ${holiday.timeOfDay}
   - Both scenes can be in same location with different angles/perspectives

6. CULTURAL ELEMENTS & PHYSICAL REALISM:
   - Feature the MOST recognizable activity from: ${holiday.activities}
   - Include the MOST important symbols from: ${holiday.visualSymbols}
   - ${flagInstruction}
   - FLAGS & SYMBOLS: Must behave REALISTICALLY - natural fabric movement, proper physics
   - PROHIBITED on flags/symbols: Magical glows, supernatural auras, ethereal effects
   - All elements should exist in PHYSICAL SPACE with real-world physics

7. NARRATIVE ARC FOR 8 SECONDS:
   - Scene 1 (0-4 sec): Establish celebration atmosphere, introduce logo prominently
   - Scene 2 (4-8 sec): Peak festive moment with logo as hero element
   - The story should feel complete despite being brief

8. VISUAL EFFECTS PHILOSOPHY - KEEP IT REAL:
   ✅ ENCOURAGED: Natural lighting, real shadows, physical reflections, authentic weather effects, practical camera work
   ❌ PROHIBITED: Magical particles, supernatural glows on realistic objects, ethereal auras, fantasy effects on logos/flags, objects materializing from nothing, unrealistic transformations
   - Think "high-end commercial" NOT "fantasy film"
   - All visual effects should be achievable with real cameras and practical effects
   - Logos and flags are PHYSICAL OBJECTS that obey laws of physics

Remember: This is a REALISTIC 8-second celebration video where the logo must NEVER leave the frame. Every effect should be grounded in physical reality.

Output a valid JSON object using proper film production terminology.`,
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
            contents: `You are a professional cinematographer editing an 8-SECOND holiday video shot list. Your task is to modify the JSON based on the director's notes while maintaining strict requirements.

Director's Notes: "${userInstructions}"

Current Shot List JSON:
${currentJson}

⚠️ CRITICAL CONSTRAINTS (MUST NOT BE VIOLATED):
1. **Duration**: Video is EXACTLY 8 seconds - maintain 2 scenes only
2. **Logo Visibility**: Logo MUST remain visible in EVERY FRAME, on PHYSICAL objects (no floating logos)
3. **Audio Continuity**: Music must be ONE continuous phrase across 8 seconds
4. **Realism**: NO magical glows, supernatural effects, or fantasy elements on logos/flags
5. **Physics**: All elements must obey real-world physics (natural movement, gravity, wind)

EDITING GUIDELINES:
1. Apply the director's notes precisely to relevant sections
2. Maintain exactly 2 scenes (do not add or remove scenes)
3. PRESERVE logo visibility in every frame - if notes affect logo placement, ensure it remains constantly visible
4. Keep professional cinematography terminology
5. If audio changes are requested, maintain continuity (no abrupt starts/stops)
6. Cultural authenticity must remain intact

SCHEMA REFERENCE:
- overall_treatment: Overall creative vision for the 8-second piece
- scenes[]: EXACTLY 2 scene objects, each containing:
  - shot: Camera composition, motion, frame rate, depth of field
  - subject: People, wardrobe, character actions (can be null)
  - scene: Location, time of day, environment  
  - logo_integration: Placement (MUST be visible entire scene), animation, interaction
  - visual_details: Primary action, props, physics, holiday elements
  - cinematography: Lighting, color grading, visual tone
  - audio: Continuous music style, layered sounds, ambient, subtle logo sound
  - transition: Quick transition (<0.5 sec) between scenes, null for scene 2

VALIDATION CHECKLIST:
✓ Still exactly 2 scenes?
✓ Logo visible in every frame of both scenes?
✓ Audio described as continuous across 8 seconds?
✓ Transitions under 0.5 seconds?

Apply the requested changes while maintaining these constraints. Return the updated JSON object only.`,
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

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was found.");
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
