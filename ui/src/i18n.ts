import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "../locales/en.json";
import zh from "../locales/zh.json";
import jp from "../locales/jp.json";
import zhTW from "../locales/zh-TW.json";
import ko from "../locales/ko.json";
import hi from "../locales/hi.json";
import bn from "../locales/bn.json";
import vi from "../locales/vi.json";
import id from "../locales/id.json";
import th from "../locales/th.json";
import ms from "../locales/ms.json";

const resources = {
  en: { translation: en },
  "en-US": { translation: en },
  "en-GB": { translation: en },
  zh: { translation: zh },
  "zh-CN": { translation: zh },
  "zh-SG": { translation: zh },
  "zh-TW": { translation: zhTW },
  "zh-HK": { translation: zhTW },
  jp: { translation: jp },
  ja: { translation: jp },
  ko: { translation: ko },
  "ko-KR": { translation: ko },
  hi: { translation: hi },
  "hi-IN": { translation: hi },
  bn: { translation: bn },
  "bn-IN": { translation: bn },
  "bn-BD": { translation: bn },
  vi: { translation: vi },
  "vi-VN": { translation: vi },
  id: { translation: id },
  "id-ID": { translation: id },
  th: { translation: th },
  "th-TH": { translation: th },
  ms: { translation: ms },
  "ms-MY": { translation: ms }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"]
    }
  });

export default i18n;

