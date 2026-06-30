import { useState, useRef, useEffect, useCallback } from 'react'
import { roleplayScenarios } from '../data/roleplayScenarios'
import { useStore, type RoleplaySession, type EssayFollowUpMessage, type OralAnswers } from '../store/useStore'
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
  const [phase, setPhase] = useState<'select' | 'chat' | 'oral' | 'feedback'>('select')
  const [oralGoodPoints, setOralGoodPoints] = useState('')
  const [oralAssessment, setOralAssessment] = useState('')
  const [oralFuturePlan, setOralFuturePlan] = useState('')
  const [feedback, setFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState(false)
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [followUpMessages, setFollowUpMessages] = useState<EssayFollowUpMessage[]>([])
  const [followUpInput, setFollowUpInput] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
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
    setFollowUpMessages([])
    setFollowUpInput('')
    setOralGoodPoints('')
    setOralAssessment('')
    setOralFuturePlan('')
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
    setFollowUpMessages(session.followUp || [])
    setFollowUpInput('')
    setFeedbackError(false)
    setRetryFn(null)
    setOralGoodPoints(session.oralAnswers?.goodPoints || '')
    setOralAssessment(session.oralAnswers?.assessment || '')
    setOralFuturePlan(session.oralAnswers?.futurePlan || '')
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

  const endAndEvaluate = useCallback(async (oral?: OralAnswers) => {
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
以下のスーパービジョン記録と受験者の口頭試問回答を踏まえて評価してください。

【シナリオ】${selected.title}
【スーパーバイジー（後輩CC）】${selected.clientProfile}

【評価観点】
${selected.evaluationPoints.join('\n')}

【スーパービジョン記録】
${history}
${oral ? `
【スーパーバイザーの口頭試問回答】
①良かった点・改善したい点：${oral.goodPoints}
②事例の進め方の問題：${oral.assessment}
③共有のための働きかけ：${oral.futurePlan}
` : ''}
以下の形式で評価してください：

## 総合評価
（3〜5行でスーパーバイザーとしての全体的な評価）

## 良かった点
（具体的な発言を引用しながら2〜3点）

## 改善すべき点
（具体的な発言・場面を指摘しながら2〜3点）

## 各観点の評価
${selected.evaluationPoints.map((p) => `- ${p.split('：')[0]}：（評価コメント）`).join('\n')}
${oral ? `
## 口頭試問の自己評価について
受験者の口頭試問回答と実際のスーパービジョン内容を照らし合わせ、自己評価の正確さ・気づきの深さを2〜3点コメントすること。` : ''}
## 次のステップ
（スーパーバイザーとして成長するためのポイント）`
      : `あなたはキャリアコンサルティング技能検定2級の評価者です。
以下のロールプレイ面談記録と受験者の口頭試問回答を踏まえて評価してください。

【シナリオ】${selected.title}
【クライアント】${selected.clientProfile}

【面談記録】
${history}
${oral ? `
【受験者の口頭試問回答】
①良かった点・改善点：${oral.goodPoints}
②問題の見立て（相談者・CC視点）：${oral.assessment}
③今後の展開：${oral.futurePlan}
` : ''}
以下の形式で評価してください：

## 総合評価
（3〜5行で全体的な評価）

## 良かった点
（具体的な発言を引用しながら2〜3点）

## 改善すべき点
（具体的な発言・場面を指摘しながら2〜3点）

## 4観点の評価（各100点満点・60点以上で合格水準）

### ①基本的態度：XX点
キャリアコンサルタントとしてありのままを受容し、言語・非言語で適切に表現できているか。相談者の個別問題に応じた助言や情報提供が適切にできているか。
（具体的な評価コメント。XXには0〜100の整数スコアを入れること）

### ②関係構築力：XX点
受容的・共感的・誠実な態度を維持しつつ、理論やスキルを用いた関わりができているか。
（具体的な評価コメント。XXには0〜100の整数スコアを入れること）

### ③問題把握力：XX点
相談者の訴えを傾聴し、問題の背景にある本質的な問題を捉えられているか。
（具体的な評価コメント。XXには0〜100の整数スコアを入れること）

### ④具体的展開力：XX点
相談者と共に目標を設定し、それを達成するための具体的な方策や展開ができているか。
（具体的な評価コメント。XXには0〜100の整数スコアを入れること）

## 総合判定
全4項目が60点以上の場合「合格水準」、1項目でも60点未満の場合「不合格水準：要改善」と明記し、その理由を1〜2文で述べること。
${oral ? `
## 口頭試問の自己評価について
受験者の口頭試問回答と実際の面談内容を照らし合わせ、自己評価の正確さ・気づきの深さを2〜3点コメントすること。` : ''}
## 次のステップ
（この練習から学べる技法・改善点）`

    try {
      const text = await generate(prompt)
      setFeedback(text)
      setFeedbackError(false)
      saveRoleplaySession({
        id: sessionId,
        scenarioId: selected.id,
        scenarioTitle: selected.title,
        clientProfile: selected.clientProfile,
        messages,
        feedback: text,
        oralAnswers: oral,
        date: new Date().toLocaleDateString('ja-JP'),
        completed: true,
      })
    } catch {
      setFeedbackError(true)
    } finally {
      setFeedbackLoading(false)
    }
  }, [selected, sessionId, messages, generate, saveRoleplaySession])

  const handleFollowUp = useCallback(async () => {
    if (!followUpInput.trim() || followUpLoading || !selected || !sessionId) return
    const userMsg: EssayFollowUpMessage = { role: 'user', text: followUpInput.trim() }
    const newMessages = [...followUpMessages, userMsg]
    setFollowUpMessages(newMessages)
    setFollowUpInput('')
    setFollowUpLoading(true)

    const is1Q = selected.level === '1級'
    const history = newMessages.slice(0, -1)
      .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.text}`)
      .join('\n')

    const prompt = `あなたはキャリアコンサルティング技能検定の専門家です。
${is1Q ? 'スーパービジョン' : 'ロールプレイ面談'}のフィードバックについて質問に答えてください。

【シナリオ】${selected.title}
【AIフィードバック】${feedback}
${history ? `\n【これまでのやりとり】\n${history}` : ''}

【質問】${userMsg.text}

日本語で丁寧に答えてください。具体的な改善例や技法の説明も含めてください。`

    try {
      const text = await generate(prompt)
      const aiMsg: EssayFollowUpMessage = { role: 'ai', text }
      const updated = [...newMessages, aiMsg]
      setFollowUpMessages(updated)
      const session = roleplaySessions.find((s) => s.id === sessionId)
      if (session) saveRoleplaySession({ ...session, followUp: updated })
    } catch { /* error handled by hook */ }
    setFollowUpLoading(false)
  }, [followUpInput, followUpLoading, followUpMessages, selected, sessionId, feedback, generate, roleplaySessions, saveRoleplaySession])

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
    if (session.oralAnswers) {
      const lbl2 = is1QSession ? '事例の進め方の問題' : '問題の見立て'
      const lbl3 = is1QSession ? '共有のための働きかけ' : '今後の展開'
      lines.push(
        '', '--- 口頭試問の回答 ---',
        `①良かった点・改善点：${session.oralAnswers.goodPoints}`,
        `②${lbl2}：${session.oralAnswers.assessment}`,
        `③${lbl3}：${session.oralAnswers.futurePlan}`
      )
    }
    if (session.feedback) {
      lines.push('', '--- AIフィードバック ---', session.feedback)
    }
    if (session.followUp?.length) {
      lines.push('', '--- フィードバックへの質問 ---')
      session.followUp.forEach((m) => lines.push(`${m.role === 'user' ? 'Q' : 'A'}：${m.text}`))
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
                    onUpdateSession={saveRoleplaySession}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {(phase === 'chat' || phase === 'oral' || phase === 'feedback') && selected && (
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
                onClick={() => setPhase('oral')}
                disabled={userTurns < 2}
                className="w-full py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                {selected.level === '1級' ? 'スーパービジョンを終了して口頭試問へ' : '面談を終了して口頭試問へ'}
              </button>
            </div>
          )}

          {phase === 'oral' && (
            <OralExamPanel
              is1Q={selected.level === '1級'}
              onSubmit={(answers) => endAndEvaluate(answers)}
              onBack={() => setPhase('chat')}
              goodPoints={oralGoodPoints}
              setGoodPoints={setOralGoodPoints}
              assessment={oralAssessment}
              setAssessment={setOralAssessment}
              futurePlan={oralFuturePlan}
              setFuturePlan={setOralFuturePlan}
            />
          )}

          {phase === 'feedback' && (
            <div className="space-y-4">
              {oralGoodPoints && (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 text-sm text-indigo-800 space-y-2">
                  <h3 className="font-semibold text-indigo-700">あなたの口頭試問回答</h3>
                  <p><span className="font-medium">①良かった点・改善点：</span>{oralGoodPoints}</p>
                  <p><span className="font-medium">{selected.level === '1級' ? '②事例の進め方の問題：' : '②問題の見立て：'}</span>{oralAssessment}</p>
                  <p><span className="font-medium">{selected.level === '1級' ? '③共有のための働きかけ：' : '③今後の展開：'}</span>{oralFuturePlan}</p>
                </div>
              )}
              {feedbackLoading ? (
                <div className="flex items-center gap-3 p-6 bg-white rounded-xl border-2 border-purple-100">
                  <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-600">AIがフィードバックを生成中...</span>
                </div>
              ) : feedbackError ? (
                <div className="flex flex-col items-center gap-3 p-6 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">フィードバックの生成に失敗しました（会話記録は保持されています）</p>
                  <button
                    onClick={() => endAndEvaluate(
                      oralGoodPoints ? { goodPoints: oralGoodPoints, assessment: oralAssessment, futurePlan: oralFuturePlan } : undefined
                    )}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700"
                  >
                    🔄 再生成
                  </button>
                </div>
              ) : feedback ? (
                <>
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
                  <RoleplayFollowUpChat
                    messages={followUpMessages}
                    input={followUpInput}
                    setInput={setFollowUpInput}
                    loading={followUpLoading}
                    onSend={handleFollowUp}
                  />
                </>
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
  onUpdateSession: (updated: RoleplaySession) => void
}

function HistoryCard({ session, expanded, copied, onToggle, onResume, onShare, onDelete, onUpdateSession }: HistoryCardProps) {
  const { generate } = useGemini()
  const userTurns = session.messages.filter((m) => m.role === 'user').length
  const is1Q = roleplayScenarios.find((s) => s.id === session.scenarioId)?.level === '1級'
  const myLabel = is1Q ? 'スーパーバイザー' : 'カウンセラー'
  const theirLabel = is1Q ? 'キャリアコンサルタント' : 'クライアント'
  const [localFollowUp, setLocalFollowUp] = useState<EssayFollowUpMessage[]>(session.followUp || [])
  const [localInput, setLocalInput] = useState('')
  const [localLoading, setLocalLoading] = useState(false)

  useEffect(() => { setLocalFollowUp(session.followUp || []) }, [session.followUp])

  const handleLocalFollowUp = async () => {
    if (!localInput.trim() || localLoading || !session.feedback) return
    const userMsg: EssayFollowUpMessage = { role: 'user', text: localInput.trim() }
    const newMessages = [...localFollowUp, userMsg]
    setLocalFollowUp(newMessages)
    setLocalInput('')
    setLocalLoading(true)
    const history = newMessages.slice(0, -1).map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.text}`).join('\n')
    const prompt = `あなたはキャリアコンサルティング技能検定の専門家です。
${is1Q ? 'スーパービジョン' : 'ロールプレイ面談'}のフィードバックについて質問に答えてください。

【シナリオ】${session.scenarioTitle}
【AIフィードバック】${session.feedback}
${history ? `\n【これまでのやりとり】\n${history}` : ''}

【質問】${userMsg.text}

日本語で丁寧に答えてください。具体的な改善例や技法の説明も含めてください。`
    try {
      const text = await generate(prompt)
      const aiMsg: EssayFollowUpMessage = { role: 'ai', text }
      const updated = [...newMessages, aiMsg]
      setLocalFollowUp(updated)
      onUpdateSession({ ...session, followUp: updated })
    } catch { /* error handled by hook */ }
    setLocalLoading(false)
  }

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
            {session.oralAnswers && (
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer font-semibold text-indigo-700 py-1">口頭試問の回答を見る</summary>
                <div className="mt-2 bg-indigo-50 rounded-lg p-3 space-y-2">
                  <p><span className="font-medium text-indigo-700">①良かった点・改善点：</span>{session.oralAnswers.goodPoints}</p>
                  <p><span className="font-medium text-indigo-700">{is1Q ? '②事例の進め方の問題：' : '②問題の見立て：'}</span>{session.oralAnswers.assessment}</p>
                  <p><span className="font-medium text-indigo-700">{is1Q ? '③共有のための働きかけ：' : '③今後の展開：'}</span>{session.oralAnswers.futurePlan}</p>
                </div>
              </details>
            )}
            {session.feedback && (
              <>
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer font-semibold text-purple-700 py-1">AIフィードバックを見る</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans leading-relaxed bg-purple-50 rounded-lg p-3">{session.feedback}</pre>
                </details>
                <RoleplayFollowUpChat
                  messages={localFollowUp}
                  input={localInput}
                  setInput={setLocalInput}
                  loading={localLoading}
                  onSend={handleLocalFollowUp}
                />
              </>
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

interface RoleplayFollowUpChatProps {
  messages: EssayFollowUpMessage[]
  input: string
  setInput: (v: string) => void
  loading: boolean
  onSend: () => void
}

function RoleplayFollowUpChat({ messages, input, setInput, loading, onSend }: RoleplayFollowUpChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
      <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
        <p className="text-sm font-semibold text-purple-800">フィードバックについて質問する</p>
        <p className="text-xs text-purple-500 mt-0.5">評価への疑問・改善方法・具体的な技法などを聞けます</p>
      </div>

      {messages.length > 0 && (
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user' ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{m.text}</pre>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-500">考え中...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="p-3 flex gap-2 border-t border-gray-100">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); onSend() } }}
          placeholder="質問を入力…（Shift+Enterで送信）"
          rows={2}
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400 resize-none disabled:opacity-50"
        />
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="px-3 py-2 bg-purple-600 text-white text-sm rounded-xl hover:bg-purple-700 disabled:opacity-50 self-end"
        >
          送信
        </button>
      </div>
    </div>
  )
}

interface OralExamPanelProps {
  is1Q?: boolean
  onSubmit: (answers: OralAnswers) => void
  onBack: () => void
  goodPoints: string
  setGoodPoints: (v: string) => void
  assessment: string
  setAssessment: (v: string) => void
  futurePlan: string
  setFuturePlan: (v: string) => void
}

function OralExamPanel({ is1Q, onSubmit, onBack, goodPoints, setGoodPoints, assessment, setAssessment, futurePlan, setFuturePlan }: OralExamPanelProps) {
  const canSubmit = goodPoints.trim() && assessment.trim() && futurePlan.trim()

  const q1 = is1Q
    ? '今回のロールプレイを振り返って、良かった点・改善したい点は何ですか。'
    : '面談を振り返って、良かった点と改善したい点を教えてください。'
  const q1placeholder = is1Q
    ? '例：スーパーバイジーの気持ちに寄り添えた。一方で、ケースの核心に踏み込む問いかけが不足していた。'
    : '例：傾聴を意識して相槌を打てた。一方で、クライアントの感情への共感が薄かったと感じる。'
  const q2 = is1Q
    ? 'この事例相談者（スーパーバイジー）の事例の進め方の問題は何ですか。'
    : '相談者の問題点をどう見立てましたか？（相談者・キャリコン両視点で）'
  const q2placeholder = is1Q
    ? '例：スーパーバイジーがクライアントの感情面への対応を後回しにし、情報収集に偏った面談をしている点。'
    : '例：相談者視点では転職への不安が主訴。CC視点では自己効力感の低下と環境要因の整理が必要と見立てた。'
  const q3 = is1Q
    ? 'その問題を事例相談者と共有するために、どのような働きかけをしましたか。'
    : '今後の面談の展開をどのように考えますか？'
  const q3placeholder = is1Q
    ? '例：「クライアントがその時どんな気持ちだったか」と問いかけ、感情への着目を促した。'
    : '例：次回は職業興味の棚卸しを行い、具体的な求人情報の収集方法を一緒に検討する予定。'

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h2 className="font-bold text-indigo-800 text-base mb-1">口頭試問</h2>
        <p className="text-xs text-indigo-600">
          {is1Q ? '1級実技試験と同様に、スーパービジョン終了後に3問に答えてください。' : '2級実技試験と同様に、面談終了後に3問に答えてください。'}
          回答はAIフィードバックに反映されます。
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Q1. {q1}</label>
          <textarea
            value={goodPoints}
            onChange={(e) => setGoodPoints(e.target.value)}
            placeholder={q1placeholder}
            rows={3}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Q2. {q2}</label>
          <textarea
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            placeholder={q2placeholder}
            rows={3}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Q3. {q3}</label>
          <textarea
            value={futurePlan}
            onChange={(e) => setFuturePlan(e.target.value)}
            placeholder={q3placeholder}
            rows={3}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
        >
          {is1Q ? '← スーパービジョンに戻る' : '← 面談に戻る'}
        </button>
        <button
          onClick={() => onSubmit({ goodPoints: goodPoints.trim(), assessment: assessment.trim(), futurePlan: futurePlan.trim() })}
          disabled={!canSubmit}
          className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
        >
          AIフィードバックを受ける
        </button>
      </div>
    </div>
  )
}

function FeedbackDisplay({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm text-gray-700 leading-relaxed">
      {text.split('\n').filter(Boolean).map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} className="text-base font-bold text-purple-700 mt-4 mb-1">{line.replace('## ', '')}</h3>
        if (line.startsWith('### ')) {
          const heading = line.replace('### ', '')
          const scoreMatch = heading.match(/：(\d+)点/)
          if (scoreMatch) {
            const score = parseInt(scoreMatch[1])
            const pass = score >= 60
            const label = heading.replace(/：\d+点/, '')
            return (
              <div key={i} className="flex items-center gap-2 mt-3 mb-0.5">
                <h4 className="text-sm font-bold text-gray-800">{label}</h4>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {score}点 {pass ? '✓合格' : '✗要改善'}
                </span>
              </div>
            )
          }
          return <h4 key={i} className="text-sm font-bold text-gray-800 mt-3 mb-0.5">{heading}</h4>
        }
        if (line.startsWith('- ')) return <p key={i} className="pl-4 before:content-['・'] before:-ml-4">{line.replace(/^- /, '')}</p>
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}
