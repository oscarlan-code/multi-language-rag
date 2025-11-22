/**
 * Dynamic i18n Configuration
 * 
 * This version treats all UI content as variables that can be translated
 * on-demand using the backend translation API. This allows unlimited language
 * support without pre-translated JSON files.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Base translations in English (source of truth)
// All UI content is stored here as variables
import baseTranslations from "../locales/en.json";

// Translation cache to avoid repeated API calls
const translationCache = new Map<string, Record<string, any>>();

// Custom backend that translates on-demand
class DynamicTranslationBackend {
  private apiBaseUrl: string;
  public cache: Map<string, Record<string, any>>;  // Made public for cache clearing

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.cache = new Map();
  }
  
  // Method to clear cache for a specific language
  clearCache(lang: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((value, key) => {
      if (key.startsWith(`${lang}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`[i18n] Cleared cache for ${lang}`);
  }

  async read(language: string, namespace: string, callback: (error: any, data: any) => void) {
    try {
      // Normalize language code, preserving special cases like "zh-TW"
      let normalizedLang = language.toLowerCase();
      
      // Handle special cases first (before splitting)
      if (normalizedLang === "zh-tw" || normalizedLang === "zh-hk") {
        normalizedLang = "zh-tw";  // Traditional Chinese
      } else {
        // For others, take base language code
        normalizedLang = normalizedLang.split("-")[0];
      }
      
      // Map UI language codes to backend language codes
      const languageMap: Record<string, string> = {
        "jp": "ja",  // Japanese: UI uses "jp", backend uses "ja"
        "zh-tw": "zh-tw",  // Traditional Chinese (keep as-is)
        "zh": "zh",  // Simplified Chinese
        "ko": "ko",  // Korean
        "hi": "hi",  // Hindi
        "bn": "bn",  // Bengali
        "vi": "vi",  // Vietnamese
        "id": "id",  // Indonesian
        "th": "th",  // Thai
        "ms": "ms",  // Malay
      };
      
      // Use mapped code if available, otherwise use normalized
      normalizedLang = languageMap[normalizedLang] || normalizedLang;
      
      // If English, return base translations immediately
      if (normalizedLang === "en") {
        callback(null, baseTranslations);
        return;
      }

      // Check cache first
      const cacheKey = `${normalizedLang}:${namespace}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        callback(null, cached);
        return;
      }

      // Check localStorage cache
      const cached = this.getCachedTranslation(normalizedLang);
      if (cached) {
        this.cache.set(cacheKey, cached);
        callback(null, cached);
        return;
      }

      // Translate on-demand via backend API
      console.log(`[i18n] Translating UI to ${normalizedLang}...`);
      try {
        const translated = await this.translateUI(baseTranslations, normalizedLang);
        this.cache.set(cacheKey, translated);
        this.saveCachedTranslation(normalizedLang, translated);
        console.log(`[i18n] Translation complete for ${normalizedLang}`, translated);
        callback(null, translated);
      } catch (error) {
        console.error(`[i18n] Translation failed for ${normalizedLang}:`, error);
        callback(error, baseTranslations); // Fallback to English on error
      }
    } catch (error) {
      console.error(`Translation failed for ${language}, falling back to English:`, error);
      callback(null, baseTranslations); // Fallback to English
    }
  }

  private async translateUI(translations: Record<string, any>, targetLang: string): Promise<Record<string, any>> {
    // Flatten nested object for translation
    const flatKeys = this.flattenObject(translations);
    
    // Extract only string values with their keys
    const textEntries: Array<[string, string]> = [];
    const keys: string[] = [];
    for (const key in flatKeys) {
      if (typeof flatKeys[key] === "string") {
        textEntries.push([key, flatKeys[key]]);
        keys.push(key);
      }
    }
    const texts = textEntries.map(([_, text]) => text);

    // Batch translate all UI strings
    const response = await fetch(`${this.apiBaseUrl}/translate-ui`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texts,
        target_lang: targetLang,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.statusText}`);
    }

    const { translations: translatedTexts } = await response.json();
    
    // Reconstruct nested object with translated values
    const translatedFlat: Record<string, any> = { ...flatKeys };
    keys.forEach((key, index) => {
      translatedFlat[key] = translatedTexts[index] || flatKeys[key];
    });

    return this.unflattenObject(translatedFlat);
  }

  private flattenObject(obj: Record<string, any>, prefix = ""): Record<string, any> {
    const flattened: Record<string, any> = {};
    for (const key in obj) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, this.flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
    return flattened;
  }

  private unflattenObject(obj: Record<string, any>): Record<string, any> {
    const unflattened: Record<string, any> = {};
    for (const key in obj) {
      const keys = key.split(".");
      let current = unflattened;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = obj[key];
    }
    return unflattened;
  }

  private getCachedTranslation(lang: string): Record<string, any> | null {
    try {
      const cached = localStorage.getItem(`ui-translation-${lang}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is still valid (24 hours)
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  }

  private saveCachedTranslation(lang: string, data: Record<string, any>): void {
    try {
      localStorage.setItem(
        `ui-translation-${lang}`,
        JSON.stringify({
          timestamp: Date.now(),
          data,
        })
      );
    } catch (e) {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const dynamicBackend = new DynamicTranslationBackend(apiBaseUrl);

// Initialize i18next with dynamic backend
i18n
  .use(LanguageDetector)
  .use({
    type: "backend",
    read: (language: string, namespace: string, callback: (error: any, data: any) => void) => {
      dynamicBackend.read(language, namespace, callback);
    },
  } as any)
  .use(initReactI18next)
  .init({
    lng: "en", // Default language
    fallbackLng: "en",
    ns: ["translation"],
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "rag-ui-language",
    },
    react: {
      useSuspense: false, // Disable suspense to handle async loading
    },
    // Ensure language change triggers reload
    load: "languageOnly", // Only load language, not region variants
  });

// Listen for language changes and ensure translations are loaded
i18n.on("languageChanged", async (lng) => {
  console.log("[i18n] Language changed event triggered for:", lng);
  // Normalize language code
  let normalizedLang = lng.toLowerCase();
  if (normalizedLang === "zh-tw" || normalizedLang === "zh-hk") {
    normalizedLang = "zh-tw";
  } else {
    normalizedLang = normalizedLang.split("-")[0];
  }
  
  // Map UI language codes to backend language codes
  const languageMap: Record<string, string> = {
    "jp": "ja",      // Japanese: UI uses "jp", backend uses "ja"
    "zh-tw": "zh-tw", // Traditional Chinese
    "zh": "zh",      // Simplified Chinese
    "ko": "ko",      // Korean
    "hi": "hi",      // Hindi
    "bn": "bn",      // Bengali
    "vi": "vi",      // Vietnamese
    "id": "id",      // Indonesian
    "th": "th",      // Thai
    "ms": "ms",      // Malay
  };
  normalizedLang = languageMap[normalizedLang] || normalizedLang;
  
  if (normalizedLang !== "en") {
    try {
      console.log("[i18n] Reloading resources for:", normalizedLang);
      // Always remove existing resource bundle to force fresh load
      if (i18n.hasResourceBundle(lng, "translation")) {
        i18n.removeResourceBundle(lng, "translation");
      }
      // Also remove by normalized code
      if (normalizedLang !== lng && i18n.hasResourceBundle(normalizedLang, "translation")) {
        i18n.removeResourceBundle(normalizedLang, "translation");
      }
      // Clear cache for this language
      dynamicBackend.clearCache(normalizedLang);
      if (normalizedLang !== lng) {
        dynamicBackend.clearCache(lng);
      }
      // Reload resources - this will trigger the backend read() function
      await i18n.reloadResources(lng, "translation");
      console.log("[i18n] Resources reloaded successfully");
    } catch (error) {
      console.error("[i18n] Failed to reload translations:", error);
    }
  }
});

export default i18n;

