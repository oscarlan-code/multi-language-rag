import { useTranslation } from "react-i18next";
import type { RetrievedDocument } from "../types";

type ContextPanelProps = {
  documents: RetrievedDocument[];
};

export default function ContextPanel({ documents }: ContextPanelProps) {
  const { t } = useTranslation();
  if (!documents.length) {
    return null;
  }

  return (
    <aside className="context-panel">
      <h3>{t("context.header")}</h3>
      <ul>
        {documents.map((doc) => (
          <li key={doc.doc_id}>
            <div>
              <strong>{t("context.sourceLanguage")}:</strong> {doc.language}
            </div>
            <div>
              <strong>{t("context.score")}:</strong> {doc.score.toFixed(3)}
            </div>
            <div>
              <strong>{t("context.confidence")}:</strong> {(doc.confidence * 100).toFixed(0)}%
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

