import { useState } from 'react'
import { useGemini } from '../hooks/useGemini'
import { useStore } from '../store/useStore'

interface EmpathyScenario {
  id: string
  level: '初級' | '中級' | '上級'
  situation: string
  statement: string
  emotion: string
  modelExpressions: string[]
}

const scenarios: EmpathyScenario[] = [
  {
    id: 'e01',
    level: '初級',
    situation: '30代・男性。営業職。最近ミスが続いている',
    statement: '仕事でミスが続いていて、もう自分には向いていないんじゃないかと思います。毎日会社に行くのが辛くて…',
    emotion: '落ち込み・自己否定',
    modelExpressions: [
      'ミスが続いて、自分に自信が持てなくなってきているんですね。毎日会社に向かうのが重くなっているんですね。',
      'そんな状況が続いたら、つらいですよね。自分はここにいていいのかって、不安になってしまうんですね。',
    ],
  },
  {
    id: 'e02',
    level: '初級',
    situation: '20代・女性。就職活動中。面接で連続して不合格',
    statement: '10社以上受けたのに、全部落ちて…。もう就活やめたいです。私って何もできないんですかね。',
    emotion: '挫折感・無力感',
    modelExpressions: [
      '10社以上受けて、全部うまくいかなかった…それは本当に消耗しますよね。自分には何もないんじゃないかという気持ちになってしまっているんですね。',
      'そこまで頑張って、結果が出ない。もうやめてしまいたいと思うのは自然なことだと思います。',
    ],
  },
  {
    id: 'e03',
    level: '初級',
    situation: '40代・男性。リストラ通告を受けて2週間後に来談',
    statement: 'まさか自分が対象になるとは…まだ現実感がないというか、なんかぼーっとしてしまって。',
    emotion: '困惑・茫然自失',
    modelExpressions: [
      'まさか自分が、と思うと、頭の中が整理できないですよね。まだ信じられない気持ちもあるかもしれません。',
      'そうですよね。突然のことで、まだ気持ちがついていかない感じがされているんですね。',
    ],
  },
  {
    id: 'e04',
    level: '中級',
    situation: '30代・女性。育休復帰後1ヶ月。時短勤務中',
    statement: '子供のことも気になるし、仕事も以前みたいにできなくて…チームに申し訳なくて。でも子供には申し訳ないことはしたくないし。どうすれば…',
    emotion: '葛藤・罪悪感',
    modelExpressions: [
      '仕事への責任感と、お子さんへの思い、両方大切にしたいからこそ、板挟みになってしまっているんですね。どちらも手放したくない…そのもどかしさが伝わってきます。',
      'チームへの申し訳なさと、お子さんへの気持ち。どちらの方向にも、真剣に向き合っているんですね。',
    ],
  },
  {
    id: 'e05',
    level: '中級',
    situation: '50代・男性。管理職。部下との関係に悩む',
    statement: 'なんか最近、部下が何を考えているのか全然わからなくて。昔はもっとわかったんですけどね。自分が古くなったのかな、と。',
    emotion: '孤立感・自信喪失',
    modelExpressions: [
      'かつては手応えがあったのに、今はそれが感じられなくて、自分がずれてしまったのかもしれないと感じているんですね。',
      '部下と距離ができたような感覚、それは寂しくも、不安でもある感じでしょうか。',
    ],
  },
  {
    id: 'e06',
    level: '中級',
    situation: '20代・男性。転職を繰り返している',
    statement: '転職して3社目なんですけど、また合わなくて。なんか、自分が悪いのかなって。でも、今の職場がおかしいとも思うんですよね。',
    emotion: '混乱・自責と他責の揺れ',
    modelExpressions: [
      '自分に問題があるのか、環境に問題があるのか、どちらとも言い切れなくて、ぐるぐると考えてしまっているんですね。',
      '自分を責めたいわけじゃないけれど、でも誰かのせいにするのも違う、というもやもやがあるんでしょうか。',
    ],
  },
  {
    id: 'e07',
    level: '上級',
    situation: '35代・女性。キャリアを考えたいが、うまく言葉にできない',
    statement: '（少し間があって）…まあ、なんとかなると思うんですけどね。うん、大丈夫です。',
    emotion: '隠れた不安・見せにくい感情',
    modelExpressions: [
      '（静かに）…そうですか。（少し待ってから）「なんとかなる」と思いながらも、ここに来ていただいたんですよね。何か、気になっていることがあるんでしょうか。',
      '「大丈夫」と言いながら、少し間があったような気がしました。何か、ひっかかっているものがあるのでしょうか。',
    ],
  },
  {
    id: 'e08',
    level: '上級',
    situation: '45代・男性。会社への怒りと転職への不安が混在',
    statement: 'あの上司のせいで、もう限界なんです！（声を荒げて）…でも、今さら転職って言われても…（急に静かになる）',
    emotion: '怒り・恐れの混在',
    modelExpressions: [
      'すごく追い詰められているんですね。（少し間を置いて）その怒りのすぐそばに、先のことへの不安もあるんでしょうか。',
      'そこまで爆発しそうなくらい、限界なんですね。（静かに）でも…と言いかけたとき、どんな気持ちがよぎったんでしょう。',
    ],
  },
  {
    id: 'e09',
    level: '初級',
    situation: '28代・女性。職場の人間関係で悩んでいる',
    statement: 'ランチも一人で食べていて、なんか職場に居場所がないみたいで。別に友達が欲しいわけじゃないんですけど…',
    emotion: '孤独感・自分の気持ちへの戸惑い',
    modelExpressions: [
      '「友達が欲しいわけじゃない」と言いながら、でも居場所がないような感覚は寂しいですよね。',
      'なんとなく馴染めていない感じ、それが続いているんですね。自分でもどう言えばいいか、わかりにくいような気持ちでしょうか。',
    ],
  },
  {
    id: 'e10',
    level: '中級',
    situation: '52代・女性。子育てが落ち着き、自分のキャリアを考え始めた',
    statement: '子供が大きくなって、ふと気づいたら「私って何がしたかったんだろう」って。なんか、虚しい感じもするし、でも今更って気もして。',
    emotion: '空虚感・後悔・新たな可能性への不安',
    modelExpressions: [
      '一生懸命やってきた子育てが一段落したとき、自分のことを振り返って、ぽっかりした感じがするんですね。',
      '「今更」という気持ちと、でも何かしたいという気持ちが、両方あるんですね。その揺れを感じていらっしゃるんでしょうか。',
    ],
  },
  {
    id: 'e11',
    level: '上級',
    situation: '38代・男性。自分から語ることが少ない、寡黙なクライアント',
    statement: 'まあ…特に困っているというわけでも。ちょっと、整理したいと思って。',
    emotion: '感情を語ることへの抵抗・内省欲求',
    modelExpressions: [
      'そうですか。何か、ご自身の中で引っかかっているものがあって、それを整理したいという感じでしょうか。',
      '（静かに受け止めて）整理したい、というのは、どんなことについてでしょうか。急がなくていいので、思うままに。',
    ],
  },
  {
    id: 'e12',
    level: '初級',
    situation: '22代・男性。内定を得たが不安を感じている',
    statement: '内定もらえたんですけど…嬉しいはずなのに、なんか不安で。本当にこれでよかったのかって。',
    emotion: '喜びと不安の共存',
    modelExpressions: [
      '念願の内定なのに、すっきり喜べない。その複雑な気持ち、自然なことだと思います。',
      '嬉しいはずなのに、という言葉が印象的でした。その「はず」の部分に、何か引っかかるものがあるんでしょうか。',
    ],
  },
]

