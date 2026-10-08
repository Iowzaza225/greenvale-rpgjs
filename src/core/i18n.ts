import th from "../i18n/th.json";
import en from "../i18n/en.json";
import { gameEvents } from "./event-bus";

export type Locale = "th" | "en";
type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  th: th as Dictionary,
  en: en as Dictionary,
};

const STORAGE_KEY = "greenvale.locale";
let currentLocale: Locale = "th";

function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const lang = value.toLowerCase().split("-")[0];
  return lang === "en" ? "en" : lang === "th" ? "th" : null;
}

export function initI18n(): Locale {
  if (typeof window === "undefined") return currentLocale;

  const query = new URLSearchParams(window.location.search).get("lang");
  const saved = (() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  })();

  currentLocale =
    normalizeLocale(query) ??
    normalizeLocale(saved) ??
    normalizeLocale(window.navigator.language) ??
    "th";

  gameEvents.emit("i18n:ready", { locale: currentLocale });
  return currentLocale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Safari private mode/storage restrictions: language still works for this session.
  }
  document.documentElement.lang = locale;
  gameEvents.emit("i18n:changed", { locale });
}

export function t(key: string, params: Record<string, string | number> = {}): string {
  const fallback = dictionaries.th[key] ?? key;
  const template = dictionaries[currentLocale][key] ?? fallback;
  return template.replace(/\{(\w+)\}/g, (_match, token: string) =>
    Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : `{${token}}`,
  );
}
