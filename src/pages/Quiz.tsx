import { useState, useMemo } from 'react'
import { quizData } from '../data/quizData'
import { useStore } from '../store/useStore'

const categories = ['すべて', 'キャリア理論', 'カウンセリング技法', '労働法・関連法規', '職業・労働市場', '倫理・綱領', 'アセスメント', '企業内キャリア開発']

export default function Quiz() {
  const { level, quizProgress, recordQuizAnswer } = useStore()
  const [selectedCategory, setSelectedCategory] = useState('すべて')
  const [onlyWrong, setOnlyWrong] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 })

  const filteredQuiz = useMemo(() => {
    let items = quizData.filter(
      (q) => q.level === level || q.level === '共通'
    )
    if (selectedCategory !== 'すべて') {
      items = items.filter((q) => q.category === selectedCategory)
    }
    if (onlyWrong) {
      items = items.filter((q) => quizProgress.wrongIds.includes(q.id))
    }
    return items
  }, [level, selectedCategory, onlyWrong, quizProgress.wrongIds])

  const current = filteredQuiz[currentIndex]

  const handleAnswer = (correct: boolean) => {
    if (!current) return
    recordQuizAnswer(current.id, correct)
    setSessionStats((s) => ({
      correct: correct ? s.correct + 1 : s.correct,
      total: s.total + 1,
    }))
    setShowAnswer(false)
    if (currentIndex < filteredQuiz.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setCurrentIndex(0)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">知識確認</h1>
        <div className="text-sm text-gray-500">
          累計: {quizProgress.correct}/{quizProgress.total}問正解
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setCurrentIndex(0); setShowAnswer(false) }}
              className={`px-2 py-1 rounded-full text-xs border ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs text-gray-600 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWrong}
            onChange={(e) => { setOnlyWrong(e.target.checked); setCurrentIndex(0); setShowAnswer(false) }}
            className="accent-indigo-600"
          />
          苦手問題のみ（{quizProgress.wrongIds.length}問）
        </label>
      </div>

      {filteredQuiz.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🎉</div>
          <p>該当する問題がありません</p>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-400 text-right">
            {currentIndex + 1} / {filteredQuiz.length}問
            {sessionStats.total > 0 && (
              <span className="ml-2">（今回: {sessionStats.correct}/{sessionStats.total}）</span>
            )}
          </div>

          <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{current.category}</span>
              <span className="text-xs text-gray-400">{current.level}</span>
            </div>

            <div className="p-6">
              <p className="text-gray-800 font-medium leading-relaxed text-base">{current.question}</p>

              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  答えを見る
                </button>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <p className="text-xs text-indigo-500 font-semibold mb-1">【答え】</p>
                    <p className="text-gray-800 leading-relaxed text-sm">{current.answer}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-600 font-semibold mb-1">解説</p>
                    <p className="text-gray-700 text-sm leading-relaxed">{current.explanation}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAnswer(false)}
                      className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 font-medium text-sm"
                    >
                      ✗ 間違えた
                    </button>
                    <button
                      onClick={() => handleAnswer(true)}
                      className="flex-1 py-2.5 bg-green-50 text-green-600 border border-green-200 rounded-xl hover:bg-green-100 font-medium text-sm"
                    >
                      ○ 正解した
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setShowAnswer(false) }}
              disabled={currentIndex === 0}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              ← 前
            </button>
            <button
              onClick={() => { setCurrentIndex(0); setShowAnswer(false); setSessionStats({ correct: 0, total: 0 }) }}
              className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              最初から
            </button>
            <button
              onClick={() => {
                const next = Math.floor(Math.random() * filteredQuiz.length)
                setCurrentIndex(next)
                setShowAnswer(false)
              }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              ランダム
            </button>
          </div>
        </>
      )}
    </div>
  )
}