const phraseCategories = [
  {
    label: '感情の反映（基本）',
    phrases: [
      '〜で、辛い思いをされているんですね。',
      '〜という気持ちがあるんですね。',
      'それは〜ですよね（感情の言葉）。',
      '〜と感じていらっしゃるんですね。',
      'そういう状況では、〜な気持ちになりますよね。',
    ],
  },
  {
    label: '感情の反映（深い）',
    phrases: [
      '〜（表面の感情）の一方で、〜（深い感情）もあるんでしょうか。',
      '「〜」という言葉が気になりました。そこには何か…？',
      '言葉にしにくいような、もやもやした感じがあるんでしょうか。',
      '〜という気持ちと、〜という気持ちが、両方あるんですね。',
    ],
  },
  {
    label: '受容・ノーマライゼーション',
    phrases: [
      'そういう気持ちになるのは、当然のことだと思います。',
      'そんな状況では、〜と感じても不思議ではありません。',
      'それだけ真剣に向き合ってきたんですね。',
      'ここまで話してくださって、ありがとうございます。',
    ],
  },
  {
    label: '共感的な問い返し',
    phrases: [
      'その〜という気持ち、もう少し聞かせていただけますか？',
      'どんなときに特にそう感じますか？',
      'そのとき、どんな気持ちがよぎったんでしょう？',
      '「〜」と言いかけたとき、何を感じていましたか？',
    ],
  },
  {
    label: '沈黙・間の活用',
    phrases: [
      '（うなずきながら、少し待つ）',
      '（ゆっくりと）そうですか…（間を置く）',
      '急がなくていいので、思うままに話してください。',
      '（相手が話し終わった後）…（数秒待ってから応答する）',
    ],
  },
  {
    label: 'NGフレーズ（使わない表現）',
    phrases: [
      '❌「大丈夫ですよ！」→ 感情を否定・安易な励まし',
      '❌「でも、良い面もありますよね」→ 気持ちを反らす',
      '❌「私も同じ経験がありますよ」→ 焦点が自分に移る',
      '❌「それはあなたのせいじゃないですよ」→ 評価・判断',
      '❌「○○した方がいいですよ」→ 傾聴前のアドバイス',
    ],
  },
]

