import { useTranslation } from "react-i18next";

type LogPanelProps = {
  visible: boolean;
  queryLang: string | null;
  retrievedLangs: string[];
  latencyMs: number | null;
  scoreMean: number | null;
};

export default function LogPanel({ visible, queryLang, retrievedLangs, latencyMs, scoreMean }: LogPanelProps) {
  const { t } = useTranslation();
  if (!visible) {
    return null;
  }
  return (
    <section className="log-panel">
      <h3>{t("logPanel.header")}</h3>
      <div>
        <strong>{t("logPanel.queryLang")}:</strong> {queryLang ?? "—"}
      </div>
      <div>
        <strong>{t("logPanel.retrievedLangs")}:</strong> {retrievedLangs.length ? retrievedLangs.join(", ") : "—"}
      </div>
      <div>
        <strong>{t("logPanel.scoreMean")}:</strong> {scoreMean !== null ? scoreMean.toFixed(3) : "—"}
      </div>
      <div>
        <strong>{t("logPanel.latency")}:</strong> {latencyMs !== null ? latencyMs.toFixed(1) : "—"}
      </div>
    </section>
  );
}

