// External resources surfaced in Help + inline "where do I get this?" links.
// All open in the user's real browser via pb.system.openExternal (never in-app).

/** Where each hosted AI provider issues API keys. */
export const PROVIDER_KEY_URLS: Record<string, string> = {
  gemini: 'https://aistudio.google.com/apikey',
  groq: 'https://console.groq.com/keys',
  cerebras: 'https://cloud.cerebras.ai/',
  openrouter_free: 'https://openrouter.ai/keys',
  openrouter: 'https://openrouter.ai/keys',
  claude: 'https://console.anthropic.com/settings/keys',
  openai: 'https://platform.openai.com/api-keys',
  venice: 'https://venice.ai/settings/api',
  atlas: 'https://www.atlascloud.ai/',
}

export const LINKS = {
  ollama: 'https://ollama.com/download',
  ollamaModels: 'https://ollama.com/library',
  chaturbateApps: 'https://chaturbate.com/apps/',
  chaturbateApiDocs: 'https://chaturbate.com/apps/docs/',
  obsDownload: 'https://obsproject.com/download',
  obsWebsocket: 'https://github.com/obsproject/obs-websocket',
}
