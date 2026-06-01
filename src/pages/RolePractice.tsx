import { useState, useRef, useEffect, useCallback } from 'react'
import { roleplayScenarios } from '../data/roleplayScenarios'
import { useStore, type RoleplaySession } from '../store/useStore'
import { useGemini } from '../hooks/useGemini'

type Message = { role: 'user' | 'client' | 'system'; text: string }

export default function RolePractice() {
  const { level, apiKey, roleplaySessions, saveRoleplaySession, deleteRoleplaySession } = useStore()
  const { generate, loading, error } = useGemini()
  const [tab, setTab] = useState<'scenarios' | 'history'>('scenarios')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<'select' | 'chat' | 'feedback'>('select')
  const [feedback, setFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState(false)
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const filtered = roleplayScenarios.filter((s) => s.level === level || s.level === '共通')
  const selected = roleplayScenarios.find((s) => s.id === selectedId)
  const incompleteSessions = roleplaySessions.filter((s) => !s.completed)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const persistSession = useCallback((
    sid: string,
    scenario: typeof roleplayScenarios[0],
    msgs: Message[],
    fb = '',
    done = false
  ) => {
    saveRoleplaySession({
      id: sid,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      clientProfile: scenario.clientProfile,
      messages: msgs,
      feedback: fb,
      date: new Date().toLocaleDateString('ja-JP'),
      completed: done,
    })
  }, [saveRoleplaySession])

  const resetSession = useCallback(() => {
    setPhase('select')
    setSelectedId(null)
    setSessionId(null)
    setMessages([])
    setInput('')
    setFeedback('')
    setFeedbackError(false)
    setRetryFn(null)
  }, [])

  const startSession = useCallback(async (scenario: typeof roleplayScenarios[0]) => {
    if (!apiKey) {
      alert('APIキーを設定してください（右上のAPI設定ボタン）')
      return
    }
    const sid = Date.now().toString()
    setSelectedId(scenario.id)
    setSessionId(sid)
    setMessages([])
    setFeedback('')
    setFeedbackError(false)
    setRetryFn(null)
    setPhase('chat')
    setTab('scenarios')

    const is1Q = scenario.level === '1級'
    const openingPrompt = is1Q
      ? `${scenario.systemPrompt}

今からスーパービジョンが始まります。後輩キャリアコンサルタントとして、担当ケースについての相談を始めてください。
自然な最初の発言を1〜3文で話してください。`
      : `${scenario.systemPrompt}

今から面談が始まります。クライアントとして最初のひと言を言ってください。
相談に来た場面の自然な最初の発言を、1〜3文で話してください。`

    try {
      const opening = await generate(openingPrompt)
      const initial: Message[] = [{ role: 'client', text: opening }]
      setMessages(initial)
      persistSession(sid, scenario, initial)
      setRetryFn(null)
    } catch {
      setMessages([])
      setRetryFn(() => () => startSession(scenario))
    }
  }, [apiKey, generate, persistSession])

  const resumeSession = useCallback((session: RoleplaySession) => {
    const scenario = roleplayScenarios.find((s) => s.id === session.scenarioId)
    if (!scenario) return
    setSelectedId(session.scenarioId)
    setSessionId(session.id)
    setMessages(session.messages)
    setFeedback(session.feedback)
    setFeedbackError(false)
    setRetryFn(null)
    setPhase(session.completed ? 'feedback' : 'chat')
    setTab('scenarios')
  }, [])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !selected || !sessionId || loading) return
    const userText = input.trim()

    const newMessages: Message[] = [...messages, { role: 'user', text: userText }]
    setMessages(newMessages)

    const is1Q = selected.level === '1級'
    const myLabel = is1Q ? 'スーパーバイザー' : 'カウンセラー'
    const theirLabel = is1Q ? 'キャリアコンサルタント' : 'クライアント'

    const history = newMessages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? myLabel : theirLabel}：${m.text}`)
      .join('\n')

    const prompt = is1Q
      ? `${selected.systemPrompt}

【これまでの会話】
${history}

後輩キャリアコンサルタントとして、スーパーバイザーの最後の発言「${userText}」に自然に返答してください。
2〜3文で返答してください。`
      : `${selected.systemPrompt}

【これまでの会話】
${history}

