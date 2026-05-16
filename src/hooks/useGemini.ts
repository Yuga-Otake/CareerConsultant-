import { useState } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useStore } from '../store/useStore'

export function useGemini() {
  const apiKey = useStore((s) => s.apiKey)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async (prompt: string): Promise<string> => {
    if (!apiKey) {
      throw new Error('APIキーが設定されていません。設定からGemini APIキーを入力してください。')
    }
    setLoading(true)
    setError(null)
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '不明なエラーが発生しました'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  const generateStream = async (
    prompt: string,
    onChunk: (text: string) => void
  ): Promise<void> => {
    if (!apiKey) {
      throw new Error('APIキーが設定されていません。設定からGemini APIキーを入力してください。')
    }
    setLoading(true)
    setError(null)
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContentStream(prompt)
      for await (const chunk of result.stream) {
        onChunk(chunk.text())
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '不明なエラーが発生しました'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  return { generate, generateStream, loading, error }
}
