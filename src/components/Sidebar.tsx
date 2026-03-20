import { useDroneStore } from '../store/droneStore'
import { MapPanel } from './panels/MapPanel'
import { PlansPanel } from './panels/PlansPanel'
import { RecordsPanel } from './panels/RecordsPanel'
import { MediaPanel } from './panels/MediaPanel'
import { AIPanel } from './panels/AIPanel'

const TABS = [
  {
    id: 'map' as const,
    label: 'マップ',
    step: 1,
    title: 'まちを選んでエリアを描く',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    id: 'plans' as const,
    label: '飛行計画',
    step: 2,
    title: '飛ぶルートを設定する',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    id: 'records' as const,
    label: '飛行記録',
    step: null,
    title: '過去の飛行を確認する',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'media' as const,
    label: '写真・動画',
    step: null,
    title: '撮影したデータを管理する',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'ai' as const,
    label: 'AI',
    step: null,
    title: 'AIアシスタントで計画を作る',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z',
  },
] as const

export function Sidebar() {
  const { sidebarTab, setSidebarTab, sidebarOpen, setSidebarOpen } = useDroneStore()

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      {/* タブナビ */}
      <nav className="sidebar-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-tab ${sidebarTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              if (sidebarTab === tab.id && sidebarOpen) {
                setSidebarOpen(false)
              } else {
                setSidebarTab(tab.id)
                setSidebarOpen(true)
              }
            }}
            title={tab.title}
          >
            {tab.step && <span className="sidebar-tab-step">{tab.step}</span>}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            <span className="sidebar-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* パネルコンテンツ */}
      {sidebarOpen && (
        <div className="sidebar-content">
          {sidebarTab === 'map'     && <MapPanel />}
          {sidebarTab === 'plans'   && <PlansPanel />}
          {sidebarTab === 'records' && <RecordsPanel />}
          {sidebarTab === 'media'   && <MediaPanel />}
          {sidebarTab === 'ai'      && <AIPanel />}
        </div>
      )}
    </aside>
  )
}
