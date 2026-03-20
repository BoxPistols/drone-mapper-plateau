/**
 * droneSimBridge
 *
 * ReactのstateとCesiumJSのCallbackPropertyを繋ぐミュータブルブリッジ。
 * SimPlayer の RAF ループがここに書き込み、
 * CesiumMap の CallbackProperty がここから読み出す。
 * React のレンダーサイクルを経由しないため、60fps でも点滅しない。
 */
export const droneSimBridge = {
  /** シミュレーション実行中フラグ */
  active: false,
  /** 現在の経度 */
  lon: 0,
  /** 現在の緯度 */
  lat: 0,
  /** 現在の地上高 (m AGL) */
  altAGL: 0,
  /** 現在位置の地盤高 (m MSL) — CesiumMap preRender で毎フレーム更新 */
  groundAlt: 0,
  /** 機首方位 (degrees, 北=0, 時計回り) */
  heading: 0,
  /** カメラモード — CallbackProperty の show 判定に使用 */
  cameraMode: 'pov' as string,
}
