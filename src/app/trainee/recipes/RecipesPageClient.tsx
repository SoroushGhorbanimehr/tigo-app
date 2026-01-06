"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createRecipe, listRecipes, updateRecipe, uploadRecipeImage, deleteRecipe, uploadRecipeGalleryImages, listRecipeAlbumImages, deleteRecipeGalleryImage, type Recipe, type RecipeImage } from "@/lib/recipeRepo";

export default function RecipesPageClient() {
  const sp = useSearchParams();
  const mode = sp.get("mode"); // "trainer" or null
  const isTrainer = mode === "trainer";

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // create form (trainer only)
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const createDescRef = useRef<HTMLTextAreaElement | null>(null);
  const showToast = useCallback((message: string, ms = 1800) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), ms) as unknown as number;
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setRecipes(await listRecipes());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancel = false;
    const onToast = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (typeof ce.detail === "string") showToast(ce.detail);
    };
    document.addEventListener("recipes-toast", onToast as EventListener);
    setLoading(true);
    listRecipes()
      .then((rows) => {
        if (!cancel) setRecipes(rows);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
      document.removeEventListener("recipes-toast", onToast as EventListener);
    };
  }, [showToast]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return recipes;
    return recipes.filter((r) =>
      [r.title, r.description, r.slug]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [q, recipes]);

  async function handleCreate() {
    if (!title.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      await createRecipe({ title: title.trim(), description: desc.trim() || undefined });
      setTitle("");
      setDesc("");
      await refresh();
      setMsg("Created ✅");
      setTimeout(() => setMsg(""), 2000);
      showToast("Recipe created");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  function insertAtCursor(
    el: HTMLTextAreaElement | null,
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>
  ) {
    if (!el) {
      setValue((prev) => (prev || "") + value);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const prev = el.value;
    const next = prev.slice(0, start) + value + prev.slice(end);
    setValue(next);
    // move caret to end of inserted text
    requestAnimationFrame(() => {
      const pos = start + value.length;
      el.selectionStart = el.selectionEnd = pos;
      el.focus();
    });
  }

  const ING_STEPS_TEMPLATE = "## Ingredients\n- \n- \n\n## Steps\n1- \n2- \n";

  function onCreateInsertTemplate() {
    insertAtCursor(createDescRef.current, `\n${ING_STEPS_TEMPLATE}`, setDesc);
    showToast("Inserted Ingredients/Steps");
  }
  function onCreateInsertImage() {
    const url = window.prompt("Image URL (https://…)")?.trim();
    if (!url) return;
    insertAtCursor(createDescRef.current, `\n![image](${url})\n`, setDesc);
    showToast("Inserted image");
  }

  return (
    <div className="t-root">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 18,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#065f46",
            color: "white",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #064e3b",
            boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
            zIndex: 50,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {toast}
        </div>
      )}
      <header className="t-header">
        <h1 className="t-title">Recipes</h1>

        <Link
          href={isTrainer ? "/trainer" : "/trainee/today"}
          style={{ textDecoration: "underline", opacity: 0.9 }}
        >
          ← Back
        </Link>
      </header>

      {/* Trainer-only create */}
      {isTrainer && (
        <section className="t-card" style={{ marginTop: 14 }}>
          <h2 style={{ marginTop: 0 }}>Coach – Add new recipe</h2>

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g., Grilled Chicken Bowl)"
              style={inputStyle}
            />
            <div className="t-editor-toolbar" style={{ marginTop: 8 }}>
              <button type="button" className="t-toolbtn" onClick={onCreateInsertTemplate}>+ Ingredients/Steps</button>
              <button type="button" className="t-toolbtn" onClick={onCreateInsertImage}>+ Image</button>
              <button
                type="button"
                className="t-toolbtn"
                onClick={() => {
                  const insert = "\n1- Step one\n2- Step two\n3- Step three\n";
                  if (!createDescRef.current) setDesc((d) => (d || "") + insert);
                  else {
                    const el = createDescRef.current;
                    const start = el.selectionStart ?? el.value.length;
                    const end = el.selectionEnd ?? el.value.length;
                    const prev = el.value;
                    const next = prev.slice(0, start) + insert + prev.slice(end);
                    setDesc(next);
                    requestAnimationFrame(() => {
                      const pos = start + insert.length;
                      el.selectionStart = el.selectionEnd = pos;
                      el.focus();
                    });
                  }
                  showToast("Inserted steps");
                }}
              >
                + Steps (1-)
              </button>
              <button
                type="button"
                className="t-toolbtn"
                onClick={() => {
                  const insert = "\n> Tip: Use fresh herbs for best flavor.\n";
                  if (!createDescRef.current) setDesc((d) => (d || "") + insert);
                  else {
                    const el = createDescRef.current;
                    const start = el.selectionStart ?? el.value.length;
                    const end = el.selectionEnd ?? el.value.length;
                    const prev = el.value;
                    const next = prev.slice(0, start) + insert + prev.slice(end);
                    setDesc(next);
                    requestAnimationFrame(() => {
                      const pos = start + insert.length;
                      el.selectionStart = el.selectionEnd = pos;
                      el.focus();
                    });
                  }
                  showToast("Inserted tip");
                }}
              >
                + Tip
              </button>
            </div>

            <textarea
              ref={createDescRef}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Preparation steps / notes"
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={handleCreate} disabled={busy} style={buttonStyle}>
                {busy ? "Creating…" : "+ Create recipe"}
              </button>
              {msg && <span style={{ fontSize: 13, opacity: 0.9 }}>{msg}</span>}
            </div>
          </div>
        </section>
      )}

      {/* Library */}
      <section className="t-card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Recipe Library</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search recipes…"
            style={{ ...inputStyle, width: 320, maxWidth: "100%" }}
          />
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ opacity: 0.8 }}>No recipes found.</div>
          )}

          {!loading &&
            filtered.map((r) => (
              <div
                key={r.id}
                className="t-card t-listitem"
              >
                <Link
                  href={`/trainee/recipes/${r.slug}${isTrainer ? "?mode=trainer" : ""}`}
                  style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, textDecoration: "none", color: "inherit" }}
                >
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt="recipe" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 8, background: "#0f1420", border: "1px solid var(--cardBorder)" }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{r.title}</div>
                    <div style={{ opacity: 0.75, fontSize: 13, marginTop: 6, lineHeight: 1.3 }}>
                      {r.description?.slice(0, 120) ?? "No description"}
                    </div>
                  </div>
                </Link>

                {isTrainer && <TrainerControls r={r} onUpdated={refresh} />}
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

