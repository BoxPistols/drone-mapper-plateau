// WebGL が使えない環境の見立て。BoxPistols/drone-show-simulator (#54) の browser.ts を土台に、
// CesiumJS を作る前の事前チェックと、埋め込み表示・地図データの通信失敗の見分けを足している。

export type BrowserKind = 'chrome' | 'edge' | 'firefox' | 'safari' | 'opera' | 'samsung' | 'other'
export type PlatformKind = 'ios' | 'android' | 'desktop'

/**
 * Edge・Opera・Samsung Internet の UA にも "Chrome" が入るので、それらを先に見る。
 * Brave / Vivaldi は UA が Chrome と同じなので chrome として扱う（手順も同じ）。
 */
export function detectBrowser(ua: string): BrowserKind {
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'edge'
  if (/OPR\/|OPT\/|Opera\//.test(ua)) return 'opera'
  if (/SamsungBrowser\//.test(ua)) return 'samsung'
  if (/Firefox\/|FxiOS\//.test(ua)) return 'firefox'
  if (/Chrome\/|CriOS\//.test(ua)) return 'chrome'
  if (/Safari\//.test(ua)) return 'safari'
  return 'other'
}

/** iPadOS の Safari は Mac と同じ UA を名乗るので、タッチ点の数で見分ける */
export function detectPlatform(ua: string, maxTouchPoints = 0): PlatformKind {
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Macintosh/.test(ua) && maxTouchPoints > 1) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

/**
 * - api-missing: WebGL の機能そのものが無い（設定・拡張機能・管理ポリシー・ロックダウンモード）
 * - disabled: 管理ポリシーや起動オプション、about:config で明示的に切られている
 * - blocked: GPU の処理が落ちたあと、ブラウザがこのサイトの WebGL を一時的に止めている
 * - creation-failed: 機能はあるが GPU を使えない（ハードウェアアクセラレーションがオフ、ドライバが対応外、仮想環境など）
 * - context-lost: 表示中に GPU を失った（ドライバの再起動、スリープ復帰、メモリ不足など）
 */
export type WebglFailureKind = 'api-missing' | 'disabled' | 'blocked' | 'creation-failed' | 'context-lost'

export type WebglFailure = {
  kind: WebglFailureKind
  /** ブラウザや Cesium が返した説明（ブラウザにより空） */
  detail: string
  /** iframe の中で開かれている。プレビュー画面などの埋め込み先が WebGL を止めていることがある */
  embedded: boolean
}

export function diagnoseWebglFailure(apiPresent: boolean, statusMessage: string, embedded = false): WebglFailure {
  const detail = statusMessage.trim()
  if (!apiPresent) return { kind: 'api-missing', detail, embedded }
  // Chrome: "disabled by enterprise policy or commandline switch"
  if (/enterprise policy|commandline switch|webgl\.disabled/i.test(detail)) return { kind: 'disabled', detail, embedded }
  // Chrome: "Web page caused context loss and was blocked"。Firefox の "blocklist" はドライバの対応外なので別扱い
  if (/caused context loss|was blocked/i.test(detail)) return { kind: 'blocked', detail, embedded }
  return { kind: 'creation-failed', detail, embedded }
}

/** 親ページに埋め込まれているか。別オリジンの親だと window.top の参照自体が例外になるので、それも埋め込みとみなす */
export function isEmbedded(win: { readonly self: unknown; readonly top: unknown }): boolean {
  try {
    return win.self !== win.top
  } catch {
    return true
  }
}

type ProbeCanvas = Pick<HTMLCanvasElement, 'getContext' | 'addEventListener' | 'removeEventListener'>

export type ProbeEnv = {
  createCanvas: () => ProbeCanvas
  /** WebGLRenderingContext がグローバルにあるか。無ければ機能ごと外されている */
  apiPresent: boolean
  embedded: boolean
}

export type WebglProbe = { ok: true; version: 1 | 2 } | { ok: false; failure: WebglFailure }

/**
 * CesiumJS の Viewer を作る前に、WebGL2 → WebGL1 の順で文脈が作れるかを試す。
 * Cesium は WebGL2 を優先し、無ければ WebGL1 で動くので、どちらか取れれば足りる。
 * 失敗の理由は webglcontextcreationerror の statusMessage でしか分からないため、試す前に購読しておく。
 */
export function probeWebgl(env: ProbeEnv): WebglProbe {
  if (!env.apiPresent) return { ok: false, failure: diagnoseWebglFailure(false, '', env.embedded) }

  let status = ''
  const onError = (e: Event) => {
    const msg = (e as Event & { statusMessage?: string }).statusMessage
    if (msg) status = msg
  }

  for (const [id, version] of [['webgl2', 2], ['webgl', 1]] as const) {
    const canvas = env.createCanvas()
    canvas.addEventListener('webglcontextcreationerror', onError)
    let ctx: unknown = null
    try {
      ctx = canvas.getContext(id)
    } catch (e) {
      status = status || (e instanceof Error ? e.message : String(e))
    }
    canvas.removeEventListener('webglcontextcreationerror', onError)
    if (ctx) {
      // 試しに作った文脈を手放して、Cesium が使える GPU の枠を残す
      const lose = (ctx as WebGLRenderingContext).getExtension?.('WEBGL_lose_context')
      lose?.loseContext()
      return { ok: true, version }
    }
  }
  return { ok: false, failure: diagnoseWebglFailure(true, status, env.embedded) }
}

/** ブラウザ上での既定の環境。テストでは ProbeEnv を直接渡す */
export function browserProbeEnv(): ProbeEnv {
  return {
    createCanvas: () => document.createElement('canvas'),
    apiPresent: typeof window !== 'undefined' && 'WebGLRenderingContext' in window,
    embedded: typeof window !== 'undefined' && isEmbedded(window),
  }
}

/** Cesium の Viewer 作成時の例外から見立てる。WebGL 以外の例外はそのまま投げ直すため null を返す */
export function diagnoseViewerError(error: unknown, embedded: boolean): WebglFailure | null {
  const message = error instanceof Error ? error.message : String(error)
  if (!/webgl|context/i.test(message)) return null
  return diagnoseWebglFailure(true, message, embedded)
}

export type TilesFailureKind = 'offline' | 'blocked-or-unreachable' | 'server' | 'unknown'

/**
 * 3D 都市モデル（PLATEAU の 3D Tiles）が読めなかった理由。
 * Cesium の RequestErrorEvent は statusCode を持ち、通信そのものが遮断されたとき（CORS・CSP・社内フィルタ・DNS）は statusCode が無い。
 */
export function diagnoseTilesError(error: unknown, online: boolean): TilesFailureKind {
  if (!online) return 'offline'
  const status = (error as { statusCode?: unknown } | null)?.statusCode
  if (typeof status === 'number' && status >= 400) return 'server'
  if (error && typeof error === 'object' && 'statusCode' in error) return 'blocked-or-unreachable'
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return 'blocked-or-unreachable'
  return 'unknown'
}