function buildEvalPrompt(scenario: EmpathyScenario, response: string) {
  return `あなたはキャリアコンサルティング技能検定の指導者です。
以下のクライアント発言に対するカウンセラーの共感表現を評価してください。

【状況】${scenario.situation}
【クライアントの発言】${scenario.statement}
【主な感情】${scenario.emotion}

【カウンセラーの共感表現（評価対象）】
${response}

以下の5観点で評価してください（各20点、合計100点）：

1. 感情への着目：クライアントの感情を正確に捉えているか
2. 受容的態度：批判せず、ありのままを受け入れているか
3. 言語化の適切さ：気持ちを自然な言葉で表現しているか
4. 自然さ・実用性：実際の面談で使えるか（説明的すぎないか）
5. 深さ：表面的でなく、深い理解や余韻があるか

【出力形式】
## 各観点の評価
1. 感情への着目：XX点 / コメント
2. 受容的態度：XX点 / コメント
3. 言語化の適切さ：XX点 / コメント
4. 自然さ・実用性：XX点 / コメント
5. 深さ：XX点 / コメント

## 合計：XX点

## 総評
（全体的な評価を2〜3行で）

## 改善のヒント
（より良くするための具体的なアドバイスを2点）`
}

export default function EmpathyPractice() {
  const { apiKey } = useStore()
  const { generate, loading, error } = useGemini()
  const [tab, setTab] = useState<'drill' | 'phrases'>('drill')
  const [level, setLevel] = useState<'初級' | '中級' | '上級'>('初級')
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [response, setResponse] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showModel, setShowModel] = useState(false)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null)

  const levelScenarios = scenarios.filter((s) => s.level === level)
  const current = levelScenarios[scenarioIndex % levelScenarios.length]

  const handleEvaluate = async () => {
    if (!response.trim() || !current) return
    try {
      const text = await generate(buildEvalPrompt(current, response))
      setFeedback(text)
      setSessionTotal((t) => t + 1)
      const scoreMatch = text.match(/合計[：:]\s*(\d+)/)
      if (scoreMatch && parseInt(scoreMatch[1]) >= 60) {
        setSessionCorrect((c) => c + 1)
      }
    } catch {
      // error shown by hook
    }
  }

  const handleNext = () => {
    setScenarioIndex((i) => i + 1)
    setResponse('')
    setFeedback('')
    setShowModel(false)
  }

  const handleLevelChange = (l: '初級' | '中級' | '上級') => {
    setLevel(l)
    setScenarioIndex(0)
    setResponse('')
    setFeedback('')
    setShowModel(false)
  }

  const copyPhrase = async (phrase: string) => {
    try {
      await navigator.clipboard.writeText(phrase)
      setCopiedPhrase(phrase)
      setTimeout(() => setCopiedPhrase(null), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">共感表現練習</h1>
        {sessionTotal > 0 && (
          <div className="text-sm text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
            {sessionTotal}問中 {sessionCorrect}問 合格（60点以上）
          </div>
        )}
      </div>

      <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
        <button
          onClick={() => setTab('drill')}
          className={`flex-1 py-2 ${tab === 'drill' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          ドリル練習
        </button>
        <button
          onClick={() => setTab('phrases')}
          className={`flex-1 py-2 ${tab === 'phrases' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          フレーズ集
        </button>
      </div>

      {tab === 'drill' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['初級', '中級', '上級'] as const).map((l) => (
              <button
                key={l}
                onClick={() => handleLevelChange(l)}
                className={`px-4 py-1.5 rounded-full text-sm border-2 transition-colors ${level === l ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-300 text-gray-600 hover:border-teal-400'}`}
              >
                {l}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400 self-center">
              {(scenarioIndex % levelScenarios.length) + 1} / {levelScenarios.length}問
            </span>
          </div>

          {current && (
            <>
              <div className="bg-white rounded-xl border-2 border-gray-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{current.level}</span>
                  <span className="text-xs text-gray-400">{current.situation}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-semibold mb-1">クライアントの発言</p>
                  <p className="text-gray-800 leading-relaxed">「{current.statement}」</p>
                </div>
                <p className="text-xs text-gray-400">ヒント：<span className="text-teal-600">{current.emotion}</span></p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  あなたの共感表現
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="クライアントの感情に寄り添った言葉を書いてください..."
                  rows={4}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-teal-400 resize-none"
                />
              </div>

              <button
                onClick={handleEvaluate}
                disabled={loading || !response.trim()}
                className="w-full py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'AIが評価中...' : 'AIに評価してもらう'}
              </button>

              {error && (
                <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <p className="text-xs text-red-600 flex-1">評価に失敗しました（回答は保持されています）</p>
                  <button
                    onClick={handleEvaluate}
                    disabled={loading}
                    className="ml-2 px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    🔄 再試行
                  </button>
                </div>
              )}

              {feedback && (
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border-2 border-teal-200 overflow-hidden">
                    <div className="bg-teal-600 text-white px-4 py-3">
                      <h2 className="font-semibold">AIフィードバック</h2>
                    </div>
                    <div className="p-4">
                      <FeedbackDisplay text={feedback} />
                    </div>
                  </div>

                  <button
                    onClick={() => setShowModel(!showModel)}
                    className="w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {showModel ? '模範表現を隠す' : '模範表現を見る'}
                  </button>

                  {showModel && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-green-800">模範共感表現の例</p>
                      {current.modelExpressions.map((expr, i) => (
                        <p key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-green-400 leading-relaxed">
                          「{expr}」
                        </p>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"
                  >
                    次の場面へ →
                  </button>
                </div>
              )}

              {!apiKey && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  AI評価機能にはGemini APIキーが必要です（右上のAPI設定ボタン）
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'phrases' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">タップしてコピーできます</p>
          {phraseCategories.map((cat) => (
            <div key={cat.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className={`px-4 py-2 text-sm font-semibold ${cat.label.includes('NG') ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>
                {cat.label}
              </div>
              <div className="divide-y divide-gray-100">
                {cat.phrases.map((phrase) => (
                  <button
                    key={phrase}
                    onClick={() => copyPhrase(phrase)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between gap-2"
                  >
                    <span className="leading-relaxed">{phrase}</span>
                    <span className="text-xs text-gray-300 flex-shrink-0">
                      {copiedPhrase === phrase ? '✓' : 'コピー'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
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
          return <h3 key={i} className="text-base font-bold text-teal-700 mt-3 mb-1">{line.replace('## ', '')}</h3>
        }
        if (line.match(/^\d+\./)) {
          return <p key={i} className="pl-2">{line}</p>
        }
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}
