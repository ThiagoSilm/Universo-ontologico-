import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (retries > 0) {
      console.warn(`[Gemini] Erro na API, tentando novamente... (${retries} restantes)`);
      await new Promise(r => setTimeout(r, 1000));
      return withRetry(fn, retries - 1);
    }
    throw e;
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: [text],
    });
    return result.embeddings[0].values;
  });
}