function TrainerControls(props: { r: Recipe; onUpdated: () => Promise<void> }) {
  const { r, onUpdated } = props;
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(r.title);
  const [desc, setDesc] = useState(r.description ?? "");
  const [msg, setMsg] = useState("");
  const [imageJustUploaded, setImageJustUploaded] = useState(false);
  const editDescRef = useRef<HTMLTextAreaElement | null>(null);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [album, setAlbum] = useState<RecipeImage[]>([]);
  const [albumBusy, setAlbumBusy] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const rows = await listRecipeAlbumImages(r.id);
        if (!cancel) setAlbum(rows);
      } catch {
        if (!cancel) setAlbum([]);
      }
    }
    load();
    return () => { cancel = true; };
  }, [r.id]);

  function toast(message: string) {
    document.dispatchEvent(new CustomEvent("recipes-toast", { detail: message }));
  }

  async function saveMeta() {
    setSaving(true);
    setMsg("");
    try {
      await updateRecipe(r.id, {
        title: title.trim() || r.title,
        description: desc.trim() || null,
      });
      await onUpdated();
      setMsg(imageJustUploaded ? "Saved ✅ Image saved." : "Saved ✅");
      setImageJustUploaded(false);
      setTimeout(() => setMsg(""), 1500);
      toast("Saved");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setSaving(true);
    setMsg("");
    try {
      await uploadRecipeImage(r.id, file);
      await onUpdated();
      setMsg("Image uploaded ✅");
      setImageJustUploaded(true);
      setTimeout(() => setMsg(""), 2000);
      toast("Image uploaded");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    const ok = window.confirm(`Delete recipe "${r.title}"? This cannot be undone.`);
    if (!ok) return;
    setSaving(true);
    setMsg("");
    try {
      await deleteRecipe(r.id);
      await onUpdated();
      toast("Deleted");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ width: 360, maxWidth: "45%", display: "grid", gap: 8 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} style={miniInputStyle} />
      <div className="t-editor-toolbar">
        <button
          type="button"
          className="t-toolbtn"
          onClick={() => {
            const tmpl = "## Ingredients\n- \n- \n\n## Steps\n1- \n2- \n";
            if (!editDescRef.current) setDesc((d) => (d || "") + "\n" + tmpl);
            else {
              const el = editDescRef.current;
              const start = el.selectionStart ?? el.value.length;
              const end = el.selectionEnd ?? el.value.length;
              const prev = el.value;
              const next = prev.slice(0, start) + "\n" + tmpl + prev.slice(end);
              setDesc(next);
              requestAnimationFrame(() => {
                const pos = start + ("\n" + tmpl).length;
                el.selectionStart = el.selectionEnd = pos;
                el.focus();
              });
            }
            document.dispatchEvent(new CustomEvent("recipes-toast", { detail: "Inserted Ingredients/Steps" }));
          }}
        >
          + Ingredients/Steps
        </button>
        <button
          type="button"
          className="t-toolbtn"
          onClick={() => {
            const url = window.prompt("Image URL (https://…)")?.trim();
            if (!url) return;
            const insert = `\n![image](${url})\n`;
            if (!editDescRef.current) setDesc((d) => (d || "") + insert);
            else {
              const el = editDescRef.current;
              const start = el.selectionStart ?? el.value.length;
              const end = el.selectionEnd ?? el.value.length;
              const prev = el.value;
              const next = prev.slice(0, start) + insert + prev.slice(end);
              setDesc(next);
              requestAnimationFrame(() => {
                const pos = start + insert.length;
                el.selectionStart = el.selectionEnd = pos;
                el.focus();
              });
            }
            document.dispatchEvent(new CustomEvent("recipes-toast", { detail: "Inserted image" }));
          }}
        >
          + Image
        </button>
      </div>
      <div className="t-editor-toolbar" style={{ marginTop: 6 }}>
        <button
          type="button"
          className="t-toolbtn"
          onClick={() => {
            const insert = "\n1- Step one\n2- Step two\n3- Step three\n";
            if (!editDescRef.current) setDesc((d) => (d || "") + insert);
            else {
              const el = editDescRef.current;
              const start = el.selectionStart ?? el.value.length;
              const end = el.selectionEnd ?? el.value.length;
              const prev = el.value;
              const next = prev.slice(0, start) + insert + prev.slice(end);
              setDesc(next);
              requestAnimationFrame(() => {
                const pos = start + insert.length;
                el.selectionStart = el.selectionEnd = pos;
                el.focus();
              });
            }
            document.dispatchEvent(new CustomEvent("recipes-toast", { detail: "Inserted steps" }));
          }}
        >
          + Steps (1-)
        </button>
        <button
          type="button"
          className="t-toolbtn"
          onClick={() => {
            const insert = "\n> Tip: Use fresh herbs for best flavor.\n";
            if (!editDescRef.current) setDesc((d) => (d || "") + insert);
            else {
              const el = editDescRef.current;
              const start = el.selectionStart ?? el.value.length;
              const end = el.selectionEnd ?? el.value.length;
              const prev = el.value;
              const next = prev.slice(0, start) + insert + prev.slice(end);
              setDesc(next);
              requestAnimationFrame(() => {
                const pos = start + insert.length;
                el.selectionStart = el.selectionEnd = pos;
                el.focus();
              });
            }
            document.dispatchEvent(new CustomEvent("recipes-toast", { detail: "Inserted tip" }));
          }}
        >
          + Tip
        </button>
      </div>
      <textarea ref={editDescRef} value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} style={{ ...miniInputStyle, resize: "vertical" }} />

      {/* Album manager toggle */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => setAlbumOpen((v) => !v)}
          style={{ ...miniButtonStyle }}
          type="button"
        >
          {albumOpen ? "Hide images" : "Manage images"}
        </button>
        <label style={{ ...miniButtonStyle, display: "inline-block", cursor: "pointer" }}>
          Upload to album
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length === 0) return;
              setAlbumBusy(true);
              try {
                const uploaded = await uploadRecipeGalleryImages(r.id, files);
                setAlbum((a) => [...uploaded, ...a]);
                document.dispatchEvent(new CustomEvent("recipes-toast", { detail: files.length > 1 ? "Images uploaded" : "Image uploaded" }));
              } catch (err) {
                document.dispatchEvent(new CustomEvent("recipes-toast", { detail: err instanceof Error ? err.message : "Upload failed" }));
              } finally {
                setAlbumBusy(false);
                e.currentTarget.value = ""; // reset input
              }
            }}
          />
        </label>
      </div>

      {albumOpen && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
          {album.length === 0 && <div style={{ opacity: 0.8 }}>No images yet.</div>}
          {album.map((img) => (
            <div key={img.path} className="t-card" style={{ padding: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.publicUrl} alt="recipe" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8 }} />
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={miniButtonStyle}
                  onClick={() => {
                    const insert = `\n![image](${img.publicUrl})\n`;
                    if (!editDescRef.current) {
                      setDesc((d) => (d || "") + insert);
                    } else {
                      const el = editDescRef.current;
                      const start = el.selectionStart ?? el.value.length;
                      const end = el.selectionEnd ?? el.value.length;
                      const prev = el.value;
                      const next = prev.slice(0, start) + insert + prev.slice(end);
                      setDesc(next);
                      requestAnimationFrame(() => {
                        const pos = start + insert.length;
                        el.selectionStart = el.selectionEnd = pos;
                        el.focus();
                      });
                    }
                    document.dispatchEvent(new CustomEvent("recipes-toast", { detail: "Inserted image" }));
                  }}
                >
                  Insert
                </button>
                <button
                  type="button"
                  style={miniButtonStyle}
                  onClick={async () => {
                    setSaving(true);
                    setMsg("");
                    try {
                      await updateRecipe(r.id, { image_url: img.publicUrl });
                      await onUpdated();
                      document.dispatchEvent(new CustomEvent("recipes-toast", { detail: "Set as main" }));
                    } catch (e: unknown) {
                      setMsg(e instanceof Error ? e.message : "Failed to set main");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Set main
                </button>
                <button
                  type="button"
                  style={{ ...miniButtonStyle, background: "#7f1d1d", borderColor: "#991b1b" }}
                  disabled={albumBusy}
                  onClick={async () => {
                    if (!window.confirm("Delete this image?")) return;
                    setAlbumBusy(true);
                    try {
                      await deleteRecipeGalleryImage(r.id, img.path);
                      setAlbum((a) => a.filter((x) => x.path !== img.path));
                      document.dispatchEvent(new CustomEvent("recipes-toast", { detail: "Image deleted" }));
                    } catch (e) {
                      document.dispatchEvent(new CustomEvent("recipes-toast", { detail: e instanceof Error ? e.message : "Delete failed" }));
                    } finally {
                      setAlbumBusy(false);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={saveMeta} disabled={saving} style={miniButtonStyle}>
          {saving ? "Saving…" : "Save"}
        </button>
        <label style={{ ...miniButtonStyle, display: "inline-block", cursor: "pointer" }}>
          Upload image
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
        </label>
        <button onClick={onDelete} disabled={saving} style={{ ...miniButtonStyle, background: "#7f1d1d", borderColor: "#991b1b" }}>
          Delete
        </button>
        {(imageJustUploaded || !!r.image_url) && (
          <span style={{ fontSize: 12, color: "#34d399" }}>Image ✅</span>
        )}
        {msg && <span style={{ fontSize: 12, opacity: 0.9 }}>{msg}</span>}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid var(--cardBorder)",
  background: "#0f1420",
  color: "#fff",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--cardBorder)",
  background: "#1f2937",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const miniInputStyle: React.CSSProperties = {
  padding: 8,
  borderRadius: 10,
  border: "1px solid var(--cardBorder)",
  background: "#0f1420",
  color: "#fff",
  fontSize: 13,
};

const miniButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid var(--cardBorder)",
  background: "#111827",
  color: "#fff",
  fontSize: 12,
};
