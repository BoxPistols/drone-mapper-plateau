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
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 2L8 6H3l2.5 7.5L3 18h5l4 4 4-4h5l-2.5-4.5L19 6h-5l-3.5-4zM12 8v8M8 12h8"/>
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
