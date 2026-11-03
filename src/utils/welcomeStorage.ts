// ウェルカム画面の表示判定。WelcomeScreen.tsx から分離した
// （コンポーネント以外を export すると react-refresh が効かないため）。
// Phase 1 で「初回のみ表示」に変えるときは localStorage へ切り替える。
const WELCOME_KEY = 'droneMapper_welcomed'

/** セッション内でウェルカム画面が不要かどうか判定 */
export function shouldShowWelcome(): boolean {
  return !sessionStorage.getItem(WELCOME_KEY)
}

export function markWelcomed(): void {
  sessionStorage.setItem(WELCOME_KEY, '1')
}
