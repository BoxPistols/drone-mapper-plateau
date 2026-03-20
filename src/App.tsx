import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { CesiumMap } from './components/CesiumMap'
import { BuildingInfo } from './components/BuildingInfo'
import { LocationSearch } from './components/LocationSearch'
import { MapToolbar } from './components/map/MapToolbar'
import { SimPlayer } from './components/map/SimPlayer'
import { HelpModal } from './components/HelpModal'
import { MapEntityPopup } from './components/map/MapEntityPopup'
import { WelcomeScreen, shouldShowWelcome } from './components/WelcomeScreen'
import { useDroneStore } from './store/droneStore'
import './App.css'

// 現在の状態に合わせた「次のステップ」ガイドを表示
function StepGuide() {
  const { pins, zones, plans, simulation, mapMode } = useDroneStore()

  if (simulation) return null // シミュレーション中は非表示

  const hasPlan = plans.length > 0
  const hasWaypoints = plans.some((p) => p.waypoints.length >= 2)
  const hasZone = zones.length > 0

  if (mapMode === 'zone') return (
    <div className="step-guide step-guide--action">
      <span className="step-guide-icon">✏️</span>
      <span>地図上をクリックして飛行エリアを囲みましょう。<b>ダブルクリック</b>で確定</span>
    </div>
  )
  if (mapMode === 'pin') return (
    <div className="step-guide step-guide--action">
      <span className="step-guide-icon">📍</span>
      <span>地図上をクリックして目印を置きましょう</span>
    </div>
  )
  if (mapMode === 'waypoint') return (
    <div className="step-guide step-guide--action">
      <span className="step-guide-icon">🛸</span>
      <span>地図上をクリックして通過ポイントを追加しましょう。ポイント数: 2つ以上必要です</span>
    </div>
  )

  if (!hasZone && pins.length === 0 && !hasPlan) return (
    <div className="step-guide">
      <span className="step-guide-icon-svg">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11H9v-2h2v2zm0-4H9V7h2v2z"/></svg>
      </span>
      <span>左の<b>「マップ」</b>タブから始めましょう。<b>サンプルデータを読み込む</b>とすぐ体験できます</span>
    </div>
  )
  if (!hasZone) return (
    <div className="step-guide">
      <span className="step-guide-icon-svg">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="10,2 18,18 2,18"/></svg>
      </span>
      <span><b>STEP 2</b> — 「エリア描画」でドローンの飛行ゾーンを地図上に囲んでください</span>
    </div>
  )
  if (!hasPlan) return (
    <div className="step-guide">
      <span className="step-guide-icon-svg">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="14" height="14" rx="2"/><line x1="7" y1="8" x2="13" y2="8"/><line x1="7" y1="11" x2="11" y2="11"/></svg>
      </span>
      <span><b>STEP 3</b> — 「飛行計画」タブで新しい飛行ルートを作成しましょう</span>
    </div>
  )
  if (!hasWaypoints) return (
    <div className="step-guide">
      <span className="step-guide-icon-svg">
        <svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2"/></svg>
      </span>
      <span><b>STEP 4</b> — 計画を開いて「地図で追加」をタップ。2つ以上の通過ポイントを置いてください</span>
    </div>
  )
  return (
    <div className="step-guide step-guide--ready">
      <span className="step-guide-icon-svg">
        <svg viewBox="0 0 20 20" fill="currentColor" style={{color:'#15803d'}}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
      </span>
      <span>準備完了！飛行計画の<b>「試しに飛ばしてみる」</b>でシミュレーションを開始できます</span>
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
          <button onClick={() => removeToast(t.id)}>
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
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 2L8 6H3l2.5 7.5L3 18h5l4 4 4-4h5l-2.5-4.5L19 6h-5l-3.5-4zM12 8v8M8 12h8"/>
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
