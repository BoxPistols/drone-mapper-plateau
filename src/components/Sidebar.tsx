import { useEffect } from 'react'
import { useDroneStore } from '../store/droneStore'
import { MapPanel } from './panels/MapPanel'
import { PlansPanel } from './panels/PlansPanel'
import { AIPanel } from './panels/AIPanel'
import { AIDemoPanel } from './panels/AIDemoPanel'
import { AI_APP_KEY_AVAILABLE } from '../ai/availability'
import { STEPS, firstStepOfTab } from '../constants/steps'
import { DRAWER_MEDIA_QUERY, isDrawerLayout } from '../utils/viewport'
import type { SidebarTab } from '../types'

interface TabDef {
  id: SidebarTab
  label: string
  icon: string
}

const TABS: TabDef[] = [
  { id: 'map',   label: 'マップ',   icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'plans', label: '飛行計画', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  // 公開版では AI キーを含めないため、AI タブはデモ表示（AIDemoPanel）になる
  { id: 'ai',    label: 'AI',       icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z' },
]

function tabTitle(tab: SidebarTab): string {
  if (tab === 'ai') return AI_APP_KEY_AVAILABLE ? 'AIアシスタントで計画を作る' : 'AIアシスタント（公開版はデモ表示）'
  const steps = STEPS.filter((s) => s.tab === tab)
  return steps.map((s) => `STEP ${s.number} ${s.title}`).join(' / ')
}

export function Sidebar() {
  const { sidebarTab, setSidebarTab, sidebarOpen, setSidebarOpen, mapMode, simulation } = useDroneStore()

  // 狭い画面ではパネルが地図に重なるため、地図を操作する場面では閉じる
  useEffect(() => {
    if (isDrawerLayout() && (mapMode !== 'select' || simulation)) setSidebarOpen(false)
  }, [mapMode, simulation, setSidebarOpen])

  // 初回表示時、狭い画面なら地図を見せるため閉じた状態から始める
  useEffect(() => {
    if (isDrawerLayout()) setSidebarOpen(false)
    const mq = window.matchMedia?.(DRAWER_MEDIA_QUERY)
    if (!mq) return
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setSidebarOpen(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setSidebarOpen])

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {/* タブナビ */}
        <nav className="sidebar-nav" aria-label="パネル切り替え">
          {TABS.map((tab) => {
            const step = firstStepOfTab(tab.id)
            const isActive = sidebarTab === tab.id
            return (
              <button
                key={tab.id}
                className={`sidebar-tab ${isActive ? 'active' : ''}`}
                aria-pressed={isActive && sidebarOpen}
                aria-controls="sidebar-content"
                onClick={() => {
                  if (isActive && sidebarOpen) {
                    setSidebarOpen(false)
                  } else {
                    setSidebarTab(tab.id)
                    setSidebarOpen(true)
                  }
                }}
                title={tabTitle(tab.id)}
              >
                {step && <span className="sidebar-tab-step" aria-hidden="true">{step.number}</span>}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                <span className="sidebar-tab-label">{tab.label}</span>
              </button>
            )
          })}
        </nav>

        {/* パネルコンテンツ */}
        {sidebarOpen && (
          <div className="sidebar-content" id="sidebar-content">
            {sidebarTab === 'map'   && <MapPanel />}
            {sidebarTab === 'plans' && <PlansPanel />}
            {sidebarTab === 'ai'    && (AI_APP_KEY_AVAILABLE ? <AIPanel /> : <AIDemoPanel />)}
          </div>
        )}
      </aside>
      {/* ドロワー表示時のみ CSS で見える。地図側をタップすると閉じる */}
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="パネルを閉じる"
          tabIndex={-1}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  )
}
