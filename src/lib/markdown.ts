// Minimal, safe markdown renderer for headings, lists, inline styles and code.
// Escapes raw HTML; supports: #, ##, ###, paragraphs, UL/OL, checkboxes, `code`, ``` fences, **bold**, *italic*, links.

export function escapeHtml(s: string): string {
  return s
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;")
    .replaceAll(/"/g, "&quot;")
    .replaceAll(/'/g, "&#39;");
}

function inlineFormat(s: string): string {
  // code spans
  s = s.replace(/`([^`]+?)`/g, (_, m) => `<code>${escapeHtml(m)}</code>`);
  // links [text](url)
  s = s.replace(/\[([^\]]+?)\]\((https?:[^\s)]+)\)/g, (_, txt, url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer noopener" class="t-link">${escapeHtml(txt)}</a>`);
  // bold then italic (avoid conflicts)
  s = s.replace(/\*\*([^*]+?)\*\*/g, (_, m) => `<strong>${escapeHtml(m)}</strong>`);
  s = s.replace(/\*([^*]+?)\*/g, (_, m) => `<em>${escapeHtml(m)}</em>`);
  return s;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  let html = "";
  const n = lines.length;
  let inCode = false;
  let codeBuf: string[] = [];

  function flushParagraph(buf: string[]) {
    if (!buf.length) return;
    const text = buf.join("\n");
    const esc = escapeHtml(text);
    const withInlines = inlineFormat(esc);
    const withBreaks = withInlines.replace(/\n/g, "<br/>");
    html += `<p>${withBreaks}</p>`;
    buf.length = 0;
  }

  while (i < n) {
    const raw = lines[i++];
    const line = raw;

    // code fences
    const fenceMatch = line.match(/^```/);
    if (fenceMatch) {
      if (!inCode) {
        inCode = true;
        codeBuf = [];
      } else {
        html += `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // blank line => paragraph break
    if (/^\s*$/.test(line)) {
      html += "\n"; // spacing
      continue;
    }

    // headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const content = inlineFormat(escapeHtml(h[2]));
      html += `<h${level}>${content}</h${level}>`;
      continue;
    }

    // unordered list or checklist
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      items.push(line);
      while (i < n && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i]);
        i++;
      }
      const li = items
        .map((it) => {
          const m = it.match(/^\s*[-*]\s+(.*)$/)!;
          const body = m[1];
          const cb = body.match(/^\[( |x|X)\]\s+(.*)$/);
          if (cb) {
            const checked = cb[1].toLowerCase() === "x";
            const label = inlineFormat(escapeHtml(cb[2]));
            return `<li><label class="t-md-check"><input type="checkbox" disabled ${checked ? "checked" : ""}/> ${label}</label></li>`;
          }
          return `<li>${inlineFormat(escapeHtml(body))}</li>`;
        })
        .join("");
      html += `<ul>${li}</ul>`;
      continue;
    }

    // ordered list (supports `1.` and `1-`)
    if (/^\s*\d+[.\-]\s+/.test(line)) {
      const items: string[] = [];
      items.push(line);
      while (i < n && /^\s*\d+[.\-]\s+/.test(lines[i])) {
        items.push(lines[i]);
        i++;
      }
      const li = items
        .map((it) => {
          const m = it.match(/^\s*\d+[.\-]\s+(.*)$/)!;
          return `<li>${inlineFormat(escapeHtml(m[1]))}</li>`;
        })
        .join("");
      html += `<ol class="t-steps">${li}</ol>`;
      continue;
    }

    // paragraph (collect consecutive non-blank, non-structural lines)
    const buf: string[] = [line];
    while (
      i < n &&
      !/^\s*$/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(#{1,3})\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    flushParagraph(buf);
  }

  if (inCode) {
    html += `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
  }

  return html;
}
