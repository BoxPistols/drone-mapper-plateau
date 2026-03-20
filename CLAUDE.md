# PLATEAU Drone Mapper — ゲームスタジオ体制

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

---

## チーム編成 — Unity / Unreal Engine スタジオモデル

### 立体表現チーム（Visual Excellence Team）
**役割**: 3DCG・ゲームビジュアル品質・空間表現・カメラ演出を担う
**構成**: 3Dグラフィクスエンジニア + UI/UXデザイナー + ゲームデザイナー
**担当ファイル**:
- `CesiumMap.tsx` — 描画・カメラ・エンティティ
- `SimPlayer.tsx` — HUD・カメラモードUI・ミッション演出
- `MissionComplete.tsx` — ミッション完了シネマティック画面
- `App.css` — ビジュアルポリッシュ全般

**品質基準（KPI）**:
- ドローンアイコン: ゲームHUD水準（グロー・レイヤード・動的）
- POVカメラ: バンキング + ヘッディングスムーシングで映画的
- ミッション完了: フルスクリーン演出でユーザーをワオさせる
- 大気: fog + 空の色でシネマティックな奥行き

**Camera3D 原則**:
- POVはドローン位置 + `setView`（heading lerp + banking）
- followは`lookAt`（後方オフセット + 高度対応距離）
- freeは`lookAtTransform(Matrix4.IDENTITY)`でロック解除

---

### 企画・ビジネスチーム（Planning & Business Team）
**役割**: 市場価値・ユーザー体験・ナラティブ・日本語コピーを担う
**構成**: シナリオライター + プロダクトマーケター + UXリサーチャー
**担当ファイル**:
- `WelcomeScreen.tsx` — 初回オンボーディング
- `HelpModal.tsx` — 使い方チュートリアル
- `PlansPanel.tsx` — 飛行計画UX（コピー・フロー）
- `App.tsx` の StepGuide — 状況対応ガイド
- `PreflightChecklist.tsx` — フライト前確認フロー

**品質基準（KPI）**:
- 使い始めた瞬間「本格的なプロツール」と感じさせる
- ミッション達成に感情的満足感（アチーブメント感）を付与
- 空状態・エラーメッセージも前向きな日本語コピー
- 初心者〜上級者まで迷わせない段階的ガイド

---

### SimEngine チーム（シミュレーション物理エンジン）
**担当**: `SimPlayer.tsx`・`droneSimBridge.ts`・`droneStore.ts` の startSimulation
**専門**: フェーズベース時間補間・ホバー制御・速度計算・進捗トラッキング
**原則**: セグメント等分割禁止。必ずdist/speedで実時間を計算すること

### Planner チーム（設計）
**担当**: 新機能設計・型定義・アーキテクチャ判断・`types.ts` 変更
**専門**: CesiumJS座標系（AGL/MSL）・HeightReference選択

### UIBuilder チーム（実装）
**担当**: パネルコンポーネント・Sidebar・App.tsx
**原則**: `npx tsc --noEmit` でエラーゼロを確認してから完了

### Reviewer チーム（レビュー）
**担当**: `/review` スキルで差分分析
**観点**: 型安全性・CesiumJSメモリリーク・座標系ミス（AGL/MSL混在）・アクセシビリティ

---

## SimEngine + Camera3D 協調ルール
- `droneSimBridge` への書き込みは SimEngine のみ
- `droneSimBridge` からの読み取りは Camera3D（preRender）のみ
- `SimState` の型変更は両チーム合意が必要

## Agent Team C — アプリ内AIアシスタント
自然言語で飛行計画を生成するClaude統合（`src/ai/`）。
詳細は `src/ai/tools.ts` と `src/components/panels/AIPanel.tsx` を参照。

---

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
