// ウェルカム画面の表示判定。WelcomeScreen.tsx から分離した
// （コンポーネント以外を export すると react-refresh が効かないため）。
// 初回だけ出すため localStorage に記録する（sessionStorage だと新しいタブのたびに出ていた）
const WELCOME_KEY = 'droneMapper_welcomed'

export function shouldShowWelcome(): boolean {
  try {
    return !localStorage.getItem(WELCOME_KEY)
  } catch {
    return true
  }
}

export function markWelcomed(): void {
  try {
    localStorage.setItem(WELCOME_KEY, '1')
  } catch {
    // ストレージが使えない環境では毎回表示されるだけなので無視する
  }
}
