import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GameWordData, Difficulty } from "../types";

// Initialize the API client
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchWordData = async (difficulty: Difficulty, previousWords: string[] = []): Promise<GameWordData> => {
  const ai = getAiClient();
  
  let difficultyPrompt = "";
  switch (difficulty) {
    case Difficulty.EASY:
      difficultyPrompt = "Strictly generate a VERY SIMPLE Tamil word with only 2 or 3 letters/graphemes (e.g., கண், பால், கல்). The word must be a basic noun familiar to a toddler.";
      break;
    case Difficulty.MEDIUM:
      difficultyPrompt = "Generate a common Tamil word with 3 to 5 letters/graphemes (e.g., மரம், சக்கரம்).";
      break;
    case Difficulty.HARD:
      difficultyPrompt = "Generate a slightly longer or more complex Tamil word (5+ letters/graphemes) (e.g., வாழைப்பழம், பேருந்து).";
      break;
  }

  const prompt = `
    Generate a single Tamil word suitable for a children's game.
    ${difficultyPrompt}
    
    IMPORTANT: Do NOT use any of these words: ${previousWords.join(', ')}.
    
    Return a JSON object with:
    - word: The Tamil word.
    - english: The English translation.
    - transliteration: How to pronounce it in English characters.
    - distractors: An array of 2 other simple English nouns (different from the target) to use as visual decoys.
    - distractorLetters: An array of 12 random Tamil letters (vowels, consonants, or combined letters) that are NOT in the target word.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          english: { type: Type.STRING },
          transliteration: { type: Type.STRING },
          distractors: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          distractorLetters: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          }
        },
        required: ["word", "english", "transliteration", "distractors", "distractorLetters"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text) as GameWordData;
};

export const generateImageForWord = async (word: string): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `A cute, colorful, vector-style cartoon illustration of a ${word} for a children's educational game. White background, simple lines, vibrant colors.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        // No specific imageConfig needed for standard square generation unless requested
      }
    });

    // Iterate to find the image part
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image generation failed:", error);
    // Fallback or re-throw. For this app, we re-throw to handle in UI.
    throw error;
  }
};

export const generateAudioForWord = async (word: string): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: word }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  } catch (error) {
    console.error("Audio generation failed:", error);
    return "";
  }
};
