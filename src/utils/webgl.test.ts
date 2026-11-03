import { describe, expect, it } from 'vitest'
import {
  detectBrowser,
  detectPlatform,
  diagnoseTilesError,
  diagnoseViewerError,
  diagnoseWebglFailure,
  isEmbedded,
  probeWebgl,
  type ProbeEnv,
} from './webgl'
import { causeText, fixGuide } from '../constants/webglCopy'

const UA = {
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
  edgeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0.0.0',
  firefoxWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36',
}

type Listener = (e: Event) => void

/** getContext の結果と、失敗時に飛ぶ webglcontextcreationerror を差し替えられる偽の canvas */
function fakeEnv(opts: {
  apiPresent?: boolean
  contexts?: Partial<Record<'webgl2' | 'webgl', boolean>>
  statusMessage?: string
  throws?: Error
  embedded?: boolean
}): ProbeEnv & { lost: number } {
  const env = {
    lost: 0,
    apiPresent: opts.apiPresent ?? true,
    embedded: opts.embedded ?? false,
    createCanvas: () => {
      const listeners: Listener[] = []
      return {
        addEventListener: (_type: string, l: Listener) => listeners.push(l),
        removeEventListener: () => {},
        getContext: (id: string) => {
          if (opts.throws) throw opts.throws
          if (opts.contexts?.[id as 'webgl2' | 'webgl']) {
            return { getExtension: () => ({ loseContext: () => { env.lost += 1 } }) }
          }
          if (opts.statusMessage) {
            const e = Object.assign(new Event('webglcontextcreationerror'), { statusMessage: opts.statusMessage })
            listeners.forEach((l) => l(e))
          }
          return null
        },
      } as unknown as HTMLCanvasElement
    },
  }
  return env
}

describe('probeWebgl', () => {
  it('WebGL2 が取れれば version 2 で、試した文脈は手放す', () => {
    const env = fakeEnv({ contexts: { webgl2: true } })
    expect(probeWebgl(env)).toEqual({ ok: true, version: 2 })
    expect(env.lost).toBe(1)
  })

  it('WebGL2 が無くても WebGL1 が取れれば使える（Cesium は WebGL1 で動く）', () => {
    expect(probeWebgl(fakeEnv({ contexts: { webgl: true } }))).toEqual({ ok: true, version: 1 })
  })

  it('WebGLRenderingContext 自体が無ければ api-missing', () => {
    const r = probeWebgl(fakeEnv({ apiPresent: false }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.failure.kind).toBe('api-missing')
  })

  it('--disable-webgl 相当（Chrome の statusMessage）は disabled', () => {
    const r = probeWebgl(fakeEnv({ statusMessage: 'Web page was not allowed to create a WebGL context: disabled by enterprise policy or commandline switch' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.failure).toMatchObject({ kind: 'disabled', embedded: false })
  })

  it('ハードウェアアクセラレーションがオフ等で理由が空なら creation-failed', () => {
    const r = probeWebgl(fakeEnv({}))
    if (!r.ok) expect(r.failure.kind).toBe('creation-failed')
    else throw new Error('expected failure')
  })

  it('getContext が例外を投げても落ちずに見立てる', () => {
    const r = probeWebgl(fakeEnv({ throws: new Error('boom') }))
    if (!r.ok) expect(r.failure).toMatchObject({ kind: 'creation-failed', detail: 'boom' })
    else throw new Error('expected failure')
  })

  it('埋め込み表示の情報を引き継ぐ', () => {
    const r = probeWebgl(fakeEnv({ embedded: true }))
    if (!r.ok) expect(r.failure.embedded).toBe(true)
    else throw new Error('expected failure')
  })
})

describe('diagnoseWebglFailure', () => {
  it('context loss 後のブロックは blocked', () => {
    expect(diagnoseWebglFailure(true, 'Web page caused context loss and was blocked').kind).toBe('blocked')
  })
  it('Firefox の webgl.disabled は disabled', () => {
    expect(diagnoseWebglFailure(true, 'WebGL is disabled (webgl.disabled = true)').kind).toBe('disabled')
  })
})

describe('isEmbedded', () => {
  it('self と top が同じならトップレベル', () => {
    const w = {} as Window
    expect(isEmbedded({ self: w, top: w })).toBe(false)
  })
  it('iframe の中なら埋め込み', () => {
    expect(isEmbedded({ self: {}, top: {} })).toBe(true)
  })
  it('別オリジンで top を読めなくても埋め込みとみなす', () => {
    const w = { self: {} } as { self: unknown; top: unknown }
    Object.defineProperty(w, 'top', { get: () => { throw new Error('SecurityError') } })
    expect(isEmbedded(w)).toBe(true)
  })
})

describe('diagnoseViewerError', () => {
  it('Cesium の WebGL 初期化失敗を creation-failed に変える', () => {
    const f = diagnoseViewerError(new Error('The browser supports WebGL, but initialization failed.'), false)
    expect(f).toMatchObject({ kind: 'creation-failed' })
  })
  it('WebGL と無関係な例外は扱わない（呼び出し側で投げ直す）', () => {
    expect(diagnoseViewerError(new Error('container is null'), false)).toBeNull()
  })
})

describe('diagnoseTilesError', () => {
  it('オフライン', () => {
    expect(diagnoseTilesError(new Error('x'), false)).toBe('offline')
  })
  it('statusCode が無い RequestErrorEvent は遮断・到達不能', () => {
    expect(diagnoseTilesError({ statusCode: undefined }, true)).toBe('blocked-or-unreachable')
  })
  it('fetch の TypeError も遮断・到達不能', () => {
    expect(diagnoseTilesError(new TypeError('Failed to fetch'), true)).toBe('blocked-or-unreachable')
  })
  it('4xx/5xx はサーバー側', () => {
    expect(diagnoseTilesError({ statusCode: 503 }, true)).toBe('server')
  })
  it('それ以外は unknown', () => {
    expect(diagnoseTilesError(new Error('parse error'), true)).toBe('unknown')
  })
})

describe('detectBrowser / detectPlatform', () => {
  it.each([
    [UA.chromeMac, 'chrome', 'desktop'],
    [UA.edgeWin, 'edge', 'desktop'],
    [UA.firefoxWin, 'firefox', 'desktop'],
    [UA.safariMac, 'safari', 'desktop'],
    [UA.iphone, 'safari', 'ios'],
    [UA.android, 'chrome', 'android'],
  ])('%s', (ua, browser, platform) => {
    expect(detectBrowser(ua)).toBe(browser)
    expect(detectPlatform(ua)).toBe(platform)
  })
  it('タッチ対応の Mac UA は iPad とみなす', () => {
    expect(detectPlatform(UA.safariMac, 5)).toBe('ios')
  })
})

describe('案内文', () => {
  it('Chrome on macOS は chrome://settings/system と chrome://gpu を案内する', () => {
    const g = fixGuide('chrome', 'desktop')
    const flat = JSON.stringify(g)
    expect(flat).toContain('chrome://settings/system')
    expect(flat).toContain('chrome://gpu')
  })
  it('どの見立てでも「公開URLで開く」とは言わない', () => {
    for (const kind of ['api-missing', 'disabled', 'blocked', 'creation-failed', 'context-lost'] as const) {
      expect(causeText(kind, 'desktop', 'chrome')).not.toMatch(/公開/)
    }
  })
})
