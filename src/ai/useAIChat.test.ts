import { describe, it, expect } from 'vitest'
import { AI_MODELS, completionParams, findModel, type AIModel } from './useAIChat'

describe('completionParams', () => {
  it('OpenAIはtoolsを使うためreasoning_effortにnoneを明示し、max_completion_tokensを使う', () => {
    const openai = AI_MODELS.find((m) => m.provider === 'openai')!
    const params = completionParams(openai)
    expect(params).toEqual({ max_completion_tokens: 4096, reasoning_effort: 'none' })
    expect(params).not.toHaveProperty('max_tokens')
    expect(params).not.toHaveProperty('temperature')
  })

  it('GeminiのOpenAI互換にはreasoning_effortを送らずmax_tokensを使う', () => {
    // 選択肢にGeminiが無いあいだも呼び出し処理は残すため、モデルを直接組み立てて確かめる
    const gemini: AIModel = { id: 'gemini-3.5-flash-lite', label: 'Gemini', provider: 'gemini', tier: 'free' }
    expect(completionParams(gemini)).toEqual({ max_tokens: 4096 })
  })
})

describe('findModel', () => {
  it('選択肢はgpt-6-lunaだけ', () => {
    expect(AI_MODELS.map((m) => m.id)).toEqual(['gpt-6-luna'])
  })

  it('外したGeminiや不正な保存値はgpt-6-lunaに戻す', () => {
    for (const saved of ['gemini-3.8-flash', 'gemini-2.5-pro', 'gpt-5.6-luna', '', null]) {
      expect(findModel(saved).id).toBe('gpt-6-luna')
    }
  })
})
