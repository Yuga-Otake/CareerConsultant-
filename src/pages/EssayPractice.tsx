import { useState, useEffect, useRef } from 'react'
import { essayQuestions, transcriptQuestions } from '../data/essayQuestions'
import type { TranscriptQuestion } from '../data/essayQuestions'
import { useStore } from '../store/useStore'
import type { EssayRecord, EssayFollowUpMessage } from '../store/useStore'
import { useGemini } from '../hooks/useGemini'

interface ScoreResult {
  scores: { label: string; score: number; comment: string }[]
  total: number
  overall: string
}

function parseScore(text: string): ScoreResult {
  const lines = text.split('\n').filter(Boolean)
  const scores: { label: string; score: number; comment: string }[] = []
  let overall = ''
  let totalMatch = 0

  const criteria = [
    '問題の把握', '目標の明確化', '具体的支援計画', '倫理',
    '逐語記録', '面接技法', '適切な応答', '問題分析',
    '指導内容', '指導関係', 'アセスメント', 'セッション計画',
    '具体的手法', '全体', '論述', '表現',
  ]

  let currentScore = 0
  const numMatch = text.match(/合計[：:]?\s*(\d+)/)?.[1]
  if (numMatch) totalMatch = parseInt(numMatch)
  const allScores = [...text.matchAll(/(\d+)\s*点/g)].map((m) => parseInt(m[1]))

  criteria.forEach((label, idx) => {
    const match = text.match(new RegExp(`${label}[^\\n]*?(\\d+)\\s*点`, 'i'))
    if (match) {
      const score = parseInt(match[1])
      currentScore += score
      const lineIdx = lines.findIndex((l) => l.includes(label))
      const comment = lineIdx >= 0 ? lines.slice(lineIdx, lineIdx + 3).join(' ').replace(/\d+点/, '').trim() : ''
      if (scores.length < 4) scores.push({ label, score, comment })
    }
    idx
  })

  if (scores.length === 0) {
    allScores.slice(0, 4).forEach((s, i) => scores.push({ label: `観点${i + 1}`, score: s, comment: '' }))
  }

  const total = totalMatch || currentScore || scores.reduce((a, b) => a + b.score, 0)
  const overallMatch = text.match(/総評[：:]\s*([^\n]+)/)
  overall = overallMatch ? overallMatch[1] : text.split('\n').slice(-3).join(' ')
  return { scores, total, overall }
}

interface SubScore { raw: string; score: number }
type SubScores = (SubScore | null)[]

