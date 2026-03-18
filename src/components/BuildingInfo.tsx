import type { BuildingProperties } from '../types'

// PLATEAU建物用途コード（主要なもの）
const USAGE_LABELS: Record<string, string> = {
  '401': '専用住宅',
  '402': '共同住宅',
  '411': '店舗',
  '413': '事務所',
  '421': '学校',
  '431': '病院',
  '441': 'ホテル・旅館',
  '451': '工場',
  '461': '倉庫',
  '471': '官公庁',
  '481': '神社・寺院',
  '491': '駐車場',
}

// 表示するプロパティの定義（表示名・優先順）
const DISPLAY_PROPS: { key: string; label: string; format?: (v: unknown) => string }[] = [
  { key: 'gml_id', label: '建物ID' },
  {
    key: 'measuredHeight',
    label: '高さ',
    format: (v) => (v != null ? `${Number(v).toFixed(1)} m` : '—'),
  },
  {
    key: 'storeysAboveGround',
    label: '地上階数',
    format: (v) => (v != null ? `${v} 階` : '—'),
  },
  {
    key: 'usage',
    label: '用途',
    format: (v) => (v ? (USAGE_LABELS[String(v)] ?? `コード ${v}`) : '—'),
  },
  { key: 'yearOfConstruction', label: '建築年', format: (v) => (v ? `${v} 年` : '—') },
  { key: 'name', label: '名称' },
]

interface Props {
  properties: BuildingProperties
  onClose: () => void
}

export function BuildingInfo({ properties, onClose }: Props) {
  // 表示対象プロパティのフィルタ
  const definedProps = DISPLAY_PROPS.filter(({ key }) => properties[key] != null)

  // 未定義だが存在する追加プロパティ（デバッグ用）
  const knownKeys = new Set(DISPLAY_PROPS.map((p) => p.key))
  const extraProps = Object.entries(properties).filter(
    ([k, v]) => !knownKeys.has(k) && v != null && k !== 'undefined'
  )

  return (
    <div className="building-info">
      <div className="building-info-header">
        <span className="building-info-icon">🏢</span>
        <span className="building-info-title">建物情報</span>
        <button className="building-info-close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
      </div>
      <div className="building-info-body">
        {definedProps.length === 0 && extraProps.length === 0 ? (
          <p className="building-info-empty">属性情報がありません</p>
        ) : (
          <table className="building-info-table">
            <tbody>
              {definedProps.map(({ key, label, format }) => (
                <tr key={key}>
                  <th>{label}</th>
                  <td>{format ? format(properties[key]) : String(properties[key])}</td>
                </tr>
              ))}
              {extraProps.map(([k, v]) => (
                <tr key={k} className="building-info-extra">
                  <th>{k}</th>
                  <td>{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
