import { useDroneStore } from '../store/droneStore'

const WELCOME_KEY = 'droneMapper_welcomed'

interface Props {
  onClose: () => void
}

export function WelcomeScreen({ onClose }: Props) {
  const { seedExampleData } = useDroneStore()

  const handleDemo = () => {
    sessionStorage.setItem(WELCOME_KEY, '1')
    seedExampleData()
    onClose()
  }

  const handleStart = () => {
    sessionStorage.setItem(WELCOME_KEY, '1')
    onClose()
  }

  return (
    <div className="welcome-overlay" onClick={handleStart}>
      <div className="welcome-panel" onClick={(e) => e.stopPropagation()}>
        {/* ロゴ */}
        <div className="welcome-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="11" r="2.5"/>
              <path strokeLinecap="round" d="M12 8.5V6M12 16v-2.5M14.5 11H17M7 11h2.5"/>
              <path strokeLinecap="round" d="M8 7l1.5 1.5M14.5 14.5L16 16M16 7l-1.5 1.5M9.5 14.5L8 16"/>
              <circle cx="8" cy="7" r="1" fill="currentColor"/>
              <circle cx="16" cy="7" r="1" fill="currentColor"/>
              <circle cx="8" cy="16" r="1" fill="currentColor"/>
              <circle cx="16" cy="16" r="1" fill="currentColor"/>
          </svg>
        </div>

        {/* タイトル */}
        <div>
          <p className="welcome-title">DroneMapper へようこそ</p>
          <p className="welcome-subtitle">
            ドローンの飛行エリアやルートを地図上で管理できるツールです。<br/>
            まずはデモを見て、使い方をつかんでみましょう！
          </p>
        </div>

        {/* ボタン */}
        <div className="welcome-actions">
          <button className="welcome-btn-demo" onClick={handleDemo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            まずデモを見てみる（おすすめ）
          </button>

          <button className="welcome-btn-start" onClick={handleStart}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
            </svg>
            自分でやってみる
          </button>
        </div>

        <p className="welcome-hint">
          データはこのブラウザに自動保存されます。<br/>
          いつでも「使い方」ボタン（右上の「？」）で確認できます。
        </p>
      </div>
    </div>
  )
}

/** セッション内でウェルカム画面が不要かどうか判定 */
export function shouldShowWelcome(): boolean {
  return !sessionStorage.getItem(WELCOME_KEY)
}
