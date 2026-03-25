import { useState, useRef, useEffect } from 'react'
import { useAIChat, AI_MODELS, DEFAULT_MODEL, type AIModel } from '../../ai/useAIChat'

const LS_KEY_MODEL = 'drone-ai-model'
const SS_KEY_APIKEY = 'drone-ai-user-key' // sessionStorage（タブ閉じで消える）

function loadModel(): AIModel {
  const saved = localStorage.getItem(LS_KEY_MODEL)
  return AI_MODELS.find((m) => m.id === saved) ?? DEFAULT_MODEL
}

const SUGGESTIONS = [
  '台東区の浅草上空を巡回する飛行計画を作って',
  '現在の飛行計画の状態を教えて',
  '離陸地点のピンを浅草寺に追加して',
  'シミュレーションを開始して',
  '福岡市に切り替えて',
]

export function AIPanel() {
  const [selectedModel, setSelectedModel] = useState<AIModel>(loadModel)
  const [userApiKey, setUserApiKey] = useState<string>(sessionStorage.getItem(SS_KEY_APIKEY) ?? '')
  const [showSettings, setShowSettings] = useState(false)

  const { messages, loading, error, sendMessage, clearHistory } = useAIChat(
    selectedModel,
    userApiKey || null,
  )
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleModelChange = (id: string) => {
    const m = AI_MODELS.find((x) => x.id === id)
    if (!m) return
    setSelectedModel(m)
    localStorage.setItem(LS_KEY_MODEL, m.id)
  }

  const handleKeyChange = (val: string) => {
    setUserApiKey(val)
    if (val) sessionStorage.setItem(SS_KEY_APIKEY, val)
    else sessionStorage.removeItem(SS_KEY_APIKEY)
  }

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

  // API キーの有無チェック（無料モデルはアプリキーがあればOK）
  const hasAppKey = selectedModel.provider === 'gemini'
    ? !!import.meta.env.VITE_GEMINI_API_KEY
    : !!import.meta.env.VITE_OPENAI_API_KEY
  const isPremium = selectedModel.tier === 'premium'
  const canUse = isPremium ? !!userApiKey : hasAppKey

  return (
    <div className="ai-panel">
      {/* ヘッダー */}
      <div className="ai-header">
        <div className="ai-header-left">
          <div className="ai-status-dot" style={canUse ? undefined : { background: '#94a3b8' }} />
          <span className="ai-header-title">AI アシスタント</span>
        </div>
        <div className="ai-header-actions">
          <button
            className={`ai-settings-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="モデル設定"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          {messages.length > 0 && (
            <button className="ai-clear-btn" onClick={clearHistory} title="会話をリセット">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <div className="ai-settings">
          <label className="ai-settings-label">モデル</label>
          <div className="ai-model-list">
            {AI_MODELS.map((m) => {
              const disabled = m.tier === 'premium' && !userApiKey
              return (
                <button
                  key={m.id}
                  className={`ai-model-option ${selectedModel.id === m.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={() => !disabled && handleModelChange(m.id)}
                  disabled={disabled}
                >
                  <span className="ai-model-name">{m.label}</span>
                  <span className={`ai-model-tier ${m.tier}`}>
                    {m.tier === 'free' ? '無料' : 'PRO'}
                  </span>
                </button>
              )
            })}
          </div>

          <label className="ai-settings-label" style={{ marginTop: 12 }}>
            OpenAI API キー
            <span className="ai-settings-hint">入力すると GPT-5.4 mini が使えます</span>
          </label>
          <div className="ai-key-input-wrap">
            <input
              type="password"
              className="ai-key-input"
              value={userApiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="sk-..."
              spellCheck={false}
            />
            {userApiKey && (
              <button className="ai-key-clear" onClick={() => handleKeyChange('')} title="キーを削除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className="ai-settings-note">キーはセッション内のみ保持（タブを閉じると消えます）</p>
        </div>
      )}

      {/* モデルバッジ */}
      <div className="ai-model-bar">
        <span className={`ai-model-badge ${selectedModel.tier}`}>{selectedModel.label}</span>
        {!canUse && (
          <span className="ai-model-warn">
            {isPremium ? 'APIキーを入力してください' : 'アプリ側キー未設定'}
          </span>
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
                  disabled={loading || !canUse}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ai-message-${msg.role}`}>
            {msg.role === 'assistant' && <div className="ai-avatar">AI</div>}
            <div className={`ai-bubble ai-bubble-${msg.role}`}>
              {msg.isThinking ? (
                <div className="ai-thinking"><span /><span /><span /></div>
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
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={canUse ? '例: 浅草上空を巡回する計画を作って' : 'モデル設定を確認してください'}
          rows={2}
          disabled={loading || !canUse}
        />
        <button
          className="ai-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || loading || !canUse}
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
