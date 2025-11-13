import { ChangeEvent, FormEvent, useRef } from "react";
import { useTranslation } from "react-i18next";

type SearchPanelProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  targetLanguage: string | null;
  onTargetLanguageChange: (lang: string | null) => void;
  loading: boolean;
  detectedLanguage: string | null;
  onUpload: (files: FileList) => Promise<void>;
  uploading: boolean;
  uploadStatus: string | null;
};

export default function SearchPanel({
  query,
  onQueryChange,
  onSubmit,
  targetLanguage,
  onTargetLanguageChange,
  loading,
  detectedLanguage,
  onUpload,
  uploading,
  uploadStatus
}: SearchPanelProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await onUpload(files);
    }
    event.target.value = "";
  };

  return (
    <section className="search-panel">
      <form onSubmit={handleSubmit} className="search-form">
        <textarea
          className="search-input"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          rows={3}
          dir="auto"
        />
        <div className="search-controls">
          <label>
            <span>{t("search.targetLabel")}</span>
            <select
              value={targetLanguage ?? "original"}
              onChange={(event) => {
                const value = event.target.value;
                onTargetLanguageChange(value === "original" ? null : value);
              }}
            >
              <option value="original">{t("search.auto")}</option>
              <option value="en">English</option>
              <option value="zh">中文（简体）</option>
              <option value="zh-TW">繁體中文</option>
              <option value="jp">日本語</option>
              <option value="ko">한국어</option>
              <option value="hi">हिन्दी</option>
              <option value="bn">বাংলা</option>
              <option value="vi">Tiếng Việt</option>
              <option value="id">Bahasa Indonesia</option>
              <option value="th">ไทย</option>
              <option value="ms">Bahasa Melayu</option>
            </select>
          </label>
          <div className="upload-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.json,.csv,.tsv,.yml,.yaml,.html,.xml,.pdf"
              multiple
              hidden
              onChange={handleFileChange}
            />
            <span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? t("search.uploading") : t("search.uploadButton")}
              </button>
            </span>
          </div>
          <button type="submit" className="primary-button" disabled={!query.trim() || loading}>
            {loading ? t("search.loading") : t("search.submit")}
          </button>
        </div>
      </form>
      <div className="detected-language">
        {detectedLanguage ? `${t("search.detected")}: ${detectedLanguage}` : "\u00A0"}
      </div>
      <div className="upload-status">
        {uploadStatus ?? t("search.uploadHint")}
      </div>
    </section>
  );
}

