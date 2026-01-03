import { GoogleGenAI, Type } from "@google/genai";
import { CashbackEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const refineDataWithContext = async (currentData: CashbackEntry[], userInstruction: string): Promise<CashbackEntry[]> => {
  if (!userInstruction || userInstruction.trim().length === 0) return currentData;

  try {
    const model = "gemini-2.0-flash-exp";
    const prompt = `
      You are a data editor. I have a JSON dataset of cashback offers from various banks.
      
      Current Data: ${JSON.stringify(currentData)}
      
      User Instruction: "${userInstruction}"
      
      Your task:
      1. Analyze the User Instruction.
      2. Modify the Current Data based on the instruction.
         - If the user says "Change Sber Taxi to 10%", update the percentage.
         - If the user says "Add 5% on Flowers in Alfa", add a new entry.
         - If the user says "Delete VTB", remove those entries.
         - If the user says "I will buy a TV", and you know a category matches (e.g., Electronics), you might increase its priority, but primarily focus on explicit data changes.
      3. Return the FULL updated JSON array.
      4. Normalize Bank Names (Sber, T-Bank, Alfa, VTB, Yandex) and Category names (Capitalized) as before.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              bankName: { type: Type.STRING },
              category: { type: Type.STRING },
              percentage: { type: Type.NUMBER }
            }
          }
        }
      }
    });

    const respText = response.text;
    if (!respText) return currentData;

    const rawData = JSON.parse(respText);
    
    // Ensure IDs exist
    return rawData.map((item: any) => ({
      id: item.id || `refined-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bankName: item.bankName || "Other",
      category: item.category || "Manual Category",
      percentage: item.percentage || 0,
      originalText: "Refined by user"
    }));

  } catch (error) {
    console.error("Error refining data:", error);
    throw error;
  }
};

export const parseUserContext = async (text: string): Promise<CashbackEntry[]> => {
  if (!text || text.trim().length === 0) return [];

  try {
    const model = "gemini-2.0-flash-exp";
    const prompt = `
      Analyze this user comment regarding their cashback categories.
      Extract any specific cashback offers mentioned.
      If the user says "I have 10% on Taxi in Sber", extract it.
      If the user just talks about preferences ("I want to buy a TV"), ignore it unless they state a specific % and category.
      
      Normalize Bank Names to: "Sber", "T-Bank", "Alfa", "VTB", "Yandex", or "Other".
      
      Return a JSON array of objects:
      - bankName: string
      - category: string (Capitalize first letter)
      - percentage: number
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: `User Comment: "${text}"` },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              bankName: { type: Type.STRING },
              category: { type: Type.STRING },
              percentage: { type: Type.NUMBER }
            }
          }
        }
      }
    });

    const respText = response.text;
    if (!respText) return [];

    const rawData = JSON.parse(respText);
    
    return rawData.map((item: any) => ({
      id: `context-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bankName: item.bankName || "Other",
      category: item.category || "Manual Category",
      percentage: item.percentage || 0,
      originalText: "Added via comment"
    }));

  } catch (error) {
    console.error("Error parsing context:", error);
    // Don't fail the whole app if context parsing fails
    return [];
  }
};

export const parseCashbackScreenshot = async (file: File): Promise<CashbackEntry[]> => {
  try {
    const base64Data = await fileToGenerativePart(file);
    const model = "gemini-2.0-flash-exp";

    // Updated prompt to handle specific banks and normalization
    const prompt = `
      Analyze this screenshot from a banking app (Sber, T-Bank, Alfa, VTB, Yandex).
      Extract the cashback categories and their percentage values.
      
      The image likely contains a list of categories with percentages (e.g., "1% All purchases", "7% Fast Food").
      
      Identify the Bank Name. Normalize it strictly to one of these values if possible:
      - "Sber" (Green UI, SberPrime)
      - "T-Bank" (Yellow/Black UI, Tinkoff)
      - "Alfa" (Red/White UI, letter A)
      - "VTB" (Blue UI)
      - "Yandex" (Yellow/Red/Colorful stripes, Yandex Pay/Bank)
      - "Other" (if strictly none of the above)
      
      Return a JSON array.
      - bankName: string (Use the normalized names above)
      - category: string (Clean text in Russian, e.g. "Кафе и рестораны", "Такси". Capitalize first letter)
      - percentage: number (The number only, e.g. 7 for 7%. Do not include symbols)
    `;

    const mimeType = (file.type && file.type.startsWith('image/')) ? file.type : 'image/jpeg';

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              bankName: { type: Type.STRING },
              category: { type: Type.STRING },
              percentage: { type: Type.NUMBER }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const rawData = JSON.parse(text);

    return rawData.map((item: any) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bankName: item.bankName || "Other",
      category: item.category || "Unknown",
      percentage: typeof item.percentage === 'number' ? item.percentage : parseFloat(item.percentage) || 0
    }));

  } catch (error) {
    console.error("Error parsing screenshot details:", error);
    throw error;
  }
};