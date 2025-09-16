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
            contents: `List the top 8 most popular and visually distinct holidays in ${country}. For each, provide: the name in English (name_en), the name translated to Spanish (name_es), a brief one-sentence description in English (description_en), the description translated to Spanish (description_es), typical clothing, key 'daily used' elements/items, typical sound effects, typical music styles, and a boolean value indicating if the national flag is a prominent symbol of the celebration (e.g., true for Independence Day, false for Christmas).`,
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
                                    clothing: { type: Type.STRING, description: 'A brief description of typical, traditional clothing worn for this specific holiday in this country.' },
                                    elements: { type: Type.STRING, description: 'A brief list of typical daily-used items or elements and their purpose.' },
                                    flagIsProminent: { type: Type.BOOLEAN, description: 'A boolean indicating if the country flag is a prominent and commonly used symbol in this celebration.' },
                                    soundEffects: { type: Type.STRING, description: 'A brief list of typical sound effects associated with the holiday (e.g., "fireworks, bells").' },
                                    musicStyles: { type: Type.STRING, description: 'A brief list of typical music styles or genres for the holiday (e.g., "folk music, festive orchestral").' },
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

        const textPrompt = `Create a beautiful, festive scene celebrating '${holiday.name_en}' in ${country}. The holiday is about: "${holiday.description_en}". Incorporate these cultural details: Key elements are "${holiday.elements}". The scene's style should complement the logo's style: '${logoAnalysis}'. The scene must be professional, with cinematic lighting. ${styleInstruction} If any people are depicted, it is crucial that their faces are realistic, credible, and express emotions fitting for the celebration. Avoid any facial distortions or uncanny valley effects. The scene must not include any children.
CRITICAL INSTRUCTIONS:
1.  **ASPECT RATIO**: The final image MUST have a 16:9 aspect ratio (landscape).
2.  **LOGO INTEGRITY**: The primary goal is to integrate the provided logo. It is MANDATORY that the logo is displayed prominently and clearly, preserving its original shape, colors, and proportions with perfect accuracy. DO NOT alter, redraw, or reinterpret the logo in any way. Treat it as a fixed asset to be placed within the scene.
3.  **CULTURAL ATTIRE**: If people are shown, their clothing must be the authentic, traditional attire for '${holiday.name_en}' in ${country}, as described here: "${holiday.clothing}". Do NOT adapt, alter, or stylize the clothing to match the logo. Cultural authenticity is the highest priority.
4.  ${flagInstruction}
5.  **CANVAS CONFORMITY**: The generated image MUST exactly fit the dimensions of the provided blank canvas (the second image). Use the blank canvas as your size and aspect ratio template - the output image must match its exact dimensions and 16:9 aspect ratio.`;
        
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
        overall_mood: { type: Type.STRING, description: `Describe the overall mood. e.g., 'Festive and magical', 'Patriotic and proud'.` },
        scenes: {
            type: Type.ARRAY,
            description: "An array of scenes that describe the video progression.",
            items: {
                type: Type.OBJECT,
                properties: {
                    scene_description: { type: Type.STRING, description: "What happens in this scene, focusing on the logo and festive interactions." },
                    logo_animation: {
                        type: Type.OBJECT,
                        properties: {
                            animation: { type: Type.STRING, description: "How the logo creatively animates or interacts in this scene (e.g., 'A firework bursts revealing the logo')." },
                            sound_effect: { type: Type.STRING, description: "Sound effect for the logo's action. (e.g., 'subtle shimmer', 'magical reveal whoosh')." }
                        },
                        required: ["animation", "sound_effect"]
                    },
                    element_animations: {
                        type: Type.ARRAY,
                        description: "Animations of other elements in the scene.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                element: { type: Type.STRING, description: "The scene element to animate (e.g., 'fireworks', 'confetti')." },
                                animation: { type: Type.STRING, description: "The animation description for this element." },
                                sound_effect: { type: Type.STRING, description: "Sound effect for this animation (e.g., 'firework explosion', 'confetti rustle')." }
                            },
                            required: ["element", "animation", "sound_effect"]
                        }
                    },
                    transition_to_next_scene: { type: Type.STRING, description: "Description of the transition to the next scene (e.g., 'quick fade to white', 'sparkle wipe'). Null for the last scene." }
                },
                required: ["scene_description", "logo_animation", "element_animations", "transition_to_next_scene"]
            }
        }
    },
    required: ["overall_mood", "scenes"]
};

export const generateVideoPromptJson = async (holiday: Holiday, country: string, style: string): Promise<string> => {
    try {
        const flagInstruction = holiday.flagIsProminent
            ? `If the flag of ${country} is animated, it must be depicted with 100% accuracy, without alteration. Treat national symbols with respect.`
            : `The flag of ${country} is not used in this celebration and must NOT be included in the animation.`;
        
        const styleInstruction = style !== 'Default'
            ? `The animation's overall mood and style MUST be **${style}**. Adapt all scene descriptions and animations to reflect this style.`
            : `The animation should have a standard festive and cinematic mood.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `Create a detailed, creative JSON prompt for the Veo 3.0 video model to animate an image celebrating '${holiday.name_en}' in ${country}. The holiday is about: "${holiday.description_en}".
${styleInstruction}
The animation must incorporate these cultural details:
- Key festive elements: "${holiday.elements}".
- Contextual audio: Typical sound effects are "${holiday.soundEffects}" and typical music styles are "${holiday.musicStyles}". Use this to inform your sound effect choices and the overall mood.

Structure it as a sequence of scenes with transitions. The JSON must make the brand logo the central focus, detailing its interaction with the festive elements. For each animation, describe an accompanying sound effect (no dialogue). Do not include camera movements or duration.

IMPORTANT RULES:
1.  If people are included, ensure they have natural, fluid movements, including subtle changes in facial expressions that are appropriate to the scene's mood.
2.  The clothing for any depicted people must be the traditional, authentic attire for '${holiday.name_en}' in ${country}, as described here: "${holiday.clothing}". It must NOT be stylized to match the logo.
3.  ${flagInstruction}
The final output must be a valid JSON object only, conforming to the provided schema.`,
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
            contents: `You are an expert video animation script editor. Your task is to modify a JSON animation script based on a user's instructions.
User's Instructions: "${userInstructions}"

Current JSON Script:
${currentJson}

Please apply the user's instructions to the current JSON script and return the new, updated JSON object.
- The structure of the JSON must remain valid and conform to the original schema.
- Only change what is requested. Preserve the rest of the script.
- Ensure the output is a single, valid JSON object and nothing else.`,
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
            model: 'veo-3.0-generate-001', //veo-3.0-fast-generate-001',
            prompt: prompt,
            image: {
                imageBytes: imageB64,
                mimeType: imageMimeType,
            },
            config: {
                aspectRatio: "16:9", 
                numberOfVideos: 1,
                negativePrompt: "low quality, pixelated, deformed logo, distorted flags, deformed"
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
