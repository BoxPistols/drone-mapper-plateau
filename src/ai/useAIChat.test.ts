import { describe, it, expect } from 'vitest'
import { AI_MODELS, completionParams, findModel } from './useAIChat'

describe('completionParams', () => {
  it('OpenAIはtoolsを使うためreasoning_effortにnoneを明示し、max_completion_tokensを使う', () => {
    const openai = AI_MODELS.find((m) => m.provider === 'openai')!
    const params = completionParams(openai)
    expect(params).toEqual({ max_completion_tokens: 4096, reasoning_effort: 'none' })
    expect(params).not.toHaveProperty('max_tokens')
    expect(params).not.toHaveProperty('temperature')
  })

  it('GeminiのOpenAI互換にはreasoning_effortを送らずmax_tokensを使う', () => {
    const geminiModels = AI_MODELS.filter((m) => m.provider === 'gemini')
    expect(geminiModels.length).toBeGreaterThan(0)
    for (const m of geminiModels) {
      expect(completionParams(m)).toEqual({ max_tokens: 4096 })
    }
  })
})

describe('findModel', () => {
  it('選択肢はgpt-6-lunaとgemini-3.5-flash-liteだけ', () => {
    expect(AI_MODELS.map((m) => m.id)).toEqual(['gpt-6-luna', 'gemini-3.5-flash-lite'])
  })

  it('一覧にあるIDはそのまま返す', () => {
    expect(findModel('gpt-6-luna').id).toBe('gpt-6-luna')
    expect(findModel('gemini-3.5-flash-lite').id).toBe('gemini-3.5-flash-lite')
  })

  it('保存値のgemini-3.8-flashはgemini-3.5-flash-liteに寄せる', () => {
    expect(findModel('gemini-3.8-flash').id).toBe('gemini-3.5-flash-lite')
  })

  it('外したモデルや不正な保存値はgpt-6-lunaに戻す', () => {
    for (const saved of ['gemini-2.5-pro', 'gemini-3.6-flash', 'gpt-6-sol', 'gpt-5.6-luna', 'constructor', '', null]) {
      expect(findModel(saved).id).toBe('gpt-6-luna')
    }
  })
})
