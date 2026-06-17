import { createHash } from 'node:crypto'
import type { ObsStatus } from '@shared/models'

/**
 * obs-websocket v5 client. OBS Studio exposes a WebSocket server on
 * 127.0.0.1:4455 (Tools → WebSocket Server Settings) — this is on-device, like
 * Ollama, so it never goes through the egress gateway. We do a short-lived
 * connect → identify → batch-query → close per status poll: stateless, robust,
 * and a dropped OBS just yields { connected:false } instead of a hung socket.
 *
 * The socket is injected so the whole protocol flow is unit-testable against a
 * fake OBS without a real instance running.
 */

const sha256b64 = (s: string): string => createHash('sha256').update(s).digest('base64')

/** obs-websocket auth: base64(sha256(base64(sha256(password + salt)) + challenge)). */
export function computeObsAuth(password: string, salt: string, challenge: string): string {
  return sha256b64(sha256b64(password + salt) + challenge)
}

export interface ObsSocket {
  send(data: string): void
  close(): void
  onOpen(cb: () => void): void
  onMessage(cb: (data: string) => void): void
  onError(cb: (err: unknown) => void): void
  onClose(cb: () => void): void
}

export type SocketFactory = (address: string) => ObsSocket

interface RawResponses {
  GetStreamStatus?: { outputActive?: boolean; outputDuration?: number }
  GetRecordStatus?: { outputActive?: boolean }
  GetSceneList?: { currentProgramSceneName?: string; scenes?: { sceneName?: string }[] }
}

/** Pure: fold the obs-websocket request responses into our ObsStatus shape. */
export function mergeObsStatus(r: RawResponses): ObsStatus {
  const scenes = (r.GetSceneList?.scenes ?? []).map((s) => s.sceneName ?? '').filter(Boolean)
  return {
    connected: true,
    streaming: r.GetStreamStatus?.outputActive ?? false,
    recording: r.GetRecordStatus?.outputActive ?? false,
    streamSeconds: Math.round((r.GetStreamStatus?.outputDuration ?? 0) / 1000),
    currentScene: r.GetSceneList?.currentProgramSceneName ?? '',
    scenes,
  }
}

const REQUESTS = ['GetStreamStatus', 'GetRecordStatus', 'GetSceneList'] as const

const offline = (error: string): ObsStatus => ({
  connected: false,
  streaming: false,
  recording: false,
  streamSeconds: 0,
  currentScene: '',
  scenes: [],
  error,
})

let nativeFactory: SocketFactory | null = null
function defaultFactory(address: string): ObsSocket {
  // Node 22 / Electron 42 ship a global WebSocket.
  const ws = new WebSocket(address)
  return {
    send: (d) => ws.send(d),
    close: () => ws.close(),
    onOpen: (cb) => ws.addEventListener('open', () => cb()),
    onMessage: (cb) => ws.addEventListener('message', (e: MessageEvent) => cb(String(e.data))),
    onError: (cb) => ws.addEventListener('error', (e) => cb(e)),
    onClose: (cb) => ws.addEventListener('close', () => cb()),
  }
}

export interface FetchObsOptions {
  password?: string
  factory?: SocketFactory
  timeoutMs?: number
}

/**
 * One-shot status poll. Resolves with a populated ObsStatus when OBS answers,
 * or an offline ObsStatus (with a friendly reason) on any failure — never rejects.
 */
export function fetchObsStatus(address: string, opts: FetchObsOptions = {}): Promise<ObsStatus> {
  const makeSocket = opts.factory ?? nativeFactory ?? defaultFactory
  const password = opts.password ?? ''
  const timeoutMs = opts.timeoutMs ?? 4000

  return new Promise((resolve) => {
    let sock: ObsSocket
    try {
      sock = makeSocket(address)
    } catch {
      resolve(offline('OBS WebSocket is unreachable. Is OBS open with the WebSocket server enabled?'))
      return
    }

    const responses: RawResponses = {}
    let settled = false
    const finish = (status: ObsStatus) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        sock.close()
      } catch {
        /* already closed */
      }
      resolve(status)
    }
    const timer = setTimeout(
      () => finish(offline('OBS did not respond. Check the WebSocket port and password in OBS settings.')),
      timeoutMs,
    )

    sock.onError(() => finish(offline('OBS WebSocket is unreachable. Is OBS open with the WebSocket server enabled?')))
    sock.onClose(() => {
      if (!settled) finish(offline('OBS closed the connection — the password may be wrong.'))
    })

    sock.onMessage((raw) => {
      let msg: { op: number; d: Record<string, unknown> }
      try {
        msg = JSON.parse(raw)
      } catch {
        return
      }
      // op 0 Hello → reply op 1 Identify (with auth if the server requires it)
      if (msg.op === 0) {
        const auth = msg.d.authentication as { challenge: string; salt: string } | undefined
        const d: Record<string, unknown> = { rpcVersion: 1 }
        if (auth) {
          if (!password) return finish(offline('OBS requires a WebSocket password — add it to connect.'))
          d.authentication = computeObsAuth(password, auth.salt, auth.challenge)
        }
        sock.send(JSON.stringify({ op: 1, d }))
        return
      }
      // op 2 Identified → fire the status requests
      if (msg.op === 2) {
        for (const requestType of REQUESTS) {
          sock.send(JSON.stringify({ op: 6, d: { requestType, requestId: requestType } }))
        }
        return
      }
      // op 7 RequestResponse → collect by requestId
      if (msg.op === 7) {
        const id = msg.d.requestId as keyof RawResponses
        responses[id] = (msg.d.responseData as never) ?? ({} as never)
        if (REQUESTS.every((r) => r in responses)) finish(mergeObsStatus(responses))
      }
    })
  })
}

/** Allow the main process to register a platform socket factory (tests inject their own). */
export function setObsSocketFactory(factory: SocketFactory | null): void {
  nativeFactory = factory
}
