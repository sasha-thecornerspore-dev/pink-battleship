import type { SiteConfig, ThemeId } from '@shared/models'

/**
 * Generates a self-contained static link-in-bio site as a single HTML string —
 * inline CSS, no external requests, no trackers. Runs entirely on the creator's
 * machine; the output is theirs to host anywhere (or open straight from disk).
 *
 * An 18+ age gate ships on by default: IG/TikTok/Reddit are far likelier to let
 * a link survive when the destination self-certifies adult content behind a
 * splash (a blueprint MUST).
 *
 * SECURITY: every interpolated value is HTML-escaped — a creator pasting `<` or a
 * quote into their bio or a link can never break the markup or inject script.
 */

export const DEFAULT_SITE: SiteConfig = {
  handle: '',
  displayName: '',
  tagline: '',
  bio: '',
  links: [{ label: '', url: '' }],
  theme: 'blush',
  ageGate: true,
}

const PALETTE: Record<ThemeId, { bg: string; surface: string; text: string; muted: string; primary: string; primaryDeep: string; border: string }> = {
  blush: { bg: '#fbf6f4', surface: '#ffffff', text: '#4a3a42', muted: '#8a7680', primary: '#c98ba8', primaryDeep: '#8e4f6e', border: '#e7d6dd' },
  lavender: { bg: '#f6f4fb', surface: '#ffffff', text: '#3e3850', muted: '#7c748f', primary: '#a99ad0', primaryDeep: '#6e5fa0', border: '#dcd4ec' },
  rose: { bg: '#faf5f2', surface: '#ffffff', text: '#463a39', muted: '#897873', primary: '#ce8595', primaryDeep: '#99505f', border: '#e7dcd4' },
}

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Only allow http(s) and mailto links through to href; anything else (javascript:, data:) becomes '#'. */
export function safeHref(url: string): string {
  const t = url.trim()
  return /^(https?:|mailto:)/i.test(t) ? esc(t) : '#'
}

function initial(name: string): string {
  const c = name.trim()[0] ?? '★'
  return esc(c.toUpperCase())
}

export function buildSite(config: SiteConfig): string {
  const p = PALETTE[config.theme] ?? PALETTE.blush
  const name = esc(config.displayName || config.handle || 'Your name')
  const tagline = config.tagline ? `<p class="tag">${esc(config.tagline)}</p>` : ''
  const bio = config.bio ? `<p class="bio">${esc(config.bio)}</p>` : ''
  const title = esc(config.displayName || config.handle || 'Links')

  const links = config.links
    .filter((l) => l.label.trim() && l.url.trim())
    .map((l) => `      <a class="lnk" href="${safeHref(l.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(l.label)}</a>`)
    .join('\n')

  const gate = config.ageGate
    ? `  <div id="gate">
    <div class="gate-card">
      <h2>This site contains adult content</h2>
      <p>You must be 18 years or older (21 where required) to enter.</p>
      <button id="enter" type="button">I am 18 or older — Enter</button>
      <a class="leave" href="https://www.google.com">Leave</a>
    </div>
  </div>
  <script>
    (function () {
      var g = document.getElementById('gate');
      try { if (sessionStorage.getItem('pb_age_ok')) g.style.display = 'none'; } catch (e) {}
      document.getElementById('enter').addEventListener('click', function () {
        try { sessionStorage.setItem('pb_age_ok', '1'); } catch (e) {}
        g.style.display = 'none';
      });
    })();
  </script>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${title}</title>
  <style>
    :root { --bg:${p.bg}; --surface:${p.surface}; --text:${p.text}; --muted:${p.muted}; --primary:${p.primary}; --deep:${p.primaryDeep}; --border:${p.border}; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text);
      min-height:100vh; display:flex; align-items:flex-start; justify-content:center; padding:48px 18px; }
    .wrap { width:100%; max-width:460px; text-align:center; }
    .avatar { width:88px; height:88px; border-radius:50%; margin:0 auto 16px; background:var(--primary); color:#fff;
      display:flex; align-items:center; justify-content:center; font-size:38px; font-weight:600; }
    h1 { margin:0 0 4px; font-size:24px; color:var(--deep); }
    .tag { margin:0 0 10px; color:var(--muted); font-size:15px; }
    .bio { margin:0 auto 24px; color:var(--text); font-size:14px; line-height:1.6; max-width:380px; }
    .lnk { display:block; background:var(--surface); border:1px solid var(--border); color:var(--deep); text-decoration:none;
      padding:15px 18px; border-radius:14px; margin:0 0 12px; font-size:15px; font-weight:500; transition:transform .08s ease; }
    .lnk:hover { transform:translateY(-2px); border-color:var(--primary); }
    footer { margin-top:28px; color:var(--muted); font-size:12px; }
    #gate { position:fixed; inset:0; background:var(--bg); display:flex; align-items:center; justify-content:center; padding:18px; z-index:10; }
    .gate-card { background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:30px 26px; max-width:360px; text-align:center; }
    .gate-card h2 { margin:0 0 10px; color:var(--deep); font-size:19px; }
    .gate-card p { color:var(--muted); font-size:14px; line-height:1.5; }
    #enter { margin-top:18px; width:100%; background:var(--primary); color:#fff; border:none; border-radius:12px; padding:14px; font-size:15px; cursor:pointer; }
    .leave { display:block; margin-top:12px; color:var(--muted); font-size:13px; }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="avatar">${initial(config.displayName || config.handle)}</div>
    <h1>${name}</h1>
    ${tagline}
    ${bio}
${links || '      <p class="bio">Add your first link to get started.</p>'}
    <footer>18+ · All content is of consenting adults.</footer>
  </main>
${gate}
</body>
</html>
`
}
