import { useState, type ReactNode } from 'react'
import ExternalLink from '../components/ExternalLink'
import { LINKS } from '../lib/links'
import { useUi } from '../store/ui'

type Item = { q: string; keywords: string; body: ReactNode }

export default function Help() {
  const [query, setQuery] = useState('')
  const setRoute = useUi((s) => s.setRoute)
  const go = (r: Parameters<typeof setRoute>[0]) => () => setRoute(r)

  const items: Item[] = [
    {
      q: 'Getting started in 3 steps',
      keywords: 'start begin setup first run passphrase onboarding',
      body: (
        <ol style={ol}>
          <li>Set a <b>passphrase</b> on first run — it encrypts your local vault. It’s never sent anywhere and can’t be recovered if lost, so store it safely.</li>
          <li>Add income: <Link onClick={go('connectors')}>Connectors</Link> → Connect Chaturbate, or <Link onClick={go('import')}>Import</Link> a CSV from OnlyFans / Fansly / ManyVids.</li>
          <li>Open the <Link onClick={go('dashboard')}>Dashboard</Link> for your unified net P&amp;L. Everything is computed on this device.</li>
        </ol>
      ),
    },
    {
      q: 'Where do I get my Chaturbate Events API URL?',
      keywords: 'chaturbate cb events api token connect url eventsapi live',
      body: (
        <>
          <ol style={ol}>
            <li>Sign in to Chaturbate, then open <ExternalLink href={LINKS.chaturbateApps}>Apps &amp; Bots</ExternalLink> (under your username menu → “Apps &amp; Bots”).</li>
            <li>Find the <b>Events API</b> and authorize it for your account. You’ll get a URL shaped like <code style={code}>https://eventsapi.chaturbate.com/events/&lt;user&gt;/&lt;token&gt;/</code>.</li>
            <li>Paste that URL into <Link onClick={go('connectors')}>Connectors → Chaturbate — live</Link>. It’s stored in your OS keychain, and only that one host is ever contacted.</li>
          </ol>
          <p style={muted}>Reference: <ExternalLink href={LINKS.chaturbateApiDocs}>Chaturbate API docs</ExternalLink>. Treat the URL like a password — it contains your token. Disconnecting wipes it.</p>
        </>
      ),
    },
    {
      q: 'Free AI vs paid — how do I set it up?',
      keywords: 'ai assistant ollama local model api key gemini groq claude openai venice free paid',
      body: (
        <>
          <p style={p}><b>Free &amp; local (recommended baseline):</b> install <ExternalLink href={LINKS.ollama}>Ollama</ExternalLink>, then pull a model — e.g. run <code style={code}>ollama pull dolphin-llama3:8b</code>. It appears automatically under <Link onClick={go('settings')}>Settings → AI providers</Link>. Runs on your machine, free, private, and explicit-capable. Browse models at <ExternalLink href={LINKS.ollamaModels}>ollama.com/library</ExternalLink>.</p>
          <p style={p}><b>Bring your own key (hosted):</b> paste an API key in <Link onClick={go('settings')}>Settings → AI providers</Link>. Each provider row links straight to its key page. Free tiers (Gemini/Groq/Cerebras/OpenRouter) are SFW-only; paid keys add premium SFW (Claude/GPT) and explicit-capable cloud (Venice/Atlas/OpenRouter).</p>
          <p style={muted}>The safety router always keeps explicit work off SFW providers and forces anything with fan PII onto a local, no-log backend.</p>
        </>
      ),
    },
    {
      q: 'Connect OBS to see your stream status',
      keywords: 'obs websocket live stream scene port 4455 connect',
      body: (
        <ol style={ol}>
          <li>Install/open <ExternalLink href={LINKS.obsDownload}>OBS Studio</ExternalLink> (the WebSocket server is built in since OBS 28).</li>
          <li>In OBS: <b>Tools → WebSocket Server Settings → Enable WebSocket server</b>. Note the port (default 4455) and password if you set one.</li>
          <li>Enter them in <Link onClick={go('live')}>Live (OBS)</Link>. It’s a local connection (127.0.0.1) — nothing leaves your machine.</li>
        </ol>
      ),
    },
    {
      q: 'Importing a CSV from OnlyFans / Fansly / ManyVids',
      keywords: 'csv import onlyfans fansly manyvids columns mapping earnings statement',
      body: (
        <p style={p}>
          Export your earnings/statement CSV from the platform, then open <Link onClick={go('import')}>Import</Link>, pick the platform, and drop the file. Columns are auto-detected; tweak the mapping if needed and import. Nothing is uploaded — parsing happens on this device. These platforms are import-only by design (no automation = no ban risk).
        </p>
      ),
    },
    {
      q: 'Is my data private? Where does it live?',
      keywords: 'privacy private local encrypted vault telemetry panic lock security backup',
      body: (
        <p style={p}>
          Everything lives in an encrypted SQLite vault on this machine — no cloud account, no telemetry. The only outbound traffic is connectors/AI you explicitly enable, all listed under <Link onClick={go('settings')}>Settings → What leaves your machine</Link>. Use <b>Lock vault</b> (or Settings → panic-lock) to instantly wipe the key from memory. Because there’s no cloud backup, keep your passphrase safe and back up your machine.
        </p>
      ),
    },
    {
      q: 'Troubleshooting',
      keywords: 'troubleshoot rebuild ollama not detected obs not connecting error native build',
      body: (
        <ul style={ul}>
          <li><b>“Ollama: not detected”</b> — make sure Ollama is running and you’ve pulled at least one model (<code style={code}>ollama pull dolphin-llama3:8b</code>).</li>
          <li><b>OBS won’t connect</b> — confirm the WebSocket server is enabled, the port matches, and the password is right. OBS must be open.</li>
          <li><b>Native module errors after an update</b> — run <code style={code}>npm run rebuild</code> to rebuild the encrypted-DB module against Electron’s ABI.</li>
          <li><b>No thumbnails on import</b> — thumbnails use the optional <code style={code}>sharp</code> library; import still works without it. Re-run <code style={code}>npm install</code> then <code style={code}>npm run rebuild</code>.</li>
        </ul>
      ),
    },
  ]

  const q = query.trim().toLowerCase()
  const shown = q ? items.filter((i) => (i.q + ' ' + i.keywords).toLowerCase().includes(q)) : items

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>Help</div>
      <p style={{ color: 'var(--pb-text-muted)', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
        Setup guides and where to get everything. Prefer a walkthrough? Click <b>Take a tour</b> in the sidebar.
      </p>

      <input className="pb-input" placeholder="Search help… (e.g. “api token”, “ollama”, “obs”)" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: '100%', marginBottom: 16 }} />

      {shown.length === 0 && <p style={muted}>No matches. Try “api”, “ollama”, “obs”, “csv”, or “privacy”.</p>}

      {shown.map((i) => (
        <div key={i.q} className="pb-card" style={{ padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ fontSize: 14, marginBottom: 8, color: 'var(--pb-primary-deep)' }}>{i.q}</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--pb-text)' }}>{i.body}</div>
        </div>
      ))}
    </div>
  )
}

function Link({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <a onClick={onClick} style={{ color: 'var(--pb-primary-deep)', cursor: 'pointer', textDecoration: 'underline' }}>
      {children}
    </a>
  )
}

const p: React.CSSProperties = { margin: '0 0 10px' }
const muted: React.CSSProperties = { margin: 0, fontSize: 12, color: 'var(--pb-text-muted)', lineHeight: 1.6 }
const ol: React.CSSProperties = { margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 7 }
const ul: React.CSSProperties = { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 7 }
const code: React.CSSProperties = { background: 'var(--pb-track)', padding: '1px 5px', borderRadius: 5, fontSize: 12 }
