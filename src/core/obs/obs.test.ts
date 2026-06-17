import { describe, it, expect } from 'vitest'
import { computeObsAuth, mergeObsStatus, fetchObsStatus, type ObsSocket } from './obsClient'

describe('computeObsAuth', () => {
  it('is deterministic, 44-char base64, and challenge-sensitive', () => {
    const a = computeObsAuth('pw', 'salt', 'chal')
    expect(a).toBe(computeObsAuth('pw', 'salt', 'chal'))
    expect(a).toHaveLength(44)
    expect(a).not.toBe(computeObsAuth('pw', 'salt', 'other'))
  })
})

describe('mergeObsStatus', () => {
  it('folds raw responses into ObsStatus and converts duration ms→s', () => {
    const s = mergeObsStatus({
      GetStreamStatus: { outputActive: true, outputDuration: 90_000 },
      GetRecordStatus: { outputActive: false },
      GetSceneList: { currentProgramSceneName: 'Main', scenes: [{ sceneName: 'Main' }, { sceneName: 'BRB' }] },
    })
    expect(s).toMatchObject({ connected: true, streaming: true, recording: false, streamSeconds: 90, currentScene: 'Main', scenes: ['Main', 'BRB'] })
  })
})

/** A scripted obs-websocket v5 server for driving the client without real OBS. */
function fakeObs(opts: { auth?: { salt: string; challenge: string }; expectAuth?: (a: string) => void } = {}): {
  factory: (address: string) => ObsSocket
  sent: unknown[]
} {
  const sent: unknown[] = []
  const factory = (): ObsSocket => {
    let onMessage: (d: string) => void = () => {}
    const push = (obj: unknown) => queueMicrotask(() => onMessage(JSON.stringify(obj)))
    const sock: ObsSocket = {
      send: (data) => {
        const msg = JSON.parse(data) as { op: number; d: Record<string, unknown> }
        sent.push(msg)
        if (msg.op === 1) {
          if (opts.expectAuth) opts.expectAuth(msg.d.authentication as string)
          push({ op: 2, d: { negotiatedRpcVersion: 1 } }) // Identified
        }
        if (msg.op === 6) {
          const id = msg.d.requestId as string
          const data: Record<string, unknown> = {
            GetStreamStatus: { outputActive: true, outputDuration: 12_000 },
            GetRecordStatus: { outputActive: true },
            GetSceneList: { currentProgramSceneName: 'Cam', scenes: [{ sceneName: 'Cam' }, { sceneName: 'Away' }] },
          }[id]!
          push({ op: 7, d: { requestType: id, requestId: id, requestStatus: { result: true }, responseData: data } })
        }
      },
      close: () => {},
      onOpen: () => {},
      onMessage: (cb) => {
        onMessage = cb
      },
      onError: () => {},
      onClose: () => {},
    }
    // Server greets with Hello once handlers are wired.
    push({ op: 0, d: { obsWebSocketVersion: '5.0.0', rpcVersion: 1, ...(opts.auth ? { authentication: opts.auth } : {}) } })
    return sock
  }
  return { factory, sent }
}

describe('fetchObsStatus', () => {
  it('completes the handshake and returns live status (no auth)', async () => {
    const { factory } = fakeObs()
    const status = await fetchObsStatus('ws://127.0.0.1:4455', { factory })
    expect(status).toMatchObject({ connected: true, streaming: true, recording: true, streamSeconds: 12, currentScene: 'Cam' })
    expect(status.scenes).toEqual(['Cam', 'Away'])
  })

  it('authenticates with the salted challenge when OBS requires a password', async () => {
    let seen = ''
    const { factory } = fakeObs({ auth: { salt: 's4lt', challenge: 'ch4l' }, expectAuth: (a) => (seen = a) })
    const status = await fetchObsStatus('ws://127.0.0.1:4455', { factory, password: 'hunter2' })
    expect(seen).toBe(computeObsAuth('hunter2', 's4lt', 'ch4l'))
    expect(status.connected).toBe(true)
  })

  it('returns an offline status (never rejects) when OBS requires a password but none is set', async () => {
    const { factory } = fakeObs({ auth: { salt: 's', challenge: 'c' } })
    const status = await fetchObsStatus('ws://127.0.0.1:4455', { factory, password: '' })
    expect(status.connected).toBe(false)
    expect(status.error).toMatch(/password/i)
  })

  it('returns an offline status when the socket cannot be created', async () => {
    const status = await fetchObsStatus('ws://127.0.0.1:4455', {
      factory: () => {
        throw new Error('ECONNREFUSED')
      },
    })
    expect(status.connected).toBe(false)
    expect(status.error).toBeTruthy()
  })
})
