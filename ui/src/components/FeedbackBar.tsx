import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { RetrievedDocument } from "../types";

type FeedbackBarProps = {
  query: string;
  documents: RetrievedDocument[];
  onSubmit: (helpful: boolean, notes: string, docId?: string) => Promise<void>;
  disabled: boolean;
};

export default function FeedbackBar({ query, documents, onSubmit, disabled }: FeedbackBarProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<string | undefined>(documents[0]?.doc_id);
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">("idle");

  const handleSubmit = async (helpful: boolean) => {
    if (!query.trim()) {
      return;
    }
    setStatus("submitting");
    try {
      await onSubmit(helpful, notes, selectedDoc);
      setNotes("");
      setStatus("submitted");
    } catch {
      setStatus("idle");
      return;
    }
    setTimeout(() => setStatus("idle"), 2500);
  };

  return (
    <section className="feedback-bar">
      <div className="feedback-header">
        <span>{t("feedback.prompt")}</span>
        {documents.length > 1 && (
          <select value={selectedDoc} onChange={(event) => setSelectedDoc(event.target.value)}>
            {documents.map((doc) => (
              <option key={doc.doc_id} value={doc.doc_id}>
                {doc.language} · {doc.doc_id}
              </option>
            ))}
          </select>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder={t("feedback.notesPlaceholder")}
        disabled={disabled || status === "submitting"}
        rows={2}
      />
      <div className="feedback-actions">
        <button type="button" className="primary-button" disabled={disabled || status === "submitting"} onClick={() => handleSubmit(true)}>
          {t("feedback.helpful")}
        </button>
        <button type="button" className="ghost-button" disabled={disabled || status === "submitting"} onClick={() => handleSubmit(false)}>
          {t("feedback.notAccurate")}
        </button>
        {status === "submitting" && <span className="feedback-status">{t("search.loading")}</span>}
        {status === "submitted" && <span className="feedback-status">{t("feedback.submitted")}</span>}
      </div>
    </section>
  );
}

