"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/** App language. Stored per-device (localStorage) like theme/goal; default
 *  English. Golf terms (club names, units, Carry/Smash/Spin headers) are
 *  intentionally never translated · Thai golfers use them as-is. */
export type Lang = "en" | "th";

const KEY = "topgolf:lang";

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

/** SSR-safe: first paint is English, then hydrates from localStorage. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>("en");
  useEffect(() => {
    const v = localStorage.getItem(KEY);
    if (v === "th" || v === "en") set(v);
  }, []);
  const setLang = (l: Lang) => {
    set(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* private mode · keep in-memory value */
    }
  };
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

/** Per-component dictionary entry: every key has both languages. */
export type Dict<K extends string = string> = Record<K, Record<Lang, string>>;

/** const L = { save: { en: "Save", th: "บันทึก" } } satisfies Dict;
 *  const t = useT(L); … t("save") */
export function useT<D extends Dict>(dict: D) {
  const { lang } = useLang();
  return (k: keyof D) => dict[k][lang];
}
