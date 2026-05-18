import { useState, useRef, useEffect, useCallback } from 'react'
import { roleplayScenarios } from '../data/roleplayScenarios'
import { useStore } from '../store/useStore'
import { useGemini } from '../hooks/useGemini'

interface Message {
  role: 'user' | 'client' | 'system'
  text: string
}

export default function RolePractice() {
  const { level, apiKey } = useStore()
  const { generate, loading, error } = useGemini()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<'select' | 'chat' | 'feedback'>('select')
  const [feedback, setFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState(false)
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const filtered = roleplayScenarios.filter((s) => s.level === level || s.level === '共通')
  const selected = roleplayScenarios.find((s) => s.id === selectedId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startSession = useCallback(async (scenario: typeof roleplayScenarios[0]) => {
    if (!apiKey) {
      alert('APIキーを設定してください（右上のAPI設定ボタン）')
      return
    }
    setSelectedId(scenario.id)
    setMessages([])
    setFeedback('')
    setFeedbackError(false)
    setRetryFn(null)
    setPhase('chat')

    const openingPrompt = `${scenario.systemPrompt}

今から面談が始まります。クライアントとして最初のひと言を言ってください。
相談に来た場面の自然な最初の発言を、1〜3文で話してください。`

    try {
      const opening = await generate(openingPrompt)
      setMessages([{ role: 'client', text: opening }])
      setRetryFn(null)
    } catch {
      setMessages([])
      setRetryFn(() => () => startSession(scenario))
    }
  }, [apiKey, generate])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !selected || loading) return
    const userText = input.trim()

    const newMessages: Message[] = [...messages, { role: 'user', text: userText }]
    setMessages(newMessages)

    const history = newMessages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'カウンセラー' : 'クライアント'}：${m.text}`)
      .join('\n')

    const prompt = `${selected.systemPrompt}

【これまでの会話】
${history}

クライアントとして、カウンセラーの最後の発言「${userText}」に自然に返答してください。
2〜4文で返答してください。`

    try {
      const reply = await generate(prompt)
      setInput('')
      setMessages((prev) => [...prev, { role: 'client', text: reply }])
      setRetryFn(null)
    } catch {
      // 入力欄にテキストを戻し、ユーザーメッセージは会話に残す
      setInput(userText)
      setMessages(newMessages)
      setRetryFn(() => () => {
        setInput(userText)
      })
    }
  }, [input, selected, loading, messages, generate])

  const endAndEvaluate = useCallback(async () => {
    if (!selected) return
    setFeedbackLoading(true)
    setFeedbackError(false)
    setPhase('feedback')

    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'カウンセラー' : 'クライアント'}：${m.text}`)
      .join('\n')

    const prompt = `あなたはキャリアコンサルティング技能検定の評価者です。
以下のロールプレイ面談記録を評価してください。

【シナリオ】${selected.title}
【クライアント】${selected.clientProfile}

【評価観点】
${selected.evaluationPoints.join('\n')}

【面談記録】
${history}

以下の形式で評価してください：

## 総合評価
（3〜5行で全体的な評価）

## 良かった点
（具体的な発言を引用しながら2〜3点）

## 改善すべき点
（具体的な発言・場面を指摘しながら2〜3点）

## 各観点の評価
${selected.evaluationPoints.map((p) => `- ${p.split('：')[0]}：（評価コメント）`).join('\n')}

## 次のステップ
（この練習から学べる技法・改善点）`

    try {
      const text = await generate(prompt)
      setFeedback(text)
      setFeedbackError(false)
    } catch {
      setFeedbackError(true)
    } finally {
      setFeedbackLoading(false)
    }
  }, [selected, messages, generate])

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">ロープレ練習</h1>

      {phase === 'select' && (
        <>
          <p className="text-sm text-gray-500">シナリオを選んでキャリアカウンセリングの練習をしましょう（{level}対応）</p>
          <div className="space-y-3">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => startSession(s)}
                className="w-full text-left bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 p-4 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎭</span>
                  <span className="font-semibold text-gray-800">{s.title}</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-auto">{s.level}</span>
                </div>
                <p className="text-sm text-gray-500">{s.clientProfile}</p>
                <p className="text-sm text-gray-600 mt-1">{s.situation}</p>
              </button>
            ))}
          </div>
          {!apiKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              AI機能の利用にはGemini APIキーが必要です（右上のAPI設定ボタン）
            </div>
          )}
        </>
      )}

      {(phase === 'chat' || phase === 'feedback') && selected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-800">{selected.title}</span>
              <p className="text-xs text-gray-400 mt-0.5">{selected.clientProfile}</p>
            </div>
            <button
              onClick={() => { setPhase('select'); setSelectedId(null); setMessages([]); setInput(''); setRetryFn(null) }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ✕ 終了
            </button>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-700">
            <strong>状況：</strong>{selected.situation}
          </div>

          <div className="bg-white rounded-xl border-2 border-gray-200 min-h-64 max-h-96 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !loading && retryFn && (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-sm text-red-500">セッションの開始に失敗しました</p>
                <button
                  onClick={retryFn}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700"
                >
                  🔄 再試行
                </button>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : m.role === 'system' ? 'justify-center' : 'justify-start'}`}>
                {m.role === 'system' ? (
                  <span className="text-xs text-gray-400 italic">{m.text}</span>
                ) : (
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                    {m.role === 'client' && (
                      <div className="text-xs text-gray-500 mb-1 font-medium">クライアント</div>
                    )}
                    <p className="leading-relaxed">{m.text}</p>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {phase === 'chat' && (
            <div className="space-y-2">
              {error && (
                <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <p className="text-xs text-red-600 flex-1">送信失敗（入力欄に内容を保持しています）</p>
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="ml-2 px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50 flex-shrink-0"
                  >
                    🔄 再試行
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="カウンセラーとして話しかけてください（Enterで送信、Shift+Enterで改行）"
                  rows={2}
                  className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400 resize-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  送信
                </button>
              </div>
              <button
                onClick={endAndEvaluate}
                disabled={messages.filter((m) => m.role === 'user').length < 2}
                className="w-full py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                面談を終了してフィードバックを受ける
              </button>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="space-y-4">
              {feedbackLoading ? (
                <div className="flex items-center gap-3 p-6 bg-white rounded-xl border-2 border-purple-100">
                  <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-600">AIがフィードバックを生成中...</span>
                </div>
              ) : feedbackError ? (
                <div className="flex flex-col items-center gap-3 p-6 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">フィードバックの生成に失敗しました（会話記録は保持されています）</p>
                  <button
                    onClick={endAndEvaluate}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700"
                  >
                    🔄 再生成
                  </button>
                </div>
              ) : feedback ? (
                <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
                  <div className="bg-purple-600 text-white px-4 py-3">
                    <h2 className="font-semibold">面談フィードバック</h2>
                    <p className="text-purple-200 text-xs">Gemini AIによる評価</p>
                  </div>
                  <div className="p-5">
                    <FeedbackDisplay text={feedback} />
                  </div>
                </div>
              ) : null}
              <button
                onClick={() => { setPhase('select'); setSelectedId(null); setMessages([]); setInput(''); setRetryFn(null) }}
                className="w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                別のシナリオを練習する
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FeedbackDisplay({ text }: { text: string }) {
  const lines = text.split('\n').filter(Boolean)
  return (
    <div className="space-y-1 text-sm text-gray-700 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i} className="text-base font-bold text-purple-700 mt-4 mb-1">{line.replace('## ', '')}</h3>
        }
        if (line.startsWith('- ')) {
          return <p key={i} className="pl-4 before:content-['・'] before:-ml-4">{line.replace(/^- /, '')}</p>
        }
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}
