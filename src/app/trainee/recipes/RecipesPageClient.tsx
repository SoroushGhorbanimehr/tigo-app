"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createRecipe, listRecipes, updateRecipe, uploadRecipeImage, deleteRecipe, type Recipe } from "@/lib/recipeRepo";

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
            <textarea
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
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} style={{ ...miniInputStyle, resize: "vertical" }} />

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
