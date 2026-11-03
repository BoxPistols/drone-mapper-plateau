import { useEffect, useRef, useState } from 'react'
import { detectBrowser, detectPlatform, type WebglFailure } from '../utils/webgl'
import { causeText, fixGuide, PRODUCT_COPY, WEBGL_COPY, type CopyLine } from '../constants/webglCopy'

const BASE = import.meta.env.BASE_URL
const VIDEO_SRC = `${BASE}demo/drone-mapper-plateau.mp4`
const POSTER_SRC = `${BASE}demo/drone-mapper-plateau-poster.jpg`
const CAPTIONS_SRC = `${BASE}demo/drone-mapper-plateau.ja.vtt`

function renderLine(line: CopyLine) {
  return line.map((seg, i) => (typeof seg === 'string' ? seg : <code key={i}>{seg.code}</code>))
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

const ICON = {
  width: 18, height: 18, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const

type Props = {
  failure: WebglFailure
  /** WebGL をもう一度確かめる。使えれば true（App が地図に戻す） */
  onRetry: () => boolean
}

/**
 * WebGL が使えない環境で地図の代わりに出す画面。
 * 採用担当などが初見で開いても「何のアプリで、どう動くか」が伝わるよう、直し方より先に製品紹介と動画を置く。
 */
export function WebglFallback({ failure, onRetry }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [retryFailed, setRetryFailed] = useState(false)
  const [reduced] = useState(prefersReducedMotion)

  const ua = navigator.userAgent
  const browser = detectBrowser(ua)
  const platform = detectPlatform(ua, navigator.maxTouchPoints ?? 0)
  const guide = fixGuide(browser, platform)

  // React は muted を属性に反映しないため、自動再生がブロックされないよう DOM のプロパティで立てる
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = true
  }, [])

  return (
    <section className="webgl-fallback" aria-labelledby="webgl-fallback-title" data-testid="webgl-fallback">
      <div className="wf-inner">
        <header className="wf-head">
          <span className="wf-badge" aria-hidden="true">
            <svg {...ICON} width={22} height={22}>
              <path d="M8 1.8 13.5 4.8v6.4L8 14.2 2.5 11.2V4.8Z" />
              <path d="M2.5 4.8 8 7.8l5.5-3M8 7.8v6.4" />
              <path d="M1.5 1.5l13 13" />
            </svg>
          </span>
          <div>
            <h2 id="webgl-fallback-title">{WEBGL_COPY.title}</h2>
            <p className="wf-lead">{WEBGL_COPY.lead}</p>
          </div>
        </header>

        <div className="wf-grid">
          <article className="wf-card wf-product" aria-labelledby="wf-product-title">
            <h3 id="wf-product-title" className="wf-product-name">{PRODUCT_COPY.name}</h3>
            <p className="wf-value">{PRODUCT_COPY.value}</p>
            <figure className="wf-video">
              <video
                ref={videoRef}
                controls
                muted
                playsInline
                loop={!reduced}
                autoPlay={!reduced}
                // 動きを減らす設定の人には勝手に動かさず、押されるまで動画本体も読まない
                preload={reduced ? 'none' : 'metadata'}
                poster={POSTER_SRC}
                aria-label={PRODUCT_COPY.videoLabel}
                width={1280}
                height={720}
              >
                <source src={VIDEO_SRC} type="video/mp4" />
                <track kind="captions" srcLang="ja" label="日本語" src={CAPTIONS_SRC} />
              </video>
            </figure>
            <ul className="wf-highlights">
              {PRODUCT_COPY.highlights.map((h) => (
                <li key={h.title}>
                  <strong>{h.title}</strong>
                  <span>{h.body}</span>
                </li>
              ))}
            </ul>
            <div className="wf-links">
              <a className="wf-btn wf-btn-primary" href={PRODUCT_COPY.readmeUrl} target="_blank" rel="noopener noreferrer">
                {PRODUCT_COPY.readme}
              </a>
              <a className="wf-btn" href={PRODUCT_COPY.portfolioUrl} target="_blank" rel="noopener noreferrer">
                {PRODUCT_COPY.portfolio}
              </a>
            </div>
          </article>

          <div className="wf-card wf-diagnosis">
            <section className="wf-row">
              <svg {...ICON}><circle cx="8" cy="8" r="6.2" /><path d="M8 4.8v3.6M8 11h.01" /></svg>
              <div>
                <h3>原因</h3>
                <p data-testid="webgl-fallback-cause">{causeText(failure.kind, platform, browser)}</p>
                {failure.embedded && (
                  <p>
                    {WEBGL_COPY.embedded}{' '}
                    <a href={window.location.href} target="_blank" rel="noopener noreferrer">{WEBGL_COPY.openInNewTab}</a>
                  </p>
                )}
              </div>
            </section>

            <section className="wf-row">
              <svg {...ICON}><path d="M10.2 2.2a3.3 3.3 0 0 0-3.9 4.4L2 10.9 3.1 14l3.1-1.1 4.3-4.3a3.3 3.3 0 0 0 4.4-3.9l-2 2-1.8-.4-.4-1.8Z" /></svg>
              <div>
                <h3>直し方</h3>
                <ol className="wf-steps">
                  {guide.steps.map((line, i) => <li key={i}>{renderLine(line)}</li>)}
                </ol>
                {guide.note && <p className="wf-note">{renderLine(guide.note)}</p>}
              </div>
            </section>

            <section className="wf-row">
              <svg {...ICON}><path d="M8 1.6 13 3.5v4c0 3.2-2.1 5.6-5 6.9-2.9-1.3-5-3.7-5-6.9v-4Z" /><path d="m5.6 8 1.7 1.7 3.1-3.3" /></svg>
              <div>
                <h3>有効にしても安全です</h3>
                <p>{WEBGL_COPY.safety}</p>
              </div>
            </section>

            <div className="wf-retry">
              <button type="button" className="wf-btn wf-btn-primary" onClick={() => setRetryFailed(!onRetry())}>
                {WEBGL_COPY.retry}
              </button>
              <p className="wf-retry-status" role="status" aria-live="polite">
                {retryFailed ? WEBGL_COPY.retryFailed : ''}
              </p>
            </div>

            <p className="wf-note">{WEBGL_COPY.sidebarNote}</p>

            <details className="wf-tech">
              <summary>{WEBGL_COPY.techDetails}</summary>
              <code>{`${failure.kind} / ${platform} / ${browser}${failure.embedded ? ' / embedded' : ''}${failure.detail ? ` / ${failure.detail}` : ''}`}</code>
            </details>
          </div>
        </div>
      </div>
    </section>
  )
}
