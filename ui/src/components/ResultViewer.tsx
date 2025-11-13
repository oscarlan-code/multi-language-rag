import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { RetrievedDocument } from "../types";

type DisplayMode = "original" | "translated";

type ResultViewerProps = {
  answer: {
    text: string;
    language: string | null;
    translated: string | null;
    mode: DisplayMode;
  };
  onToggleAnswer: () => void;
  documents: RetrievedDocument[];
  displayModes: Record<string, DisplayMode>;
  onToggleDisplay: (docId: string) => void;
};

function renderHighlight(text: string, highlights: string[]) {
  if (!highlights.length) {
    return text;
  }
  const highlightSet = new Set(highlights.map((token) => token.toLowerCase()));
  const segments = text.split(/(\s+)/);
  return segments.map((segment, index) => {
    if (segment.trim().length === 0) {
      return <span key={`space-${index}`}>{segment}</span>;
    }
    if (highlightSet.has(segment.toLowerCase())) {
      return (
        <mark key={`highlight-${index}`} className="highlight">
          {segment}
        </mark>
      );
    }
    return <span key={`segment-${index}`}>{segment}</span>;
  });
}

export default function ResultViewer({ answer, onToggleAnswer, documents, displayModes, onToggleDisplay }: ResultViewerProps) {
  const { t } = useTranslation();

  const hasAnswer = Boolean(answer.text.trim());
  const hasDocuments = documents.length > 0;
  const answerCanTranslate = Boolean(answer.translated);
  const answerText = answer.mode === "translated" && answer.translated ? answer.translated : answer.text;

  const items = useMemo(
    () =>
      documents.map((doc) => {
        const mode = displayModes[doc.doc_id] ?? "original";
        const canTranslate = Boolean(doc.translated_text);
        const displayText = mode === "translated" && doc.translated_text ? doc.translated_text : doc.original_text;
        const highlightTokens = mode === "translated" ? [] : doc.highlights;
        const confidencePercent = Math.round(doc.confidence * 100);
        return {
          ...doc,
          mode,
          displayText,
          highlightTokens,
          confidencePercent,
          canTranslate
        };
      }),
    [documents, displayModes]
  );

  if (!hasDocuments && !hasAnswer) {
    return (
      <section className="result-viewer">
        <h2>{t("results.header")}</h2>
        <p>{t("app.noResults")}</p>
      </section>
    );
  }

  return (
    <section className="result-viewer">
      <h2>{t("results.header")}</h2>
      {hasAnswer && (
        <article className="result-card">
          <header className="result-card-header">
            <span>
              {t("results.sourceLanguage")}: {answer.language ?? "—"}
            </span>
          </header>
          <div className="result-text" dir="auto">
            {answerText}
          </div>
          <div className="result-footer">
            <button type="button" className="ghost-button" onClick={onToggleAnswer} disabled={!answerCanTranslate}>
              {answer.mode === "translated" ? t("results.showOriginal") : t("results.showTranslated")}
            </button>
          </div>
        </article>
      )}
      {hasDocuments && (
        <div className="result-list">
          {items.map((doc) => (
            <article key={doc.doc_id} className="result-card">
              <header className="result-card-header">
                <span>
                  {t("results.sourceLanguage")}: {doc.language}
                </span>
                <span>
                  {t("results.confidence")}: {doc.confidencePercent}%
                </span>
              </header>
              <div className="result-text" dir="auto">
                {renderHighlight(doc.displayText, doc.highlightTokens)}
              </div>
              <div className="result-footer">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onToggleDisplay(doc.doc_id)}
                  disabled={!doc.canTranslate}
                >
                  {doc.mode === "translated" ? t("results.showOriginal") : t("results.showTranslated")}
                </button>
                {doc.highlightTokens.length > 0 && (
                  <div className="result-highlights">
                    <span>{t("results.highlights")}:</span>
                    <ul>
                      {doc.highlightTokens.map((token) => (
                        <li key={token}>{token}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

