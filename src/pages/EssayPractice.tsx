import { useState } from 'react'
import { essayQuestions } from '../data/essayQuestions'
import { useStore } from '../store/useStore'
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
    '問題の把握',
    '目標の明確化',
    '具体的支援計画',
    '倫理',
    '逐語記録',
    '面接技法',
    '適切な応答',
    '問題分析',
    '指導内容',
    '指導関係',
    'アセスメント',
    'セッション計画',
    '具体的手法',
    '全体',
    '論述',
    '表現',
  ]

  let currentScore = 0
  const numMatch = text.match(/合計[：:]?\s*(\d+)/)?.[1]
  if (numMatch) totalMatch = parseInt(numMatch)

  const scorePattern = /(\d+)\s*点/g
  const allScores = [...text.matchAll(scorePattern)].map((m) => parseInt(m[1]))

  criteria.forEach((label, idx) => {
    const regex = new RegExp(`${label}[^\\n]*?(\\d+)\\s*点`, 'i')
    const match = text.match(regex)
    if (match) {
      const score = parseInt(match[1])
      currentScore += score
      const lineIdx = lines.findIndex((l) => l.includes(label))
      const comment = lineIdx >= 0 ? lines.slice(lineIdx, lineIdx + 3).join(' ').replace(/\d+点/, '').trim() : ''
      if (scores.length < 4) {
        scores.push({ label, score, comment })
      }
    }
    idx
  })

  if (scores.length === 0) {
    allScores.slice(0, 4).forEach((s, i) => {
      scores.push({ label: `観点${i + 1}`, score: s, comment: '' })
    })
  }

  const total = totalMatch || currentScore || scores.reduce((a, b) => a + b.score, 0)

  const overallMatch = text.match(/総評[：:]\s*([^\n]+)/)
  overall = overallMatch ? overallMatch[1] : text.split('\n').slice(-3).join(' ')

  return { scores, total, overall }
}

export default function EssayPractice() {
  const { level, addEssayRecord, essayRecords } = useStore()
  const { generate, loading, error } = useGemini()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [rawFeedback, setRawFeedback] = useState('')
  const [showModel, setShowModel] = useState(false)
  const [tab, setTab] = useState<'practice' | 'history'>('practice')

  const filtered = essayQuestions.filter((q) => q.level === level)
  const selected = essayQuestions.find((q) => q.id === selectedId)

  const handleScore = async () => {
    if (!selected || !answer.trim()) return
    const prompt = `
あなたはキャリアコンサルティング技能検定の採点官です。以下の論述問題の回答を100点満点で採点してください。

【問題】
${selected.question}

【採点基準】
${selected.scoringCriteria.join('\n')}

【受験者の回答】
${answer}

以下の形式で評価してください：

## 各観点の評価
${selected.scoringCriteria.map((c, i) => `${i + 1}. ${c.split('（')[0]}：XX点\nコメント：（具体的なフィードバック）`).join('\n\n')}

## 合計：XX点 / 100点

## 総評：
（全体的な評価と改善のポイントを3〜5行で）

## 改善のための具体的アドバイス：
（箇条書きで2〜3点）
`
    try {
      const text = await generate(prompt)
      setRawFeedback(text)
      const result = parseScore(text)
      setScoreResult(result)
      addEssayRecord({
        questionId: selected.id,
        answer,
        score: result.total,
        feedback: text,
        date: new Date().toLocaleDateString('ja-JP'),
      })
    } catch {
      // error shown by hook
    }
  }

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
              <HistoryCard key={i} record={r} />
            ))
          )}
        </div>
      ) : (
        <>
          {!selectedId ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">問題を選んで練習しましょう（{level}対応）</p>
              {filtered.map((q) => (
                <button
                  key={q.id}
                  onClick={() => { setSelectedId(q.id); setAnswer(''); setScoreResult(null); setRawFeedback(''); setShowModel(false) }}
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
          ) : selected ? (
            <div className="space-y-4">
              <button
                onClick={() => { setSelectedId(null); setScoreResult(null) }}
                className="text-sm text-indigo-600 hover:underline"
              >
                ← 問題一覧に戻る
              </button>

              <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
                <div className="flex gap-2 mb-3">
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{selected.type}</span>
                  <span className="text-xs text-gray-400">{selected.year}</span>
                </div>
                <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">{selected.question}</pre>
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
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
                            <div
                              className="h-full bg-orange-400 rounded-full"
                              style={{ width: `${Math.min(100, (s.score / 25) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-gray-700">
                    <p className="font-semibold text-amber-800 mb-2">AIフィードバック</p>
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{rawFeedback}</pre>
                  </div>
                </div>
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
                    {selected.modelAnswerPoints.map((pt, i) => (
                      <li key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-green-400">{pt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

interface EssayRecordItem {
  questionId: string
  answer: string
  score: number
  feedback: string
  date: string
}

function HistoryCard({ record }: { record: EssayRecordItem }) {
  const [open, setOpen] = useState(false)
  const q = essayQuestions.find((q) => q.id === record.questionId)
  const scoreColor = record.score >= 70 ? 'text-green-600' : record.score >= 50 ? 'text-orange-500' : 'text-red-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{q?.type || record.questionId}</span>
            <span className="text-xs text-gray-400">{record.date}</span>
          </div>
          <p className="text-xs text-gray-500 truncate">{record.answer.slice(0, 60)}...</p>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <span className={`text-lg font-bold ${scoreColor}`}>{record.score}点</span>
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {q && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">問題</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed line-clamp-6">{q.question}</pre>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">あなたの回答（{record.answer.length}文字）</p>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-indigo-50 rounded-lg p-3">{record.answer}</p>
          </div>
          {record.feedback && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">AIフィードバック</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-amber-50 rounded-lg p-3">{record.feedback}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
