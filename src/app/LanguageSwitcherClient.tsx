"use client";
import { useI18n, type Lang } from "@/lib/i18n/I18nProvider";

export default function LanguageSwitcherClient() {
  const { lang, setLang } = useI18n();
  const Link = ({ code, label }: { code: Lang; label: string }) => (
    <button
      type="button"
      onClick={() => setLang(code)}
      aria-current={lang === code ? "true" : undefined}
      style={{
        color: "#fff",
        textDecoration: "none",
        opacity: lang === code ? 1 : 0.85,
        fontWeight: lang === code ? 900 : 700,
        background: "transparent",
        border: 0,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        display: "flex",
        gap: 8,
        fontWeight: 700,
        opacity: 0.95,
      }}
      aria-label="Language selector"
    >
      <Link code="en" label="EN" />
      <span style={{ opacity: 0.7 }}>|</span>
      <Link code="fr" label="FR" />
      <span style={{ opacity: 0.7 }}>|</span>
      <Link code="es" label="ES" />
    </div>
  );
}

