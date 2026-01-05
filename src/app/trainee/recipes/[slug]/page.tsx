"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getRecipeBySlug, listRecipeAlbumImages, type Recipe } from "@/lib/recipeRepo";

export default function RecipePage() {
  const params = useParams<{ slug: string }>();
  const sp = useSearchParams();
  const isTrainer = sp.get("mode") === "trainer";

  const slug = params?.slug;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [album, setAlbum] = useState<{ path: string; publicUrl: string }[]>([]);

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
    // images ![alt](url)
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_m, alt, url, title) => {
      const a = escapeHtml(alt);
      const u = escapeHtml(url);
      const t = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${u}" alt="${a}"${t} />`;
    });
    // links [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_m, text, url, title) => {
      const tx = escapeHtml(text);
      const u = escapeHtml(url);
      const t = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${u}" class="t-link" target="_blank" rel="noopener noreferrer"${t}>${tx}</a>`;
    });
    return out;
  }

  // Extract common sections from markdown by headings
  function parseSections(md: string): {
    ingredients: string | null;
    steps: string | null;
    rest: string;
  } {
    const lines = md.replace(/\r\n?/g, "\n").split("\n");
    let cur: "ingredients" | "steps" | "other" = "other";
    const buckets: Record<string, string[]> = { ingredients: [], steps: [], other: [] };
    for (const l of lines) {
      const h = /^(#{1,6})\s+(.*)$/.exec(l.trim());
      if (h) {
        const title = h[2].trim().toLowerCase();
        if (/^ingredients?\b/.test(title)) { cur = "ingredients"; continue; }
        if (/^(steps|directions?|method)\b/.test(title)) { cur = "steps"; continue; }
        cur = "other";
      }
      buckets[cur].push(l);
    }
    const ing = buckets.ingredients.join("\n").trim();
    const stp = buckets.steps.join("\n").trim();
    const oth = buckets.other.join("\n").trim();
    return {
      ingredients: ing.length ? ing : null,
      steps: stp.length ? stp : null,
      rest: oth,
    };
  }

  // Extract image urls from markdown image syntax
  function extractImageUrls(md: string): string[] {
    const urls: string[] = [];
    const re = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]+")?\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md))) {
      const url = m[1];
      if (typeof url === "string" && /^(https?:|data:)/i.test(url)) urls.push(url);
    }
    return urls;
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

  // Load storage album after recipe is known
  useEffect(() => {
    let cancelled = false;
    async function loadAlbum() {
      if (!recipe?.id) return setAlbum([]);
      try {
        const rows = await listRecipeAlbumImages(recipe.id);
        if (!cancelled) setAlbum(rows);
      } catch {
        if (!cancelled) setAlbum([]);
      }
    }
    loadAlbum();
    return () => { cancelled = true; };
  }, [recipe?.id]);

  // build image gallery list
  const gallery = useMemo(() => {
    const desc = recipe?.description ?? "";
    const albumUrls = album.map((a) => a.publicUrl);
    const list = [...albumUrls, recipe?.image_url, ...extractImageUrls(desc)].filter(
      (v): v is string => !!v
    );
    // de-dupe
    return Array.from(new Set(list));
  }, [recipe, album]);

  const [heroIndex, setHeroIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  useEffect(() => setHeroIndex(0), [recipe?.id]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (!lightboxOpen || gallery.length < 2) return;
      if (e.key === "ArrowRight") setHeroIndex((i) => (i + 1) % gallery.length);
      if (e.key === "ArrowLeft") setHeroIndex((i) => (i - 1 + gallery.length) % gallery.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, gallery.length]);

  return (
    <div className="t-root">
      <div className="t-stickybar">
        <div className="t-header" style={{ marginBottom: 0 }}>
          <div className="t-row">
            <h1 className="t-title">{recipe?.title || "Recipe"}</h1>
            <span className="t-chip t-chip--view" aria-hidden>
              Detail
            </span>
          </div>
          <Link
            href={`/trainee/recipes${isTrainer ? "?mode=trainer" : ""}`}
            className="t-btn t-btn--ghost"
          >
            ← Back
          </Link>
        </div>
      </div>

      <div className="t-card">
        {loading && (
          <>
            <div className="t-skel" style={{ height: 28, width: "48%", marginBottom: 10 }} />
            <div className="t-hero">
              <div className="t-aspect-16x9 t-skel" />
            </div>
            <div className="t-skel" style={{ height: 12, width: "90%", marginTop: 14 }} />
            <div className="t-skel" style={{ height: 12, width: "80%", marginTop: 8 }} />
            <div className="t-skel" style={{ height: 12, width: "70%", marginTop: 8 }} />
          </>
        )}

        {!loading && !recipe && (
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Not found</div>
            <div className="t-muted">This recipe doesn’t exist.</div>
          </div>
        )}

        {!loading && recipe && (
          <>
            <div className="t-section-head" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>{recipe.title}</h2>
              {gallery.length === 0 && <span className="t-chip">No image</span>}
            </div>

            <figure className="t-hero" onClick={() => gallery.length > 0 && setLightboxOpen(true)} style={{ cursor: gallery.length > 0 ? "zoom-in" : "default" }}>
              <div className="t-aspect-16x9">
                {gallery.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={gallery[Math.min(heroIndex, gallery.length - 1)]} alt={recipe.title} />
                ) : (
                  <div className="t-empty-media">No image uploaded yet</div>
                )}
              </div>
            </figure>

            {gallery.length > 1 && (
              <div className="t-thumbrow" role="tablist" aria-label="Recipe images">
                {gallery.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url + i}
                    src={url}
                    alt={`Image ${i + 1}`}
                    className="t-thumb"
                    aria-current={i === heroIndex}
                    onClick={() => { setHeroIndex(i); setLightboxOpen(true); }}
                  />
                ))}
              </div>
            )}

            {(() => {
              const md = recipe.description ?? "";
              const { ingredients, steps, rest } = parseSections(md);
              const hasColumns = ingredients && steps;
              if (hasColumns) {
                return (
                  <>
                    <div className="t-grid-2" style={{ marginTop: 12 }}>
                      <section className="t-col">
                        <h3 style={{ margin: 0 }}>Ingredients</h3>
                        <div className="t-md" dangerouslySetInnerHTML={{ __html: mdToHtml(ingredients!) }} />
                      </section>
                      <section className="t-col">
                        <h3 style={{ margin: 0 }}>Steps</h3>
                        <div className="t-md" dangerouslySetInnerHTML={{ __html: mdToHtml(steps!) }} />
                      </section>
                    </div>
                    {rest && rest.trim().length > 0 && (
                      <>
                        <hr className="t-divider" style={{ margin: "12px 0" }} />
                        <div className="t-md" dangerouslySetInnerHTML={{ __html: mdToHtml(rest) }} />
                      </>
                    )}
                  </>
                );
              }
              return (
                <div
                  className="t-md"
                  style={{ marginTop: 12 }}
                  dangerouslySetInnerHTML={{
                    __html: md ? mdToHtml(md) : "<p class='t-muted'>No description yet.</p>",
                  }}
                />
              );
            })()}
          </>
        )}
      </div>

      {lightboxOpen && gallery.length > 0 && (
        <div className="t-lightbox" role="dialog" aria-modal="true" onClick={() => setLightboxOpen(false)}>
          <button className="t-lightbox-close" aria-label="Close" onClick={() => setLightboxOpen(false)}>
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gallery[Math.min(heroIndex, gallery.length - 1)]}
            alt={recipe?.title || "Recipe image"}
            className="t-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          {gallery.length > 1 && (
            <div className="t-lightbox-arrows">
              <button className="t-lightbox-arrow" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setHeroIndex((i) => (i - 1 + gallery.length) % gallery.length); }}>
                ‹
              </button>
              <button className="t-lightbox-arrow" aria-label="Next" onClick={(e) => { e.stopPropagation(); setHeroIndex((i) => (i + 1) % gallery.length); }}>
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
