import { useState } from 'react'
import { useGemini } from '../hooks/useGemini'
import { useStore } from '../store/useStore'

const topics = [
  { id: 'theory', label: 'キャリア理論・理論家', icon: '📚' },
  { id: 'law', label: '関連法律・制度', icon: '⚖️' },
  { id: 'skill', label: 'カウンセリング技法', icon: '🎯' },
  { id: 'exam2', label: '2級 出題傾向', icon: '📋' },
  { id: 'exam1', label: '1級 出題傾向', icon: '📋' },
  { id: 'labor', label: '労働市場・統計', icon: '📊' },
  { id: 'ethics', label: '倫理・綱領', icon: '🤝' },
  { id: 'assessment', label: 'アセスメントツール', icon: '🔍' },
]

const buildPrompt = (topicLabel: string, level: string) => `
あなたはキャリアコンサルティング技能検定の専門家です。
「${topicLabel}」について、キャリアコンサルティング技能検定${level}の試験対策として重要なポイントを整理してください。

以下の形式で日本語でまとめてください：

## 概要
（3〜5行で基本的な説明）

## 試験で問われる重要ポイント
（箇条書きで5〜8個）

## 覚えておくべきキーワード・用語
（箇条書きで5〜8個）

## よく出る問題のパターン
（2〜3個の例）

## 学習のコツ
（2〜3行のアドバイス）

なるべく具体的で試験に役立つ内容にしてください。
`

export default function WebInfo() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [result, setResult] = useState<string>('')
  const [customTopic, setCustomTopic] = useState('')
  const { generate, loading, error } = useGemini()
  const { level, apiKey } = useStore()

  const handleSearch = async (topicLabel: string) => {
    if (!apiKey) {
      alert('APIキーを設定してください（右上のAPI設定ボタン）')
      return
    }
    setResult('')
    setSelectedTopic(topicLabel)
    try {
      const text = await generate(buildPrompt(topicLabel, level))
      setResult(text)
    } catch {
      // error is set by hook
    }
  }

  const handleCustomSearch = () => {
    if (customTopic.trim()) handleSearch(customTopic.trim())
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Web情報収集・まとめ</h1>
        <p className="text-gray-500 text-sm mt-1">トピックを選ぶとAIが試験対策情報をまとめます（{level}対応）</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {topics.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSearch(t.label)}
            disabled={loading}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-sm disabled:opacity-50"
          >
            <span className="text-2xl">{t.icon}</span>
            <span className="text-center text-gray-700 leading-tight">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
          placeholder="その他のトピックを入力（例：スーパーの虹のモデル）"
          className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-400"
        />
        <button
          onClick={handleCustomSearch}
          disabled={loading || !customTopic.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          検索
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3 p-6 bg-white rounded-xl border-2 border-indigo-100">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">AIが情報をまとめています...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          エラー: {error}
        </div>
      )}

      {result && !loading && (
        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="bg-indigo-600 text-white px-4 py-3">
            <h2 className="font-semibold">{selectedTopic}</h2>
            <p className="text-indigo-200 text-xs">Gemini AIによる要約（{level}対応）</p>
          </div>
          <div className="p-5">
            <ResultDisplay text={result} />
          </div>
        </div>
      )}

      {!apiKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <p className="font-semibold mb-1">AIキーが必要です</p>
          <p>
            右上の「APIキー未設定」ボタンからGemini APIキーを設定してください。
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-1"
            >
              Google AI Studioで無料取得できます
            </a>
          </p>
        </div>
      )}
    </div>
  )
}

function ResultDisplay({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1 text-sm text-gray-700 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h3 key={i} className="text-base font-bold text-indigo-700 mt-4 mb-1">{line.replace('## ', '')}</h3>
        }
        if (line.startsWith('# ')) {
          return <h2 key={i} className="text-lg font-bold text-gray-800 mt-4 mb-2">{line.replace('# ', '')}</h2>
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <p key={i} className="pl-4 before:content-['・'] before:-ml-4">{line.replace(/^[-•]\s/, '')}</p>
        }
        if (line.match(/^\d+\./)) {
          return <p key={i} className="pl-2">{line}</p>
        }
        if (line === '') {
          return <div key={i} className="h-1" />
        }
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}
