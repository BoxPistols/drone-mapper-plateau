# PLATEAU Drone Mapper — Agent Teams

## プロジェクト概要

国交省 PLATEAU 3D都市モデルを使ったドローン飛行計画・管理アプリ。
Vite + React 19 + TypeScript + CesiumJS + Zustand + Anthropic SDK

## 技術スタック
- フロントエンド: React 19, TypeScript 5.9, Vite 8
- 3D描画: CesiumJS 1.139 (PLATEAU 3D Tiles)
- 状態管理: Zustand (persist)
- AI: @anthropic-ai/sdk (claude-opus-4-6)
- スタイル: カスタムCSS（ライトテーマ、WCAG AA準拠）

## ディレクトリ構成
```
src/
  ai/           # AI アシスタント（Claude API）
  components/
    map/        # 地図上UI（MapEntityPopup, MapToolbar, SimPlayer）
    panels/     # サイドバーパネル
  sim/          # シミュレーションブリッジ（droneSimBridge.ts）
  store/        # Zustand ストア（droneStore.ts）
  types.ts      # 共有型定義
```

## Agent Teams — 3D特化チーム編成

### SimEngine（シミュレーション物理エンジン担当）
- **担当ファイル**: `SimPlayer.tsx`, `droneSimBridge.ts`, `droneStore.ts` の startSimulation
- **専門**: フェーズベース時間補間、ホバー制御、速度計算、進捗トラッキング
- **原則**: セグメント等分割禁止。必ずdist/speedで実時間を計算すること

### Camera3D（3Dカメラ・空間表現担当）
- **担当ファイル**: `CesiumMap.tsx` のカメラ・エンティティ描画
- **専門**: CesiumJS HeadingPitchRange・HeightReference・CallbackProperty
- **原則**: POV はドローン前方オフセット + setView。follow は lookAt。free は lookAtTransform解除

### SimEngine + Camera3D 協調ルール
- `droneSimBridge` への書き込みは SimEngine のみ
- `droneSimBridge` からの読み取りは Camera3D（preRender）のみ
- `SimState` の型変更は両チーム合意が必要

### Planner（設計エージェント）
- 新機能の設計・型定義・アーキテクチャ判断
- `types.ts` の変更を先に設計してからBuilderへ渡す
- CesiumJS の座標系（AGL/MSL）、HeightReference の選択を担当

### UIBuilder（実装エージェント）
- コード実装（パネルコンポーネント、Sidebar、App.tsx）
- `npx tsc --noEmit` でエラーゼロを確認してから完了

### UI/UX（デザインエージェント）
- `/ui-ux-pro-max` スキルを使用
- App.css のスタイル改善
- ターゲット: 初心者・高齢者・低リテラシーユーザー
- 必須: WCAG AA準拠、最小タッチターゲット44px、最小フォント14px

### Reviewer（レビューエージェント）
- `/review` スキルで差分を分析
- 観点: 型安全性、CesiumJS メモリリーク、座標系ミス（AGL/MSL混在）、アクセシビリティ

## Agent Team C — アプリ内AIアシスタント

自然言語で飛行計画を生成するClaude統合（`src/ai/`）。
詳細は `src/ai/tools.ts` と `src/components/panels/AIPanel.tsx` を参照。

## 重要な設計判断

### ピッキング（地形クリック）
`globe.pick(ray)` のみ使用。`pickPosition()` は PolylineGraphics で誤った深度を返すため廃止。
`depthTestAgainstTerrain` は意図的に無効化。

### 高度系
- `altAGL`: ユーザーが設定する「地面から何m上」（地上高）
- `groundAlt`: `globe.getHeight()` で取得した海抜高度（MSL）
- 実際のMSL高度 = `groundAlt + altAGL`
- ドローンエンティティは `droneSimBridge` 経由で60fps更新（React state非経由）

### AIアシスタントのセキュリティ
`VITE_ANTHROPIC_API_KEY` はデモ用途。本番では server-side proxy に変更すること。