// ────────────────────────────────────────────────────────────
// Main page component
// ────────────────────────────────────────────────────────────
export default function EssayPractice() {
  const { level, addEssayRecord, updateEssayRecord, deleteEssayRecord, essayRecords, essayDraft, setEssayDraft } = useStore()
  const { generate, loading, error } = useGemini()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [rawFeedback, setRawFeedback] = useState('')
  const [showModel, setShowModel] = useState(false)
  const [tab, setTab] = useState<'practice' | 'history'>('practice')

  // Transcript-specific
  const [subAnswers, setSubAnswers] = useState<string[]>(['', '', ''])
  const [subScores, setSubScores] = useState<SubScores>([null, null, null])
  const [scoringStep, setScoringStep] = useState<number>(-1)
  const [showTranscript, setShowTranscript] = useState(true)

  // Record tracking (for follow-up)
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null)
  const [followUpMessages, setFollowUpMessages] = useState<EssayFollowUpMessage[]>([])
  const [followUpInput, setFollowUpInput] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredEssay = essayQuestions.filter((q) => q.level === level)
  const filteredTranscript = transcriptQuestions.filter((q) => q.level === level)
  const selectedEssay = essayQuestions.find((q) => q.id === selectedId)
  const selectedTranscript = transcriptQuestions.find((q) => q.id === selectedId)
  const isTranscript = !!selectedTranscript

  const totalSubScore = subScores.reduce((a, b) => a + (b?.score || 0), 0)
  const allAnswered = selectedTranscript
    ? selectedTranscript.subQuestions.every((_, i) => subAnswers[i].trim())
    : false
  const allScored = selectedTranscript
    ? selectedTranscript.subQuestions.every((_, i) => subScores[i] !== null)
    : false
  const hasScoredSome = subScores.some((s) => s !== null)

  const resetState = (clearDraft = true) => {
    setAnswer('')
    setScoreResult(null)
    setRawFeedback('')
    setShowModel(false)
    setSubAnswers(['', '', ''])
    setSubScores([null, null, null])
    setScoringStep(-1)
    setShowTranscript(true)
    setCurrentRecordId(null)
    setFollowUpMessages([])
    setFollowUpInput('')
    if (clearDraft) setEssayDraft(null)
  }

  // Resume from draft
  const resumeDraft = () => {
    if (!essayDraft) return
    setSelectedId(essayDraft.questionId)
    setAnswer(essayDraft.answer)
    setSubAnswers(essayDraft.subAnswers.length === 3 ? essayDraft.subAnswers : ['', '', ''])
  }

  // Auto-save draft when writing (not yet scored)
  useEffect(() => {
    if (!selectedId || currentRecordId) return
    const isTranscriptQ = transcriptQuestions.some((q) => q.id === selectedId)
    const hasContent = isTranscriptQ ? subAnswers.some((a) => a.trim()) : answer.trim()
    if (hasContent) {
      setEssayDraft({ questionId: selectedId, answer, subAnswers })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, subAnswers, selectedId])

  // Auto-save when all transcript sub-questions are scored
  useEffect(() => {
    if (!selectedTranscript || !allScored || currentRecordId) return
    const id = `essay-${Date.now()}`
    setCurrentRecordId(id)
    setEssayDraft(null)
    const combined = subScores
      .map((s, i) => (s ? `【問${i + 1}のフィードバック】\n${s.raw}` : ''))
      .filter(Boolean)
      .join('\n\n---\n\n')
    addEssayRecord({
      id,
      questionId: selectedTranscript.id,
      answer: JSON.stringify(subAnswers),
      score: totalSubScore,
      feedback: combined,
      date: new Date().toLocaleDateString('ja-JP'),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allScored])

  // ── Regular essay scoring ────────────────────────────────
  const handleScore = async () => {
    if (!selectedEssay || !answer.trim()) return
    const prompt = `あなたはキャリアコンサルティング技能検定の採点官です。以下の論述問題の回答を100点満点で採点してください。

【問題】
${selectedEssay.question}

【採点基準】
${selectedEssay.scoringCriteria.join('\n')}

【受験者の回答】
${answer}

以下の形式で評価してください：

## 各観点の評価
${selectedEssay.scoringCriteria.map((c, i) => `${i + 1}. ${c.split('（')[0]}：XX点\nコメント：（具体的なフィードバック）`).join('\n\n')}

## 合計：XX点 / 100点

## 総評：
（全体的な評価と改善のポイントを3〜5行で）

## 改善のための具体的アドバイス：
（箇条書きで2〜3点）`
    try {
      const text = await generate(prompt)
      setRawFeedback(text)
      const result = parseScore(text)
      setScoreResult(result)
      if (!currentRecordId) {
        const id = `essay-${Date.now()}`
        setCurrentRecordId(id)
        setEssayDraft(null)
        addEssayRecord({
          id,
          questionId: selectedEssay.id,
          answer,
          score: result.total,
          feedback: text,
          date: new Date().toLocaleDateString('ja-JP'),
        })
      }
    } catch { /* error shown by hook */ }
  }

  // ── Transcript scoring ───────────────────────────────────
  const scoreOneTranscript = async (idx: number, question: typeof selectedTranscript): Promise<SubScore | null> => {
    if (!question) return null
    const sq = question.subQuestions[idx]
    const ans = subAnswers[idx]
    if (!ans.trim()) return null
    setScoringStep(idx)
    const prompt = `あなたはキャリアコンサルティング技能検定2級の採点官です。
逐語記録を読んだ上で、以下の設問に対する回答を採点してください。

【相談者プロフィール】
${question.clientProfile}

【逐語記録】
${question.transcript}

【設問（${sq.maxScore}点満点）】
${sq.question}

【受験者の回答】
${ans}

【模範解答のポイント】
${sq.modelAnswer}

以下の形式で採点結果を返してください：

## 得点：XX点 / ${sq.maxScore}点

## 評価：
（この回答の良い点を具体的に2〜3点）

## 改善点：
（不足している観点や改善できる点を2〜3点）

## 総評：
（全体的なコメントを2〜3行で）`
    try {
      const text = await generate(prompt)
      const scoreMatch = text.match(/得点[：:]?\s*(\d+)\s*点/)
      const score = scoreMatch ? parseInt(scoreMatch[1]) : Math.round(sq.maxScore * 0.6)
      const result: SubScore = { raw: text, score }
      setSubScores((prev) => { const next = [...prev]; next[idx] = result; return next })
      setScoringStep(-1)
      return result
    } catch {
      setScoringStep(-1)
      return null
    }
  }

  const handleScoreTranscript = async (idx: number) => {
    await scoreOneTranscript(idx, selectedTranscript)
  }

  const handleScoreAll = async () => {
    if (!selectedTranscript) return
    const results: SubScores = [...subScores]
    for (let i = 0; i < selectedTranscript.subQuestions.length; i++) {
      if (subAnswers[i].trim() && !results[i]) {
        results[i] = await scoreOneTranscript(i, selectedTranscript)
      }
    }
    // useEffect will auto-save when allScored becomes true
  }

  // ── Follow-up chat ───────────────────────────────────────
  const buildFollowUpContext = () => {
    if (selectedTranscript) {
      return `【問題】${selectedTranscript.title}
【相談者プロフィール】${selectedTranscript.clientProfile}
【逐語記録】${selectedTranscript.transcript}

【受験者の解答と採点結果】
${subScores.map((s, i) => s ? `問${i + 1}（${selectedTranscript.subQuestions[i].maxScore}点満点）：${s.score}点\n解答：${subAnswers[i]}\nフィードバック：${s.raw}` : '').filter(Boolean).join('\n\n')}`
    }
    if (selectedEssay) {
      return `【問題】${selectedEssay.question}
【受験者の解答】${answer}
【AIフィードバック】${rawFeedback}`
    }
    return ''
  }

  const handleFollowUp = async () => {
    if (!followUpInput.trim() || followUpLoading || !currentRecordId) return
    const userMsg: EssayFollowUpMessage = { role: 'user', text: followUpInput.trim() }
    const newMessages = [...followUpMessages, userMsg]
    setFollowUpMessages(newMessages)
    setFollowUpInput('')
    setFollowUpLoading(true)

    const history = newMessages.slice(0, -1)
      .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.text}`)
      .join('\n')

    const prompt = `あなたはキャリアコンサルティング技能検定の専門家です。
受験者が採点結果について質問しています。丁寧に答えてください。

【採点コンテキスト】
${buildFollowUpContext()}
${history ? `\n【これまでのやりとり】\n${history}` : ''}

【受験者の質問】
${userMsg.text}

日本語で分かりやすく答えてください。具体例や根拠も含めてください。`

    try {
      const text = await generate(prompt)
      const aiMsg: EssayFollowUpMessage = { role: 'ai', text }
      const updated = [...newMessages, aiMsg]
      setFollowUpMessages(updated)
      updateEssayRecord(currentRecordId, updated)
    } catch { /* error handled by hook */ }
    setFollowUpLoading(false)
  }

  // ── Share ────────────────────────────────────────────────
  const shareRecord = async (record: EssayRecord) => {
    const tq = transcriptQuestions.find((q) => q.id === record.questionId)
    const q = essayQuestions.find((q) => q.id === record.questionId)
    let parsedAnswers: string[] | null = null
    try { if (record.answer.startsWith('[')) parsedAnswers = JSON.parse(record.answer) } catch { /* ignore */ }

    const lines = [
      '【キャリコン学習 論述記録】',
      `問題：${tq?.title || q?.type || record.questionId}`,
      `日時：${record.date}`,
      `得点：${record.score}点`,
      '',
      '--- 解答 ---',
      ...(parsedAnswers
        ? parsedAnswers.map((a, i) => `問${i + 1}：\n${a}`)
        : [`回答：\n${record.answer}`]),
      '',
      '--- AIフィードバック ---',
      record.feedback,
      ...(record.followUp?.length ? [
        '',
        '--- フォローアップQ&A ---',
        ...record.followUp.map((m) => `${m.role === 'user' ? 'Q' : 'A'}：${m.text}`),
      ] : []),
    ]
    const text = lines.join('\n')
    if (navigator.share) {
      await navigator.share({ title: '論述記録', text })
    } else {
      await navigator.clipboard.writeText(text)
      setCopiedId(record.id || 'current')
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  // Share current session (not yet in history)
  const shareCurrentSession = async () => {
    if (!currentRecordId) return
    const record = essayRecords.find((r) => r.id === currentRecordId)
    if (record) shareRecord(record)
  }

  // ── Render ───────────────────────────────────────────────
  const scoringDone = !!(scoreResult || allScored)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">論述練習</h1>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
          <button
            onClick={() => setTab('practice')}
            className={`px-3 py-1.5 ${tab === 'practice' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            問題を解く
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-3 py-1.5 ${tab === 'history' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            解答履歴 ({essayRecords.length})
          </button>
        </div>
      </div>

      {tab === 'history' ? (
        <div className="space-y-3">
          {essayRecords.length === 0 ? (
            <p className="text-center text-gray-400 py-12">まだ解答履歴がありません</p>
          ) : (
            essayRecords.map((r, i) => (
              <HistoryCard
                key={i}
                record={r}
                copiedId={copiedId}
                onShare={shareRecord}
                onDelete={(id) => id && deleteEssayRecord(id)}
                onFollowUpSend={(id, msgs, input) => {
                  // inline follow-up from history
                  setCurrentRecordId(id)
                  setFollowUpMessages(msgs)
                  setFollowUpInput(input)
                }}
                onUpdate={updateEssayRecord}
                generate={generate}
              />
            ))
          )}
        </div>
      ) : (
        <>
          {!selectedId ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">問題を選んで練習しましょう（{level}対応）</p>

              {/* Resume draft banner */}
              {essayDraft && (() => {
                const draftTQ = transcriptQuestions.find((q) => q.id === essayDraft.questionId)
                const draftEQ = essayQuestions.find((q) => q.id === essayDraft.questionId)
                const draftTitle = draftTQ?.title ?? draftEQ?.question.slice(0, 40)
                const filledCount = draftTQ
                  ? essayDraft.subAnswers.filter((a) => a.trim()).length
                  : essayDraft.answer.trim() ? 1 : 0
                if (!draftTitle || filledCount === 0) return null
                return (
                  <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-indigo-600 mb-0.5">前回の続き</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{draftTitle}{draftTitle && draftTQ ? '' : '…'}</p>
                      <p className="text-xs text-indigo-500 mt-0.5">{draftTQ ? `${filledCount}/3問 回答済み` : '回答を入力中'}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { resetState(false); resumeDraft() }}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        続きから
                      </button>
                      <button
                        onClick={() => setEssayDraft(null)}
                        className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })()}

              {filteredTranscript.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">逐語記録論述（キャリアデザイン出版 模擬問題）</p>
                  <div className="space-y-2">
                    {filteredTranscript.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => { setSelectedId(q.id); resetState() }}
                        className="w-full text-left bg-white rounded-xl border-2 border-teal-200 hover:border-teal-400 p-4 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">逐語論述</span>
                          <span className="text-xs text-gray-400">{q.year}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800">{q.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">問1（20点）＋ 問2（20点）＋ 問3（60点）＝ 合計100点</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredEssay.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">論述練習問題</p>
                  <div className="space-y-2">
                    {filteredEssay.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => { setSelectedId(q.id); resetState() }}
                        className="w-full text-left bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-400 p-4 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{q.type}</span>
                          <span className="text-xs text-gray-400">{q.year}</span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{q.question.slice(0, 80)}...</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          ) : isTranscript && selectedTranscript ? (
            <div className="space-y-4">
              <TranscriptPractice
                question={selectedTranscript}
                subAnswers={subAnswers}
                setSubAnswers={setSubAnswers}
                subScores={subScores}
                scoringStep={scoringStep}
                loading={loading}
                error={error}
                showTranscript={showTranscript}
                setShowTranscript={setShowTranscript}
                showModel={showModel}
                setShowModel={setShowModel}
                allAnswered={allAnswered}
                allScored={allScored}
                hasScoredSome={hasScoredSome}
                totalSubScore={totalSubScore}
                onBack={() => { setSelectedId(null); resetState(currentRecordId !== null) }}
                onScoreOne={handleScoreTranscript}
                onScoreAll={handleScoreAll}
              />

              {/* Share after scoring */}
              {allScored && currentRecordId && (
                <button
                  onClick={shareCurrentSession}
                  className="w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  {copiedId === currentRecordId ? '✅ コピーしました' : '共有する'}
                </button>
              )}

              {/* Follow-up chat */}
              {hasScoredSome && (
                <FollowUpChat
                  messages={followUpMessages}
                  input={followUpInput}
                  setInput={setFollowUpInput}
                  loading={followUpLoading}
                  onSend={handleFollowUp}
                  disabled={!currentRecordId}
                />
              )}
            </div>

          ) : selectedEssay ? (
            <div className="space-y-4">
              <button
                onClick={() => { setSelectedId(null); resetState(currentRecordId !== null) }}
                className="text-sm text-indigo-600 hover:underline"
              >
                ← 問題一覧に戻る
              </button>

              <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
                <div className="flex gap-2 mb-3">
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{selectedEssay.type}</span>
                  <span className="text-xs text-gray-400">{selectedEssay.year}</span>
                </div>
                <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">{selectedEssay.question}</pre>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">あなたの回答</label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="ここに回答を記述してください..."
                  rows={8}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-indigo-400 resize-none"
                />
                <div className="text-right text-xs text-gray-400 mt-1">{answer.length}文字</div>
              </div>

              <button
                onClick={handleScore}
                disabled={loading || !answer.trim()}
                className="w-full py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 font-medium transition-colors"
              >
                {loading ? '採点中...' : 'AIに採点してもらう'}
              </button>

              {error && (
                <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <p className="text-xs text-red-600 flex-1">採点に失敗しました（回答は保持されています）</p>
                  <button
                    onClick={handleScore}
                    disabled={loading || !answer.trim()}
                    className="ml-2 px-3 py-1 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 disabled:opacity-50 flex-shrink-0"
                  >
                    🔄 再採点
                  </button>
                </div>
              )}

              {scoreResult && (
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                    <div className="bg-orange-500 text-white px-4 py-3 flex justify-between items-center">
                      <span className="font-semibold">採点結果</span>
                      <span className="text-2xl font-bold">{scoreResult.total}点</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {scoreResult.scores.map((s, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">{s.label}</span>
                            <span className={`text-sm font-bold ${s.score >= 20 ? 'text-green-600' : s.score >= 15 ? 'text-orange-500' : 'text-red-500'}`}>
                              {s.score}点
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, (s.score / 25) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="font-semibold text-amber-800 mb-2 text-sm">AIフィードバック</p>
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-gray-700">{rawFeedback}</pre>
                  </div>
                </div>
              )}

              {scoringDone && currentRecordId && (
                <button
                  onClick={shareCurrentSession}
                  className="w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  {copiedId === currentRecordId ? '✅ コピーしました' : '共有する'}
                </button>
              )}

              <button
                onClick={() => setShowModel(!showModel)}
                className="w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                {showModel ? '模範解答ポイントを隠す' : '模範解答のポイントを見る'}
              </button>

              {showModel && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="font-semibold text-green-800 mb-2 text-sm">模範解答のポイント</p>
                  <ul className="space-y-1">
                    {selectedEssay.modelAnswerPoints.map((pt, i) => (
                      <li key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-green-400">{pt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up chat for regular essay */}
              {scoringDone && (
                <FollowUpChat
                  messages={followUpMessages}
                  input={followUpInput}
                  setInput={setFollowUpInput}
                  loading={followUpLoading}
                  onSend={handleFollowUp}
                  disabled={!currentRecordId}
                />
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Follow-up chat component
// ────────────────────────────────────────────────────────────
interface FollowUpChatProps {
  messages: EssayFollowUpMessage[]
  input: string
  setInput: (v: string) => void
  loading: boolean
  onSend: () => void
  disabled?: boolean
}

function FollowUpChat({ messages, input, setInput, loading, onSend, disabled }: FollowUpChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="bg-white rounded-xl border-2 border-indigo-200 overflow-hidden">
      <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100">
        <p className="text-sm font-semibold text-indigo-800">フィードバックについて質問する</p>
        <p className="text-xs text-indigo-500 mt-0.5">採点結果への疑問・改善方法などを聞けます</p>
      </div>

      {messages.length > 0 && (
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{m.text}</pre>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-500">
                考え中...
              </div>
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
          disabled={disabled || loading}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none disabled:opacity-50"
        />
        <button
          onClick={onSend}
          disabled={disabled || loading || !input.trim()}
          className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium self-end flex-shrink-0"
        >
          送信
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Transcript practice view
// ────────────────────────────────────────────────────────────
interface TranscriptPracticeProps {
  question: TranscriptQuestion
  subAnswers: string[]
  setSubAnswers: (v: string[]) => void
  subScores: SubScores
  scoringStep: number
  loading: boolean
  error: string | null
  showTranscript: boolean
  setShowTranscript: (v: boolean) => void
  showModel: boolean
  setShowModel: (v: boolean) => void
  allAnswered: boolean
  allScored: boolean
  hasScoredSome: boolean
  totalSubScore: number
  onBack: () => void
  onScoreOne: (idx: number) => void
  onScoreAll: () => void
}

function TranscriptPractice({
  question, subAnswers, setSubAnswers, subScores, scoringStep,
  loading, error, showTranscript, setShowTranscript,
  showModel, setShowModel, allAnswered, allScored, totalSubScore,
  onBack, onScoreOne, onScoreAll,
}: TranscriptPracticeProps) {
  const updateAnswer = (idx: number, val: string) => {
    const next = [...subAnswers]; next[idx] = val; setSubAnswers(next)
  }
  const scoreColor = (score: number, max: number) => {
    const pct = score / max
    return pct >= 0.8 ? 'text-green-600' : pct >= 0.6 ? 'text-orange-500' : 'text-red-500'
  }

  return (
    <>
      <button onClick={onBack} className="text-sm text-indigo-600 hover:underline">
        ← 問題一覧に戻る
      </button>

      <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">逐語論述</span>
          <span className="text-xs text-gray-400">{question.year}</span>
        </div>
        <p className="font-semibold text-gray-800">{question.title}</p>
        <p className="text-xs text-gray-500 mt-1">{question.clientProfile.split('\n')[0]}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">相談者プロフィール</p>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{question.clientProfile}</pre>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
        >
          <span className="font-semibold text-gray-800 text-sm">【逐語記録】</span>
          <span className="text-gray-400 text-sm">{showTranscript ? '▲ 閉じる' : '▼ 開く'}</span>
        </button>
        {showTranscript && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed pt-3">{question.transcript}</pre>
          </div>
        )}
      </div>

      {question.subQuestions.map((sq, idx) => (
        <div key={idx} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800 flex-1">{sq.question}</p>
              {subScores[idx] && (
                <span className={`text-base font-bold flex-shrink-0 ${scoreColor(subScores[idx]!.score, sq.maxScore)}`}>
                  {subScores[idx]!.score}/{sq.maxScore}点
                </span>
              )}
            </div>
          </div>
          <div className="p-4 space-y-3">
            <textarea
              value={subAnswers[idx]}
              onChange={(e) => updateAnswer(idx, e.target.value)}
              placeholder={`問${idx + 1}の回答を記述してください...`}
              rows={idx === 2 ? 10 : 5}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-teal-400 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{subAnswers[idx].length}文字</span>
              {!subScores[idx] && (
                <button
                  onClick={() => onScoreOne(idx)}
                  disabled={loading || !subAnswers[idx].trim()}
                  className="px-4 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50 transition-colors"
                >
                  {loading && scoringStep === idx ? '採点中...' : `問${idx + 1}を採点`}
                </button>
              )}
            </div>
            {subScores[idx] && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-gray-700">{subScores[idx]!.raw}</pre>
              </div>
            )}
          </div>
        </div>
      ))}

      {!allScored && (
        <button
          onClick={onScoreAll}
          disabled={loading || !allAnswered}
          className="w-full py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 disabled:opacity-50 font-medium transition-colors"
        >
          {loading ? '採点中...' : 'まとめてAIに採点してもらう'}
        </button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <p className="text-xs text-red-600">採点に失敗しました。もう一度お試しください。</p>
        </div>
      )}

      {allScored && (
        <div className="bg-teal-500 text-white rounded-xl px-4 py-4 flex justify-between items-center">
          <span className="font-semibold">合計得点</span>
          <span className="text-3xl font-bold">{totalSubScore} / 100点</span>
        </div>
      )}

      <button
        onClick={() => setShowModel(!showModel)}
        className="w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
      >
        {showModel ? '模範解答を隠す' : '模範解答を見る'}
      </button>

      {showModel && (
        <div className="space-y-3">
          {question.subQuestions.map((sq, idx) => (
            <div key={idx} className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-semibold text-green-800 mb-2 text-sm">問{idx + 1} 模範解答（{sq.maxScore}点）</p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{sq.modelAnswer}</pre>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ────────────────────────────────────────────────────────────
// History card
// ────────────────────────────────────────────────────────────
interface HistoryCardProps {
  record: EssayRecord
  copiedId: string | null
  onShare: (r: EssayRecord) => void
  onDelete: (id: string | undefined) => void
  onFollowUpSend: (id: string, msgs: EssayFollowUpMessage[], input: string) => void
  onUpdate: (id: string, followUp: EssayFollowUpMessage[]) => void
  generate: (prompt: string) => Promise<string>
}

function HistoryCard({ record, copiedId, onShare, onDelete, onUpdate, generate }: HistoryCardProps) {
  const [open, setOpen] = useState(false)
  const [followUpInput, setFollowUpInput] = useState('')
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [localFollowUp, setLocalFollowUp] = useState<EssayFollowUpMessage[]>(record.followUp || [])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const q = essayQuestions.find((q) => q.id === record.questionId)
  const tq = transcriptQuestions.find((q) => q.id === record.questionId)
  const scoreColor = record.score >= 70 ? 'text-green-600' : record.score >= 50 ? 'text-orange-500' : 'text-red-500'

  let parsedAnswers: string[] | null = null
  try { if (record.answer.startsWith('[')) parsedAnswers = JSON.parse(record.answer) } catch { /* ignore */ }

  useEffect(() => {
    setLocalFollowUp(record.followUp || [])
  }, [record.followUp])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localFollowUp, open])

  const sendFollowUp = async () => {
    if (!followUpInput.trim() || followUpLoading || !record.id) return
    const userMsg: EssayFollowUpMessage = { role: 'user', text: followUpInput.trim() }
    const newMessages = [...localFollowUp, userMsg]
    setLocalFollowUp(newMessages)
    setFollowUpInput('')
    setFollowUpLoading(true)

    const history = newMessages.slice(0, -1).map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${m.text}`).join('\n')
    const answerBlock = parsedAnswers
      ? parsedAnswers.map((a, i) => `問${i + 1}：${a}`).join('\n')
      : `回答：${record.answer}`

    const prompt = `あなたはキャリアコンサルティング技能検定の専門家です。
受験者が採点結果について質問しています。丁寧に答えてください。

【採点コンテキスト】
問題：${tq?.title || q?.type || record.questionId}
${answerBlock}
AIフィードバック：${record.feedback}
${history ? `\n【これまでのやりとり】\n${history}` : ''}

【受験者の質問】
${userMsg.text}

日本語で分かりやすく答えてください。具体例や根拠も含めてください。`

    try {
      const text = await generate(prompt)
      const aiMsg: EssayFollowUpMessage = { role: 'ai', text }
      const updated = [...newMessages, aiMsg]
      setLocalFollowUp(updated)
      onUpdate(record.id!, updated)
    } catch { /* ignore */ }
    setFollowUpLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${tq ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'}`}>
              {tq ? '逐語論述' : q?.type || record.questionId}
            </span>
            <span className="text-xs text-gray-400">{record.date}</span>
            {localFollowUp.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                Q&A {Math.floor(localFollowUp.length / 2)}件
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {tq ? tq.title : (parsedAnswers ? parsedAnswers[0].slice(0, 60) : record.answer.slice(0, 60))}...
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <span className={`text-lg font-bold ${scoreColor}`}>{record.score}点</span>
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {tq && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs font-semibold text-gray-500 mb-1">問題</p><p className="text-xs text-gray-700">{tq.title}</p></div>}
          {q && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs font-semibold text-gray-500 mb-1">問題</p><pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed line-clamp-6">{q.question}</pre></div>}

          {parsedAnswers ? (
            <div className="space-y-2">
              {parsedAnswers.map((ans, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-gray-500 mb-1">問{i + 1}の回答（{ans.length}文字）</p>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-indigo-50 rounded-lg p-3">{ans}</p>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">あなたの回答（{record.answer.length}文字）</p>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-indigo-50 rounded-lg p-3">{record.answer}</p>
            </div>
          )}

          {record.feedback && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">AIフィードバック</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-amber-50 rounded-lg p-3">{record.feedback}</pre>
            </div>
          )}

          {/* Follow-up Q&A */}
          {localFollowUp.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">フォローアップQ&A</p>
              <div className="space-y-2">
                {localFollowUp.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed">{m.text}</pre>
                    </div>
                  </div>
                ))}
                {followUpLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-gray-500">考え中...</div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>
          )}

          {/* Follow-up input */}
          {record.id && (
            <div className="flex gap-2">
              <textarea
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); sendFollowUp() } }}
                placeholder="採点への質問…（Shift+Enter送信）"
                rows={2}
                disabled={followUpLoading}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 resize-none disabled:opacity-50"
              />
              <button
                onClick={sendFollowUp}
                disabled={followUpLoading || !followUpInput.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-xs font-medium self-end flex-shrink-0"
              >
                送信
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onShare(record)}
              className="flex-1 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              {copiedId === record.id ? '✅ コピー済み' : '共有'}
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex-1 py-2 text-xs border border-red-200 rounded-lg text-red-500 hover:bg-red-50"
              >
                削除
              </button>
            ) : (
              <button
                onClick={() => { onDelete(record.id); setConfirmDelete(false) }}
                className="flex-1 py-2 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                本当に削除
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
