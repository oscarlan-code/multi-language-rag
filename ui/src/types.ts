export type RetrievedDocument = {
  doc_id: string;
  original_text: string;
  translated_text: string | null;
  score: number;
  confidence: number;
  language: string;
  highlights: string[];
};

export type QueryResponse = {
  query_lang: string | null;
  retrieved_langs: string[];
  documents: RetrievedDocument[];
  latency_ms: number;
  score_mean: number;
  token_count: number;
  answer_text: string;
  answer_language: string | null;
  answer_translated_text: string | null;
};

export type FeedbackPayload = {
  query: string;
  doc_id?: string;
  helpful: boolean;
  notes?: string;
};