クライアントとして、カウンセラーの最後の発言「${userText}」に自然に返答してください。
2〜4文で返答してください。`

    try {
      const reply = await generate(prompt)
      setInput('')
      const updated: Message[] = [...newMessages, { role: 'client', text: reply }]
      setMessages(updated)
      persistSession(sessionId, selected, updated)
      setRetryFn(null)
    } catch {
      setInput(userText)
      setMessages(messages)
      setRetryFn(() => () => { setInput(userText) })
    }
  }, [input, selected, sessionId, loading, messages, generate, persistSession])

  const endAndEvaluate = useCallback(async () => {
    if (!selected || !sessionId) return
    setFeedbackLoading(true)
    setFeedbackError(false)
    setPhase('feedback')

    const is1Q = selected.level === '1級'
    const myLabel = is1Q ? 'スーパーバイザー' : 'カウンセラー'
    const theirLabel = is1Q ? 'キャリアコンサルタント' : 'クライアント'

    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? myLabel : theirLabel}：${m.text}`)
      .join('\n')

    const prompt = is1Q
      ? `あなたはキャリアコンサルティング技能検定1級の評価者です。
以下のスーパービジョン記録を評価してください。

【シナリオ】${selected.title}
【スーパーバイジー（後輩CC）】${selected.clientProfile}

【評価観点】
${selected.evaluationPoints.join('\n')}

【スーパービジョン記録】
${history}

以下の形式で評価してください：

## 総合評価
（3〜5行でスーパーバイザーとしての全体的な評価）

## 良かった点
（具体的な発言を引用しながら2〜3点）

## 改善すべき点
（具体的な発言・場面を指摘しながら2〜3点）

## 各観点の評価
${selected.evaluationPoints.map((p) => `- ${p.split('：')[0]}：（評価コメント）`).join('\n')}

## 次のステップ
（スーパーバイザーとして成長するためのポイント）`
      : `あなたはキャリアコンサルティング技能検定の評価者です。
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
      persistSession(sessionId, selected, messages, text, true)
    } catch {
      setFeedbackError(true)
    } finally {
      setFeedbackLoading(false)
    }
  }, [selected, sessionId, messages, generate, persistSession])

  const shareSession = useCallback(async (session: RoleplaySession) => {
    const sessionScenario = roleplayScenarios.find((s) => s.id === session.scenarioId)
    const is1QSession = sessionScenario?.level === '1級'
    const myLabel = is1QSession ? 'スーパーバイザー' : 'カウンセラー'
    const theirLabel = is1QSession ? 'キャリアコンサルタント' : 'クライアント'
    const profileLabel = is1QSession ? 'スーパーバイジー' : 'クライアント'
    const recordLabel = is1QSession ? '--- スーパービジョン記録 ---' : '--- 面談記録 ---'
    const lines = [
      '【キャリコン学習 ロープレ記録】',
      `シナリオ：${session.scenarioTitle}`,
      `${profileLabel}：${session.clientProfile}`,
      `日時：${session.date}`,
      '',
      recordLabel,
      ...session.messages
        .filter((m) => m.role !== 'system')
        .map((m) => `${m.role === 'user' ? myLabel : theirLabel}：${m.text}`),
    ]
    if (session.feedback) {
      lines.push('', '--- AIフィードバック ---', session.feedback)
    }
    const text = lines.join('\n')

    try {
      if (navigator.share) {
        await navigator.share({ title: `ロープレ記録: ${session.scenarioTitle}`, text })
      } else {
        await navigator.clipboard.writeText(text)
        setCopiedId(session.id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch {
      // share cancelled or clipboard failed — silently ignore
    }
  }, [])

  const userTurns = messages.filter((m) => m.role === 'user').length

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">ロープレ練習</h1>

      {phase === 'select' && (
        <>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
            <button
              onClick={() => setTab('scenarios')}
              className={`flex-1 py-2 ${tab === 'scenarios' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              シナリオ一覧
            </button>
            <button
              onClick={() => setTab('history')}
              className={`flex-1 py-2 ${tab === 'history' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              履歴 ({roleplaySessions.length})
            </button>
          </div>

          {tab === 'scenarios' && (
            <div className="space-y-3">
              {incompleteSessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">途中のセッション</p>
                  {incompleteSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-purple-800 truncate">{s.scenarioTitle}</p>
                        <p className="text-xs text-purple-500">{s.date} · {s.messages.filter(m => m.role === 'user').length}ターン</p>
                      </div>
                      <button
                        onClick={() => resumeSession(s)}
                        className="ml-3 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 flex-shrink-0"
                      >
                        続きから
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">新しいシナリオ</p>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500">{incompleteSessions.length === 0 ? `シナリオを選んで練習しましょう（${level}対応）` : ''}</p>
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
                  <p className="text-xs text-gray-400 mt-0.5">{s.level === '1級' ? 'スーパーバイジー：' : 'クライアント：'}{s.clientProfile}</p>
                  <p className="text-sm text-gray-600 mt-1">{s.situation}</p>
                </button>
              ))}
              {!apiKey && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  AI機能の利用にはGemini APIキーが必要です（右上のAPI設定ボタン）
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3">
              {roleplaySessions.length === 0 ? (
                <p className="text-center text-gray-400 py-12">まだ履歴がありません</p>
              ) : (
                roleplaySessions.map((s) => (
                  <HistoryCard
                    key={s.id}
                    session={s}
                    expanded={expandedHistoryId === s.id}
                    copied={copiedId === s.id}
                    onToggle={() => setExpandedHistoryId(expandedHistoryId === s.id ? null : s.id)}
                    onResume={() => resumeSession(s)}
                    onShare={() => shareSession(s)}
                    onDelete={() => deleteRoleplaySession(s.id)}
                  />
                ))
              )}
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
            <button onClick={resetSession} className="text-sm text-gray-500 hover:text-gray-700">
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
                <button onClick={retryFn} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700">
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
                      <div className="text-xs text-gray-500 mb-1 font-medium">
                        {selected.level === '1級' ? 'キャリアコンサルタント' : 'クライアント'}
                      </div>
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
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder={selected.level === '1級' ? 'スーパーバイザーとして話しかけてください（Shift+Enterで送信、Enterで改行）' : 'カウンセラーとして話しかけてください（Shift+Enterで送信、Enterで改行）'}
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
                disabled={userTurns < 2}
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
                  <button onClick={endAndEvaluate} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700">
                    🔄 再生成
                  </button>
                </div>
              ) : feedback ? (
                <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
                  <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">面談フィードバック</h2>
                      <p className="text-purple-200 text-xs">Gemini AIによる評価</p>
                    </div>
                    {sessionId && (
                      <button
                        onClick={() => {
                          const s = roleplaySessions.find((s) => s.id === sessionId)
                          if (s) shareSession(s)
                        }}
                        className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg"
                      >
                        {copiedId === sessionId ? '✓ コピー済み' : '共有'}
                      </button>
                    )}
                  </div>
                  <div className="p-5">
                    <FeedbackDisplay text={feedback} />
                  </div>
                </div>
              ) : null}
              <button onClick={resetSession} className="w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                別のシナリオを練習する
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface HistoryCardProps {
  session: RoleplaySession
  expanded: boolean
  copied: boolean
  onToggle: () => void
  onResume: () => void
  onShare: () => void
  onDelete: () => void
}

function HistoryCard({ session, expanded, copied, onToggle, onResume, onShare, onDelete }: HistoryCardProps) {
  const userTurns = session.messages.filter((m) => m.role === 'user').length
  const is1Q = roleplayScenarios.find((s) => s.id === session.scenarioId)?.level === '1級'
  const myLabel = is1Q ? 'スーパーバイザー' : 'カウンセラー'
  const theirLabel = is1Q ? 'キャリアコンサルタント' : 'クライアント'
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${session.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {session.completed ? '完了' : '途中'}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate">{session.scenarioTitle}</span>
          </div>
          <p className="text-xs text-gray-400">{session.date} · {userTurns}ターン</p>
        </div>
        <span className="text-gray-400 text-sm ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500">{session.clientProfile}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {session.messages.filter((m) => m.role !== 'system').map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${m.role === 'user' ? 'bg-indigo-100 text-indigo-900' : 'bg-gray-100 text-gray-800'}`}>
                    <span className="font-medium opacity-60">{m.role === 'user' ? myLabel : theirLabel}　</span>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            {session.feedback && (
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer font-semibold text-purple-700 py-1">AIフィードバックを見る</summary>
                <pre className="mt-2 whitespace-pre-wrap font-sans leading-relaxed bg-purple-50 rounded-lg p-3">{session.feedback}</pre>
              </details>
            )}
          </div>
          <div className="flex gap-2 px-4 pb-4">
            {!session.completed && (
              <button onClick={onResume} className="flex-1 py-2 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700">
                続きから再開
              </button>
            )}
            <button onClick={onShare} className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200">
              {copied ? '✓ コピー済み' : '共有'}
            </button>
            <button onClick={onDelete} className="py-2 px-3 bg-red-50 text-red-500 text-xs rounded-lg hover:bg-red-100">
              削除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FeedbackDisplay({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm text-gray-700 leading-relaxed">
      {text.split('\n').filter(Boolean).map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} className="text-base font-bold text-purple-700 mt-4 mb-1">{line.replace('## ', '')}</h3>
        if (line.startsWith('- ')) return <p key={i} className="pl-4 before:content-['・'] before:-ml-4">{line.replace(/^- /, '')}</p>
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}
