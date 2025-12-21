"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getRecipeBySlug, type Recipe } from "@/lib/recipeRepo";

export default function RecipePage() {
  const params = useParams<{ slug: string }>();
  const sp = useSearchParams();
  const isTrainer = sp.get("mode") === "trainer";

  const slug = params?.slug;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Minimal Markdown renderer for headings, bold, italics, lists, code blocks
  function mdToHtml(md: string) {
    const lines = md.replace(/\r\n?/g, "\n").split("\n");
    const html: string[] = [];
    let inCode = false;
    for (const raw of lines) {
      const line = raw;
      if (line.trim().startsWith("```") || line.trim().startsWith("~~~")) {
        inCode = !inCode;
        html.push(inCode ? '<pre><code>' : '</code></pre>');
        continue;
      }
      if (inCode) {
        html.push(escapeHtml(line) + "\n");
        continue;
      }

      // headings
      const h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) {
        const lvl = h[1].length;
        html.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`);
        continue;
      }
      // list item
      if (/^\s*[-*+]\s+/.test(line)) {
        const content = line.replace(/^\s*[-*+]\s+/, "");
        html.push(`<li>${inlineMd(content)}</li>`);
        continue;
      }
      // paragraph or blank
      if (line.trim() === "") {
        html.push("");
      } else {
        html.push(`<p>${inlineMd(line)}</p>`);
      }
    }
    // wrap <li> into <ul>
    const joined = html.join("\n");
    const ulWrapped = joined.replace(/(?:^(?:<li>.*<\/li>)(?:\n|$))+?/gm, (block) => {
      const items = block.trim();
      if (!items) return block;
      const lines = items.split(/\n/).filter(Boolean);
      if (lines.every((l) => l.startsWith("<li>"))) {
        return `<ul>\n${lines.join("\n")}\n</ul>`;
      }
      return block;
    });
    return ulWrapped;
  }

  function inlineMd(s: string) {
    let out = escapeHtml(s);
    out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    return out;
  }

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    getRecipeBySlug(slug)
      .then((row) => {
        if (!cancelled) setRecipe(row);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="t-root">
      <header className="t-header">
        <h1 className="t-title">Recipe</h1>
        <Link
          href={`/trainee/recipes${isTrainer ? "?mode=trainer" : ""}`}
          style={{ textDecoration: "underline", opacity: 0.9 }}
        >
          ← Back to Recipes
        </Link>
      </header>

      <div className="t-card">
        {loading && <div>Loading…</div>}

        {!loading && !recipe && (
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Not found</div>
            <div style={{ opacity: 0.8 }}>This recipe doesn’t exist.</div>
          </div>
        )}

        {!loading && recipe && (
          <>
            <h2 style={{ marginTop: 0 }}>{recipe.title}</h2>

            {recipe.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={recipe.image_url}
                alt={recipe.title}
                style={{
                  width: "100%",
                  maxHeight: 480,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid var(--cardBorder)",
                  background: "#0f1420",
                }}
              />
            ) : (
              <div style={{ opacity: 0.8 }}>No image uploaded yet.</div>
            )}

            <div
              style={{ marginTop: 14, lineHeight: 1.6, opacity: 0.95 }}
              dangerouslySetInnerHTML={{
                __html: recipe.description ? mdToHtml(recipe.description) : "<p>No description yet.</p>",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
