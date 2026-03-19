import { useState } from 'react'
import { useDroneStore, PLATEAU_CITIES } from '../../store/droneStore'
import type { ZoneType } from '../../types'

const PIN_COLORS = ['#58a6ff', '#f78166', '#7ee787', '#ffa657', '#d2a8ff', '#ff7b72', '#79c0ff', '#ffffff']

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  planned:    '飛行予定エリア',
  restricted: '飛行禁止区域',
  caution:    '注意が必要なエリア',
  completed:  '飛行済みエリア',
}

export function MapPanel() {
  const {
    selectedCity, setSelectedCity,
    pins, updatePin, deletePin,
    zones, updateZone, deleteZone,
    mapMode, setMapMode,
    seedExampleData,
  } = useDroneStore()

  const [expandedPin, setExpandedPin] = useState<string | null>(null)
  const [expandedZone, setExpandedZone] = useState<string | null>(null)

  const prefs = Array.from(new Set(PLATEAU_CITIES.map((c) => c.prefecture)))

  return (
    <div className="panel">

      {/* はじめてガイド */}
      <section className="panel-section seed-section">
        <p className="seed-desc">
          まずは体験してみましょう！<br />
          <small>サンプルのルートを読み込んで、ドローンが飛ぶ様子を確認できます</small>
        </p>
        <button
          className="seed-btn"
          onClick={() => {
            const hasData = pins.length > 0 || zones.length > 0
            if (!hasData || confirm('現在のデータは消えます。デモを開始しますか？')) {
              seedExampleData()
            }
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          デモフライトを見る
        </button>
      </section>

      {/* 都市選択 */}
      <section className="panel-section">
        <h3 className="panel-section-title">
          <span className="section-step">STEP 1</span>
          まちを選ぶ
        </h3>
        <p className="panel-section-hint">3D地図で表示するまちを選んでください</p>
        {prefs.map((pref) => (
          <div key={pref} className="city-pref-group">
            <span className="city-pref-label">{pref}</span>
            <div className="city-pref-buttons">
              {PLATEAU_CITIES.filter((c) => c.prefecture === pref).map((city) => (
                <button
                  key={city.id}
                  className={`city-list-btn ${selectedCity.id === city.id ? 'active' : ''}`}
                  onClick={() => setSelectedCity(city)}
                >
                  <span>{city.name}</span>
                  {city.lod === 3 && <span className="lod-badge lod-3">高精細</span>}
                  {city.hasTexture && <span className="lod-badge lod-2">カラー</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* 飛行エリア（ゾーン）一覧 */}
      <section className="panel-section">
        <h3 className="panel-section-title">
          <span className="section-step">STEP 2</span>
          飛行エリア ({zones.length})
        </h3>
        <p className="panel-section-hint">ドローンを飛ばす範囲を地図上で囲んで登録します</p>
        <div className="panel-section-header" style={{ paddingTop: 0 }}>
          <span />
          <button
            className={`panel-tool-btn ${mapMode === 'zone' ? 'active' : ''}`}
            onClick={() => setMapMode(mapMode === 'zone' ? 'select' : 'zone')}
          >
            {mapMode === 'zone' ? '✓ 描画中...' : '+ エリアを描く'}
          </button>
        </div>
        {zones.length === 0 ? (
          <div className="panel-empty-guided">
            <div className="guided-step-icon">🗺️</div>
            <p>「エリアを描く」ボタンを押してから<br />地図上をクリックして囲んでください</p>
          </div>
        ) : (
          <ul className="item-list">
            {zones.map((zone) => (
              <li key={zone.id} className="item-row zone-item-row">
                <button
                  className="item-expand"
                  onClick={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
                >
                  <span className={`zone-type-badge zone-${zone.type}`}>{ZONE_TYPE_LABELS[zone.type].slice(0, 6)}</span>
                  <span className="item-name">{zone.name}</span>
                </button>
                <button
                  className="item-delete"
                  onClick={() => { if (confirm(`「${zone.name}」を削除しますか？`)) deleteZone(zone.id) }}
                  title="削除"
                >×</button>

                {expandedZone === zone.id && (
                  <div className="item-detail">
                    <label>エリアの名前
                      <input
                        value={zone.name}
                        onChange={(e) => updateZone(zone.id, { name: e.target.value })}
                      />
                    </label>
                    <label>種別
                      <select
                        value={zone.type}
                        onChange={(e) => updateZone(zone.id, { type: e.target.value as ZoneType })}
                      >
                        {Object.entries(ZONE_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 目印（ピン）一覧 */}
      <section className="panel-section">
        <h3 className="panel-section-title">目印 ({pins.length})</h3>
        <p className="panel-section-hint">離着陸地点など、覚えておきたい場所に目印をつけます</p>
        <div className="panel-section-header" style={{ paddingTop: 0 }}>
          <span />
          <button
            className={`panel-tool-btn ${mapMode === 'pin' ? 'active' : ''}`}
            onClick={() => setMapMode(mapMode === 'pin' ? 'select' : 'pin')}
          >
            {mapMode === 'pin' ? '✓ 設置中...' : '+ 目印を追加'}
          </button>
        </div>
        {pins.length === 0 ? (
          <p className="panel-empty">地図をクリックして目印を追加できます</p>
        ) : (
          <ul className="item-list">
            {pins.map((pin) => (
              <li key={pin.id} className="item-row">
                <button
                  className="item-expand"
                  onClick={() => setExpandedPin(expandedPin === pin.id ? null : pin.id)}
                >
                  <span className="pin-dot" style={{ background: pin.color }} />
                  <span className="item-name">{pin.name}</span>
                </button>
                <button
                  className="item-delete"
                  onClick={() => { if (confirm(`「${pin.name}」を削除しますか？`)) deletePin(pin.id) }}
                  title="削除"
                >×</button>

                {expandedPin === pin.id && (
                  <div className="item-detail">
                    <label>名前
                      <input
                        value={pin.name}
                        onChange={(e) => updatePin(pin.id, { name: e.target.value })}
                      />
                    </label>
                    <label>メモ
                      <input
                        value={pin.note ?? ''}
                        placeholder="任意"
                        onChange={(e) => updatePin(pin.id, { note: e.target.value })}
                      />
                    </label>
                    <div className="pin-color-row">
                      <span className="pin-color-label">色</span>
                      <div className="pin-color-swatches">
                        {PIN_COLORS.map((c) => (
                          <button
                            key={c}
                            className={`pin-swatch ${pin.color === c ? 'active' : ''}`}
                            style={{ background: c }}
                            onClick={() => updatePin(pin.id, { color: c })}
                          />
                        ))}
                        <input
                          type="color"
                          className="pin-color-custom"
                          value={pin.color}
                          onChange={(e) => updatePin(pin.id, { color: e.target.value })}
                          title="自分で色を選ぶ"
                        />
                      </div>
                    </div>
                    <div className="item-coords">
                      <span>{pin.lat.toFixed(5)}, {pin.lon.toFixed(5)}</span>
                      <span>海抜 {pin.alt.toFixed(1)}m</span>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
