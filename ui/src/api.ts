import axios from "axios";
import type { FeedbackPayload, QueryResponse } from "./types";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  timeout: 15000
});

export async function runQuery(query: string, targetLang: string | null, topK: number): Promise<QueryResponse> {
  const response = await client.post<QueryResponse>("/query", {
    query,
    target_lang: targetLang || undefined,
    top_k: topK
  });
  return response.data;
}

export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  await client.post("/feedback", payload);
}

export async function indexDocuments(documents: string[]): Promise<number> {
  if (!documents.length) {
    return 0;
  }
  const response = await client.post<{ count: number }>("/index", {
    documents
  });
  return response.data.count ?? documents.length;
}

export async function uploadDocuments(files: FileList): Promise<{ files: number; documents: number }> {
  const form = new FormData();
  Array.from(files).forEach((file) => form.append("files", file));
  const response = await client.post<{ files: number; documents: number }>("/upload", form, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
}

export async function translateUITexts(texts: string[], targetLang: string): Promise<string[]> {
  const response = await client.post<{ translations: string[] }>("/translate-ui", {
    texts,
    target_lang: targetLang
  });
  return response.data.translations;
}
