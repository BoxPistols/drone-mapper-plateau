/**
 * MissionComplete — ミッション完了シネマティック演出
 *
 * 立体表現チーム: アニメーション・ビジュアル
 * 企画・ビジネスチーム: ナラティブコピー・達成感演出
 */
import { useEffect, useState } from 'react'
import type { FlightPlan } from '../types'

interface Props {
  plan: FlightPlan
  distM: number
  totalSec: number
  maxAlt: number
  photoCount: number
  onReplay: () => void
  onClose: () => void
}

// 企画チーム担当: シナリオ的達成メッセージ
function getMissionMessage(distM: number, maxAlt: number): { title: string; body: string } {
  if (distM > 5000) return {
    title: '長距離ミッション達成',
    body: '5km超の飛行を完遂しました。広域エリアの空撮データが揃いました。',
  }
  if (maxAlt > 100) return {
    title: '高高度フライト完了',
    body: '100m超の高度から、街全体を俯瞰するショットを取得できました。',
  }
  if (distM < 500) return {
    title: '精密飛行クリア',
    body: '短距離の精密なルートを正確になぞりました。細部まで丁寧に撮影できています。',
  }
  return {
    title: 'フライト完了',
    body: '計画どおりにルートを飛行しました。お疲れさまです。',
  }
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`
}
function fmtTime(sec: number) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60)
  return `${m}分${String(s).padStart(2, '0')}秒`
}

export function MissionComplete({ plan, distM, totalSec, maxAlt, photoCount, onReplay, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const msg = getMissionMessage(distM, maxAlt)

  useEffect(() => {
    // マウント直後は透明から始めてフェードイン
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div className={`mission-complete-overlay ${visible ? 'visible' : ''}`}>
      <div className="mission-complete-card">
        {/* 上部グリーンビーム */}
        <div className="mc-beam" />

        {/* アイコン + チェック */}
        <div className="mc-icon-wrap">
          <svg className="mc-drone-icon" viewBox="0 0 64 64" fill="none">
            {/* アーム */}
            {[45, 135, 225, 315].map((a) => {
              const rad = (a * Math.PI) / 180
              return (
                <line key={a}
                  x1={32 + 5 * Math.cos(rad)} y1={32 + 5 * Math.sin(rad)}
                  x2={32 + 22 * Math.cos(rad)} y2={32 + 22 * Math.sin(rad)}
                  stroke="#39d353" strokeWidth="3.5" strokeLinecap="round"
                />
              )
            })}
            {/* ローター */}
            {[45, 135, 225, 315].map((a) => {
              const rad = (a * Math.PI) / 180
              const rx = 32 + 22 * Math.cos(rad), ry = 32 + 22 * Math.sin(rad)
              return <circle key={a} cx={rx} cy={ry} r="9" fill="rgba(57,211,83,0.15)" stroke="#39d353" strokeWidth="1.5"/>
            })}
            {/* 中心 */}
            <circle cx="32" cy="32" r="7" fill="#39d353"/>
            <circle cx="32" cy="32" r="2.5" fill="white"/>
          </svg>
          {/* チェックマーク */}
          <div className="mc-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L19 7"/>
            </svg>
          </div>
        </div>

        {/* タイトル */}
        <div className="mc-title-area">
          <p className="mc-label">MISSION COMPLETE</p>
          <h2 className="mc-title">{msg.title}</h2>
          <p className="mc-plan-name">{plan.name}</p>
        </div>

        {/* ボディコピー */}
        <p className="mc-body">{msg.body}</p>

        {/* スタッツグリッド */}
        <div className="mc-stats">
          <div className="mc-stat">
            <span className="mc-stat-value">{fmtDist(distM)}</span>
            <span className="mc-stat-label">総飛行距離</span>
          </div>
          <div className="mc-stat">
            <span className="mc-stat-value">{fmtTime(totalSec)}</span>
            <span className="mc-stat-label">飛行時間</span>
          </div>
          <div className="mc-stat">
            <span className="mc-stat-value">{maxAlt.toFixed(0)}<em>m</em></span>
            <span className="mc-stat-label">最大高度</span>
          </div>
          <div className="mc-stat">
            <span className="mc-stat-value">{photoCount}</span>
            <span className="mc-stat-label">撮影ポイント</span>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mc-actions">
          <button className="mc-btn-replay" onClick={onReplay}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path strokeLinecap="round" d="M3 3v5h5"/>
            </svg>
            もう一度飛ばす
          </button>
          <button className="mc-btn-close" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
