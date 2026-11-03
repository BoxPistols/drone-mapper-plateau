// VITE_* はビルド時にクライアントへ埋め込まれるため、公開ビルド（deploy.yml）には AI キーを渡していない。
// キーが無いビルドでは会話 UI の代わりにデモ表示を出す
export const AI_APP_KEY_AVAILABLE = Boolean(
  import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY,
)
