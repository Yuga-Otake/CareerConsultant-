import { useState } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { useStore } from '../store/useStore'

const MODEL = 'gemini-2.5-flash'
const API_VERSION = 'v1beta'
const RETRY_STATUSES = ['[429]', '[500]', '[502]', '[503]']
const MAX_ATTEMPTS = 4

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const isRetryable = (msg: string) => RETRY_STATUSES.some((s) => msg.includes(s))
const extractRetryDelay = (msg: string): number => {
  const match = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/)
  return match ? parseInt(match[1]) * 1000 : 0
}

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
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey)
          const model = genAI.getGenerativeModel({ model: MODEL }, { apiVersion: API_VERSION })
          const result = await model.generateContent(prompt)
          return result.response.text()
        } catch (e) {
          const msg = e instanceof Error ? e.message : ''
          if (attempt === MAX_ATTEMPTS - 1 || !isRetryable(msg)) throw e
          const delay = extractRetryDelay(msg) || 1000 * Math.pow(2, attempt)
          await sleep(delay)
        }
      }
      throw new Error('リトライ上限に達しました')
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
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey)
          const model = genAI.getGenerativeModel({ model: MODEL }, { apiVersion: API_VERSION })
          const result = await model.generateContentStream(prompt)
          for await (const chunk of result.stream) {
            onChunk(chunk.text())
          }
          return
        } catch (e) {
          const msg = e instanceof Error ? e.message : ''
          if (attempt === MAX_ATTEMPTS - 1 || !isRetryable(msg)) throw e
          const delay = extractRetryDelay(msg) || 1000 * Math.pow(2, attempt)
          await sleep(delay)
        }
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
