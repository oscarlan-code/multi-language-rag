import { useTranslation } from "react-i18next";

type TopBarProps = {
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  logsVisible: boolean;
  onToggleLogs: () => void;
};

const languageOptions = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文（简体）" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "jp", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "hi", label: "हिन्दी" },
  { value: "bn", label: "বাংলা" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "th", label: "ไทย" },
  { value: "ms", label: "Bahasa Melayu" }
];

export default function TopBar({ currentLanguage, onLanguageChange, logsVisible, onToggleLogs }: TopBarProps) {
  const { t } = useTranslation();
  return (
    <header className="top-bar">
      <div>
        <h1 className="app-title">{t("app.title")}</h1>
      </div>
      <div className="top-bar-actions">
        <label className="language-select">
          <span>{t("topBar.language")}</span>
          <select value={currentLanguage} onChange={(event) => onLanguageChange(event.target.value)}>
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ghost-button" onClick={onToggleLogs}>
          {logsVisible ? t("app.logs") : t("topBar.toggleLogs")}
        </button>
        <button type="button" className="ghost-button profile-button">
          {t("app.profile")}
        </button>
      </div>
    </header>
  );
}

