import { useDroneStore } from '../store/droneStore'
import { MapPanel } from './panels/MapPanel'
import { PlansPanel } from './panels/PlansPanel'
import { RecordsPanel } from './panels/RecordsPanel'
import { MediaPanel } from './panels/MediaPanel'

const TABS = [
  {
    id: 'map' as const, label: 'マップ',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    id: 'plans' as const, label: '計画',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    id: 'records' as const, label: '記録',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'media' as const, label: 'データ',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
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
            title={tab.label}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            <span>{tab.label}</span>
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
        </div>
      )}
    </aside>
  )
}
