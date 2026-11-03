import { AI_TOOLS } from '../../ai/tools'

const REPO_URL = 'https://github.com/BoxPistols/drone-mapper-plateau'

interface DemoTurn {
  role: 'user' | 'assistant'
  text: string
  tools?: string[]
}

// 公開版では実際の応答を出せないため、ツール呼び出しの流れが分かる会話例を固定で示す
const DEMO_TRANSCRIPT: DemoTurn[] = [
  { role: 'user', text: '浅草寺の周りを高さ60mで一周する計画を作って' },
  {
    role: 'assistant',
    text: '台東区の地図のまま、「浅草寺周回」という計画を作り、浅草寺を囲む4点を地上高60mで追加しました。総距離などは飛行計画タブで確認できます。',
    tools: ['get_app_state', 'create_flight_plan', 'add_waypoints'],
  },
  { role: 'user', text: 'そのまま飛ばしてみて' },
  {
    role: 'assistant',
    text: '「浅草寺周回」のシミュレーションを始めます。',
    tools: ['start_simulation'],
  },
]

function firstSentence(text: string | undefined): string {
  if (!text) return ''
  const i = text.indexOf('。')
  return i === -1 ? text : text.slice(0, i + 1)
}

export function AIDemoPanel() {
  const tools = AI_TOOLS.flatMap((t) => (t.type === 'function' ? [t.function] : []))

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div className="ai-header-left">
          <span className="ai-header-title">AI アシスタント</span>
          <span className="ai-demo-badge">デモ表示</span>
        </div>
      </div>

      <div className="ai-messages ai-demo">
        <section className="ai-demo-section" aria-labelledby="ai-demo-about">
          <h3 id="ai-demo-about" className="ai-demo-heading">この公開版では会話できません</h3>
          <p className="ai-demo-text">
            日本語の指示から飛行計画を作る機能です。モデルがアプリの操作を「ツール」として呼び出し、計画の作成や通過ポイントの追加を行います。
            API キーをブラウザ向けのビルドに入れると誰でも読めてしまうため、公開版にはキーを入れていません。下はその動き方の例です。
          </p>
        </section>

        <section className="ai-demo-section" aria-labelledby="ai-demo-tools">
          <h3 id="ai-demo-tools" className="ai-demo-heading">呼び出せる操作（{tools.length}種類）</h3>
          <ul className="ai-demo-tools">
            {tools.map((fn) => (
              <li key={fn.name} className="ai-demo-tool">
                <code className="ai-demo-tool-name">{fn.name}</code>
                <span className="ai-demo-tool-desc">{firstSentence(fn.description)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="ai-demo-section" aria-labelledby="ai-demo-example">
          <h3 id="ai-demo-example" className="ai-demo-heading">会話の例</h3>
          <ol className="ai-demo-transcript">
            {DEMO_TRANSCRIPT.map((turn, i) => (
              <li key={i} className={`ai-message ai-message-${turn.role}`}>
                {turn.role === 'assistant' && <div className="ai-avatar" aria-hidden="true">AI</div>}
                <div className={`ai-bubble ai-bubble-${turn.role}`}>
                  <span className="sr-only">{turn.role === 'user' ? '利用者: ' : 'AI: '}</span>
                  {turn.tools && (
                    <span className="ai-demo-calls">
                      {turn.tools.map((name) => (
                        <code key={name} className="ai-demo-call">{name}</code>
                      ))}
                    </span>
                  )}
                  <span className="ai-text">{turn.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="ai-demo-section" aria-labelledby="ai-demo-enable">
          <h3 id="ai-demo-enable" className="ai-demo-heading">手元で動かすには</h3>
          <ol className="ai-demo-steps">
            <li>リポジトリを取得して <code>npm install</code></li>
            <li>
              <code>.env.example</code> を <code>.env</code> にコピーし、<code>VITE_OPENAI_API_KEY</code> または{' '}
              <code>VITE_GEMINI_API_KEY</code> を設定
            </li>
            <li><code>npm run dev</code> で起動すると、このタブが会話画面になります</li>
          </ol>
          <p className="ai-demo-note">
            実装: <a href={`${REPO_URL}/blob/main/src/ai/tools.ts`} target="_blank" rel="noreferrer">src/ai/tools.ts</a>（ツール定義）／{' '}
            <a href={`${REPO_URL}/blob/main/src/ai/useAIChat.ts`} target="_blank" rel="noreferrer">src/ai/useAIChat.ts</a>（会話ループ）
          </p>
        </section>
      </div>
    </div>
  )
}
