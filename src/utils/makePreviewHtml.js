export default function makePreviewHtml(title, request) {
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const safeTitle = escapeHtml(title);
  const safeRequest = escapeHtml(request);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <style>
    :root{font-family:Inter,system-ui,sans-serif;color:#172033;background:#f3f5f7}
    body{max-width:760px;margin:0 auto;padding:48px 24px}
    main{background:white;border:1px solid #e6eaf0;border-radius:24px;padding:32px;box-shadow:0 18px 50px #24324a12}
    h1{font-size:clamp(2rem,6vw,3.5rem);line-height:1.05;margin:0 0 20px}
    p{line-height:1.7;color:#536176}small{color:#0891b2;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  </style>
</head>
<body><main><small>AI Mind Pilot · Draft</small><h1>${safeTitle}</h1><p>${safeRequest}</p></main></body>
</html>`;
}
