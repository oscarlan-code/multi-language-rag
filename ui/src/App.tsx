import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import TopBar from "./components/TopBar";
import SearchPanel from "./components/SearchPanel";
import ResultViewer from "./components/ResultViewer";
import ContextPanel from "./components/ContextPanel";
import LogPanel from "./components/LogPanel";
import FeedbackBar from "./components/FeedbackBar";
import { runQuery, sendFeedback, uploadDocuments } from "./api";
import type { AxiosError } from "axios";
import type { RetrievedDocument } from "./types";

const rtlLanguages = new Set(["ar", "he", "fa"]);

export default function App() {
  const { i18n, t } = useTranslation();
  const [uiLanguage, setUiLanguage] = useState(i18n.language);
  const [query, setQuery] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<RetrievedDocument[]>([]);
  const [displayModes, setDisplayModes] = useState<Record<string, "original" | "translated">>({});
  const [answerText, setAnswerText] = useState("");
  const [answerLanguage, setAnswerLanguage] = useState<string | null>(null);
  const [answerTranslatedText, setAnswerTranslatedText] = useState<string | null>(null);
  const [answerMode, setAnswerMode] = useState<"original" | "translated">("original");
  const [queryLang, setQueryLang] = useState<string | null>(null);
  const [retrievedLangs, setRetrievedLangs] = useState<string[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [scoreMean, setScoreMean] = useState<number | null>(null);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedLang = window.localStorage.getItem("rag-ui-language");
    if (storedLang) {
      i18n.changeLanguage(storedLang);
      setUiLanguage(storedLang);
    }
  }, [i18n]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", uiLanguage);
      document.documentElement.setAttribute("dir", rtlLanguages.has(uiLanguage) ? "rtl" : "ltr");
    }
  }, [uiLanguage]);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setUiLanguage(lang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("rag-ui-language", lang);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await runQuery(query, targetLanguage, 5);
      setDocuments(response.documents);
      setQueryLang(response.query_lang);
      setRetrievedLangs(response.retrieved_langs);
      setLatencyMs(response.latency_ms);
      setScoreMean(response.score_mean);
      setTokenCount(response.token_count);
      setAnswerText(response.answer_text);
      setAnswerLanguage(response.answer_language);
      setAnswerTranslatedText(response.answer_translated_text);
      const defaultAnswerMode: "original" | "translated" =
        response.answer_translated_text && targetLanguage ? "translated" : "original";
      setAnswerMode(defaultAnswerMode);
      const nextModes: Record<string, "original" | "translated"> = {};
      response.documents.forEach((doc) => {
        const defaultMode = targetLanguage && doc.translated_text ? "translated" : "original";
        nextModes[doc.doc_id] = defaultMode;
      });
      setDisplayModes(nextModes);
    } catch (queryError) {
      setError(queryError instanceof Error ? queryError.message : "Unable to complete query.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDisplay = (docId: string) => {
    setDisplayModes((prev) => {
      const current = prev[docId] ?? "original";
      const next = current === "translated" ? "original" : "translated";
      const doc = documents.find((item) => item.doc_id === docId);
      if (next === "translated" && !doc?.translated_text) {
        return prev;
      }
      return { ...prev, [docId]: next };
    });
  };

  const handleFeedbackSubmit = async (helpful: boolean, notes: string, docId?: string) => {
    if (!query.trim()) {
      return;
    }
    try {
      await sendFeedback({
        query,
        doc_id: docId,
        helpful,
        notes: notes || undefined
      });
    } catch (feedbackError) {
      setError(feedbackError instanceof Error ? feedbackError.message : "Unable to send feedback.");
      throw feedbackError;
    }
  };

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    setUploadStatus(t("search.uploading"));
    try {
      const response = await uploadDocuments(files);
      setUploadStatus(t("search.uploadSuccess", { count: response.documents }));
      setError(null);
    } catch (uploadError) {
      const detail =
        (uploadError as AxiosError<{ detail?: string }>)?.response?.data?.detail ??
        (uploadError instanceof Error ? uploadError.message : "Upload failed.");
      if (detail && detail.toLowerCase().startsWith("unsupported file type")) {
        setUploadStatus(t("search.uploadUnsupported", { name: detail.split(":")?.[1]?.trim() ?? "" }));
      } else {
        setUploadStatus(t("search.uploadError"));
      }
      setError(detail);
    } finally {
      setUploading(false);
    }
  };

  const footerSummary = useMemo(() => {
    if (latencyMs === null && tokenCount === null) {
      return null;
    }
    return `${t("app.latency")}: ${latencyMs !== null ? latencyMs.toFixed(1) : "—"} ms · ${t("app.tokens")}: ${
      tokenCount ?? "—"
    }`;
  }, [latencyMs, tokenCount, t]);

  return (
    <div className="app-shell">
      <TopBar currentLanguage={uiLanguage} onLanguageChange={handleLanguageChange} logsVisible={showLogs} onToggleLogs={() => setShowLogs((prev) => !prev)} />
      <main className="app-content">
        <div className="main-column">
          <SearchPanel
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleQuery}
            targetLanguage={targetLanguage}
            onTargetLanguageChange={setTargetLanguage}
            loading={loading}
            detectedLanguage={queryLang}
            onUpload={handleFileUpload}
            uploading={uploading}
            uploadStatus={uploadStatus}
          />
          {error && <div className="error-banner">{error}</div>}
          <ResultViewer
            answer={{
              text: answerText,
              language: answerLanguage,
              translated: answerTranslatedText,
              mode: answerMode,
            }}
            onToggleAnswer={() => {
              if (!answerTranslatedText) {
                return;
              }
              setAnswerMode((prev) => (prev === "original" ? "translated" : "original"));
            }}
            documents={documents}
            displayModes={displayModes}
            onToggleDisplay={handleToggleDisplay}
          />
          <FeedbackBar
            key={documents.map((doc) => doc.doc_id).join("|")}
            query={query}
            documents={documents}
            onSubmit={handleFeedbackSubmit}
            disabled={!documents.length}
          />
        </div>
        <ContextPanel documents={documents} />
      </main>
      <LogPanel visible={showLogs} queryLang={queryLang} retrievedLangs={retrievedLangs} latencyMs={latencyMs} scoreMean={scoreMean} />
      <footer className="app-footer">{footerSummary}</footer>
    </div>
  );
}

