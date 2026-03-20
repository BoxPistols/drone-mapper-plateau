import { useState, useRef, useEffect } from 'react'
import { useAIChat } from '../../ai/useAIChat'

const SUGGESTIONS = [
  '台東区の浅草上空を巡回する飛行計画を作って',
  '現在の飛行計画の状態を教えて',
  '離陸地点のピンを浅草寺に追加して',
  'シミュレーションを開始して',
  '福岡市に切り替えて',
]

export function AIPanel() {
  const { messages, loading, error, sendMessage, clearHistory } = useAIChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasApiKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY

  // 新メッセージで自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // API キー未設定の場合
  if (!hasApiKey) {
    return (
      <div className="ai-panel">
        <div className="ai-setup-guide">
          <div className="ai-setup-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
            </svg>
          </div>
          <h3 className="ai-setup-title">AI アシスタントの設定</h3>
          <p className="ai-setup-desc">
            自然言語で飛行計画を作成するには Anthropic API キーが必要です。
          </p>
          <div className="ai-setup-steps">
            <div className="ai-setup-step">
              <span className="ai-step-num">1</span>
              <span>プロジェクトルートに <code>.env.local</code> を作成</span>
            </div>
            <div className="ai-setup-step">
              <span className="ai-step-num">2</span>
              <span>以下を記入して保存</span>
            </div>
          </div>
          <pre className="ai-setup-code">VITE_ANTHROPIC_API_KEY=sk-ant-...</pre>
          <p className="ai-setup-note">
            ⚠️ これはデモ用設定です。<br/>
            本番環境ではサーバーサイドproxy経由にしてください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-panel">
      {/* ヘッダー */}
      <div className="ai-header">
        <div className="ai-header-left">
          <div className="ai-status-dot" />
          <span className="ai-header-title">AI アシスタント</span>
          <span className="ai-model-badge">Opus 4.6</span>
        </div>
        {messages.length > 0 && (
          <button className="ai-clear-btn" onClick={clearHistory} title="会話をリセット">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
            </svg>
          </button>
        )}
      </div>

      {/* メッセージエリア */}
      <div className="ai-messages">
        {messages.length === 0 && (
          <div className="ai-welcome">
            <p className="ai-welcome-text">
              飛行計画の作成・操作を自然言語でお手伝いします。
            </p>
            <div className="ai-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="ai-suggestion"
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ai-message-${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="ai-avatar">AI</div>
            )}
            <div className={`ai-bubble ai-bubble-${msg.role}`}>
              {msg.isThinking ? (
                <div className="ai-thinking">
                  <span /><span /><span />
                </div>
              ) : (
                <span className="ai-text">{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="ai-error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="ai-input-area">
        <textarea
          ref={inputRef}
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: 浅草上空を巡回する計画を作って"
          rows={2}
          disabled={loading}
        />
        <button
          className="ai-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          title="送信 (Enter)"
        >
          {loading ? (
            <div className="ai-spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
            </svg>
          )}
        </button>
      </div>
      <p className="ai-hint">Enter で送信 / Shift+Enter で改行</p>
    </div>
  )
}
