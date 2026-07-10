// アプリ全体で共有する日本語ラベル定数
// 同一概念に複数の表記が散在していた（例: カメラモードがUIとヘルプで不一致）ため一本化。
// 表記を変える場合は必ずここだけを編集する。
import type { CameraMode, WaypointAction, ZoneType } from '../types'

export const CAMERA_LABELS: Record<CameraMode, string> = {
  free:   '俯瞰',
  follow: '追跡',
  pov:    '機体視点',
}

// カメラモードの説明（ツールチップ・ヘルプ共通）
export const CAMERA_DESCRIPTIONS: Record<CameraMode, string> = {
  free:   '俯瞰 — マウスやタッチで自由に地図を動かせます',
  follow: '追跡 — ドローンを後ろから追いかけます',
  pov:    '機体視点 — ドローンの前方カメラ映像です',
}

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  planned:    '飛行予定エリア',
  restricted: '飛行禁止区域',
  caution:    '注意が必要なエリア',
  completed:  '飛行済みエリア',
}

export const ACTION_LABELS: Record<WaypointAction, string> = {
  none:        'なし',
  photo:       '写真を撮る',
  video_start: '動画撮影を開始',
  video_stop:  '動画撮影を停止',
  hover:       'その場で停止',
}

export const ACTION_BADGES: Record<WaypointAction, string> = {
  none:        '',
  photo:       '📷',
  video_start: '🎬',
  video_stop:  '⏹',
  hover:       '⏸',
}

// 全 WaypointAction 値（外部入力の検証用）
export const WAYPOINT_ACTIONS: readonly WaypointAction[] = [
  'none', 'photo', 'video_start', 'video_stop', 'hover',
]

// 未検証の文字列を安全に WaypointAction へ変換する（LLM出力・インポート用）
export function coerceWaypointAction(value: unknown): WaypointAction {
  return WAYPOINT_ACTIONS.includes(value as WaypointAction) ? (value as WaypointAction) : 'none'
}
