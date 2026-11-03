import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { CesiumMap } from './components/CesiumMap'
import { BuildingInfo } from './components/BuildingInfo'
import { LocationSearch } from './components/LocationSearch'
import { MapToolbar } from './components/map/MapToolbar'
import { SimPlayer } from './components/map/SimPlayer'
import { HelpModal } from './components/HelpModal'
import { MapEntityPopup } from './components/map/MapEntityPopup'
import { WelcomeScreen } from './components/WelcomeScreen'
import { shouldShowWelcome } from './utils/welcomeStorage'
import { useDroneStore } from './store/droneStore'
import { resolveGuideState } from './utils/stepGuide'
import { guideCopy } from './constants/guideCopy'
import './App.css'

// 現在の状態に合わせた「次のステップ」ガイドを表示
function StepGuide() {
  const { plans, simulation, mapMode, activePlanId } = useDroneStore()
  const copy = guideCopy(resolveGuideState({ mapMode, plans, activePlanId, simulating: !!simulation }))
  if (!copy) return null

  const toneClass = copy.tone === 'action' ? ' step-guide--action' : copy.tone === 'ready' ? ' step-guide--ready' : ''
  return (
    <div className={`step-guide${toneClass}`} role="status">
      <span className="step-guide-icon-svg" aria-hidden="true">
        {copy.tone === 'ready' ? (
          <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9v-2h2v2zm0-4H9V7h2v2z"/></svg>
        )}
      </span>
      <span>
        {copy.step && <b>{copy.step} </b>}
        {copy.before}
        {copy.button && <b>「{copy.button}」</b>}
        {copy.after}
      </span>
    </div>
  )
}

// ── トーストコンテナ ──────────────────────────
function ToastContainer() {
  const { toasts, removeToast } = useDroneStore()
  if (toasts.length === 0) return null
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {t.type === 'success' && <path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>}
            {t.type === 'error'   && <path strokeLinecap="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>}
            {t.type === 'warning' && <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>}
            {t.type === 'info'    && <path strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>}
          </svg>
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} aria-label="通知を閉じる">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

function App() {
  const { selectedCity, buildingProps, setBuildingProps, simulation } = useDroneStore()
  const [helpOpen, setHelpOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(() => shouldShowWelcome())

  const handleLocationSelect = (lat: number, lon: number) => {
    window.dispatchEvent(new CustomEvent('cesium:flyTo', { detail: { lat, lon } }))
  }

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
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
          <div className="header-title-wrap">
            <h1>DroneMapper</h1>
            <span className="header-sub">ドローン飛行管理</span>
          </div>
        </div>

        <div className="header-center">
          <LocationSearch onSelect={handleLocationSelect} />
        </div>

        <div className="header-right">
          <span className="header-city-name">{selectedCity.prefecture} {selectedCity.name}</span>
          {simulation && (
            <span className="sim-indicator">
              <span className="sim-indicator-dot" />
              飛行中
            </span>
          )}
          <button
            className="header-return-btn"
            title="この都市に戻る"
            aria-label="この都市に戻る"
            onClick={() => window.dispatchEvent(new CustomEvent('cesium:flyToCity'))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </button>
          <button
            className="header-help-btn"
            title="使い方を見る"
            onClick={() => setHelpOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="header-help-btn-text">使い方</span>
          </button>
          <button
            className="header-reset-btn"
            title="データをリセット"
            aria-label="データをリセット"
            onClick={() => {
              if (confirm('すべてのデータをリセットしますか？\n（目印・飛行エリア・飛行計画が削除されます）')) {
                localStorage.removeItem('drone-store')
                sessionStorage.clear()
                location.reload()
              }
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </header>

      {/* メインレイアウト */}
      <div className="main-layout">
        <Sidebar />

        <div className="map-area">
          <CesiumMap />
          <MapToolbar />
          {buildingProps && (
            <BuildingInfo
              properties={buildingProps}
              onClose={() => setBuildingProps(null)}
            />
          )}
          {simulation && <SimPlayer />}
          <MapEntityPopup />
          <StepGuide />
        </div>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {welcomeOpen && <WelcomeScreen onClose={() => setWelcomeOpen(false)} />}
      <ToastContainer />
    </div>
  )
}

export default App
