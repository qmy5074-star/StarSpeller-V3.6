import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { WordData } from "../types";

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.API_KEY || '';

// Helper for retrying async operations with timeout
async function withRetry<T>(operation: () => Promise<T>, retries = 2, delay = 1000, timeoutMs = 120000): Promise<T> {
  let timeoutId: any;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        console.error(`Operation timed out after ${timeoutMs}ms`);
        reject(new Error('Operation timed out (Gemini API took too long to respond)'));
      }, timeoutMs);
    });
    const result = await Promise.race([operation(), timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);
    const errString = error?.message || JSON.stringify(error);
    
    // Check for Quota limits immediately and trigger UI redirect
    if (errString.includes('429') || errString.includes('RESOURCE_EXHAUSTED')) {
        console.warn("Quota exceeded, triggering paywall.");
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gemini-quota-exceeded'));
        }
        throw error; // Stop execution
    }

    // Other fatal errors
    const isFatal = errString.includes('PERMISSION_DENIED') ||
                    errString.includes('API_KEY_INVALID') ||
                    errString.includes('API_KEY_NOT_FOUND');

    if (retries > 0 && !isFatal) {
      console.warn(`Operation failed, retrying... (${retries} attempts left). Error: ${errString}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retries - 1, delay * 2, timeoutMs);
    }
    throw error;
  }
}

// Helper to clean JSON string from potential markdown backticks
function cleanJsonString(str: string): string {
  if (!str) return "{}";
  // Remove markdown backticks if present
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned.trim();
}

export interface WordValidationResult {
  isValid: boolean;
  reason?: string;
  correctedWord?: string;
}

export const validateWordInput = async (word: string): Promise<WordValidationResult> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { isValid: false, reason: "API key is missing. Please set GEMINI_API_KEY in Settings > Secrets." };
  }
  const ai = new GoogleGenAI({ apiKey });
  return withRetry(async () => {
    const model = 'gemini-3-flash-preview';
    const response = await ai.models.generateContent({
      model,
      contents: `Validate the following English word input: "${word}".
      Rules for valid words:
      1. Must be a real English word.
      2. Must have actual meaning and be suitable for learning as thematic vocabulary.
      3. Allowed parts of speech: Nouns, Verbs, Adjectives.
      4. Disallowed parts of speech: Adverbs (e.g., quickly, very), Interjections (e.g., wow, oh), Pronouns (e.g., he, she), Prepositions (e.g., in, on), Conjunctions (e.g., and, but), Articles (e.g., a, the), Particles.
      5. If the user input has minor typos but clearly means a valid word, provide the corrected word.
      6. If the word is invalid, provide a short, friendly reason in English explaining why it's not suitable. Keep it concise and easy to understand. Guide them to enter a noun, verb, or adjective with a clear meaning (e.g., "Please enter a noun, verb, or adjective.", "This word doesn't have a clear meaning to learn.", "Please enter a real English word.").
      
      Return a JSON object with:
      - isValid: boolean
      - reason: string (only if isValid is false, in English)
      - correctedWord: string (the canonical form of the word, or corrected spelling, in lowercase)`,
      config: {
        maxOutputTokens: 1024,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            correctedWord: { type: Type.STRING }
          },
          required: ["isValid"]
        }
      }
    });
    
    const jsonStr = cleanJsonString(response.text || "{}");
    return JSON.parse(jsonStr) as WordValidationResult;
  });
};

export const generateWordData = async (word: string): Promise<WordData> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API key is missing. Please set GEMINI_API_KEY in Settings > Secrets.");
  }
  const ai = new GoogleGenAI({ apiKey });
  return withRetry(async () => {
    const model = 'gemini-3-flash-preview';
    
    const response = await ai.models.generateContent({
      model,
      contents: `Generate detailed vocabulary data for the English word: "${word}". 
      Target audience: Elementary school students learning English. 
      
      1. "parts": Break the word into spelling chunks (syllables).
         - Follow a standard syllable splitting approach.
         - For single-syllable words (e.g., "bird", "cake", "shirt"), do NOT split.
         - Example: "tiger" -> ["ti", "ger"], "education" -> ["e", "du", "ca", "tion"].
      2. "partsPronunciation": Mirror "parts" with simple English phonetic spellings for a TTS engine.
         - Example: "tiger" -> ["tie", "gur"], "education" -> ["eh", "jew", "kay", "shun"].
      3. "partOfSpeech": Abbreviated (e.g., "n.", "v.", "adj.").
      4. "root": A simple memory aid or mnemonic for kids.
      5. "phonetic": Standard US English IPA.
      6. "translation": Chinese translation.
      7. "chineseTranslation": Simple English definition.
      8. "sentence": A simple example sentence.
      9. "phrases": 3 short, common phrases (max 3-4 words each).
      10. "relatedWords": 3 words with similar patterns or roots.`,
      config: {
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            parts: { type: Type.ARRAY, items: { type: Type.STRING } },
            partsPronunciation: { type: Type.ARRAY, items: { type: Type.STRING } },
            root: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            translation: { type: Type.STRING, description: "Chinese translation" },
            chineseTranslation: { type: Type.STRING, description: "English definition" },
            sentence: { type: Type.STRING },
            phrases: { type: Type.ARRAY, items: { type: Type.STRING } },
            relatedWords: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["word", "partOfSpeech", "parts", "partsPronunciation", "root", "phonetic", "translation", "chineseTranslation", "sentence", "phrases", "relatedWords"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from Gemini");
    
    const jsonStr = cleanJsonString(text);
    return JSON.parse(jsonStr) as WordData;
  });
};

export const generateWordImage = async (word: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API key is missing. Please set GEMINI_API_KEY in Settings > Secrets.");
  }
  const ai = new GoogleGenAI({ apiKey });
  try {
    // Explicitly using gemini-2.5-flash-image for image generation
    const model = 'gemini-2.5-flash-image';
    const prompt = `A cute, colorful, cartoon-style illustration for children representing the word: "${word}". Simple background, vector art style.`;
    
    // Attempt generation with retry
    const rawImage = await withRetry(async () => {
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
      });

      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
         const parts = candidates[0].content.parts;
         for (const part of parts) {
           // Check for inlineData (base64 image)
           if (part.inlineData && part.inlineData.data) {
             return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
           }
         }
      }
      throw new Error("No image data found in response");
    }, 2, 1000, 180000); // Retry 2 times, 180s timeout for image gen
    
    // Compress the image before returning
    return new Promise((resolve, reject) => {
      const img = new Image();
      const compressionTimeout = setTimeout(() => {
        console.warn("Image compression timed out, returning raw image");
        resolve(rawImage);
      }, 10000); // 10s timeout for compression

      img.src = rawImage;
      img.onload = () => {
        clearTimeout(compressionTimeout);
        const canvas = document.createElement('canvas');
        const maxWidth = 1024;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawImage);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to JPEG with 70% quality
      };
      img.onerror = (err) => {
        clearTimeout(compressionTimeout);
        console.warn("Image compression failed, returning raw image", err);
        resolve(rawImage);
      };
    });
    
  } catch (error: any) {
    const errString = error?.message || JSON.stringify(error);
    
    // If it was a quota error, it would have been caught in withRetry and dispatched the event.
    // If we are here, it's a different error (e.g., content policy, network).
    
    console.error("Image generation failed:", error);
    
    // Return a consistent fallback image based on the word seed
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='400' height='400' fill='%23e0f2fe'/><text x='50%' y='50%' font-family='sans-serif' font-size='80' fill='%237dd3fc' text-anchor='middle' dominant-baseline='middle'>🖼️</text><text x='50%' y='65%' font-family='sans-serif' font-size='20' fill='%237dd3fc' text-anchor='middle' dominant-baseline='middle'>No Image</text></svg>`;
  }
};