function printPreviewDocument(payload = {}) {
  const title = payload.title || "Tektite";
  const notePath = payload.path || "";
  const content = payload.html || "<p>Nothing to print.</p>";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src file: data:; style-src 'unsafe-inline';">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color: #1f2523; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { margin: 0; background: #ffffff; }
    main { max-width: 760px; margin: 0 auto; padding: 42px 48px 56px; font-size: 16px; line-height: 1.68; }
    .print-title { margin: 0 0 4px; font-size: 28px; line-height: 1.2; }
    .print-path { margin: 0 0 28px; color: #69746f; font-size: 12px; }
    h1, h2, h3 { line-height: 1.2; }
    h1 { font-size: 30px; }
    h2 { margin-top: 30px; font-size: 24px; }
    h3 { margin-top: 24px; font-size: 19px; }
    p, ul, ol, blockquote, pre, table { margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
    th, td { border: 1px solid #d9ddd8; padding: 7px 12px; text-align: left; }
    th { background: #f3f5f2; font-weight: 680; }
    code { border-radius: 4px; background: #f3f5f2; padding: 2px 5px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; font-size: 0.9em; }
    pre { overflow: auto; border: 1px solid #d9ddd8; border-radius: 8px; background: #1f2523; color: #f6f2e8; padding: 14px 16px; }
    pre code { background: transparent; padding: 0; color: inherit; }
    blockquote { border-left: 4px solid #2f7d5d; margin-left: 0; padding: 8px 0 8px 16px; color: #53615b; background: #f6f8f5; }
    a { color: #2c6fca; text-decoration: none; }
    img { display: block; max-width: 100%; height: auto; border-radius: 6px; margin: 0 0 16px; }
    @media print { main { max-width: none; padding: 0; } }
  </style>
</head>
<body>
  <main>
    <h1 class="print-title">${escapeHtml(title)}</h1>
    ${notePath ? `<p class="print-path">${escapeHtml(notePath)}</p>` : ""}
    <article>${content}</article>
  </main>
</body>
</html>`;
}

function printWebContents(printWindow) {
  return new Promise((resolve) => {
    printWindow.webContents.print({ printBackground: true }, (success, failureReason) => {
      resolve({ ok: success, error: success ? "" : failureReason || "Print canceled." });
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

module.exports = { printPreviewDocument, printWebContents };
