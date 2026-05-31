import { useState } from 'react'
import { useGemini } from '../hooks/useGemini'
import { useStore, type EmpathyRecord } from '../store/useStore'

interface EmpathyScenario {
  id: string
  level: '初級' | '中級' | '上級'
  situation: string
  statement: string
  emotion: string
  modelExpressions: string[]
}

const scenarios: EmpathyScenario[] = [
  // ── 初級（明確な感情・直接的な表現） ──
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
  {
    id: 'e13',
    level: '初級',
    situation: '28代・女性。広告代理店勤務。残業続きで疲弊している',
    statement: '最近、仕事が終わって家に帰っても、何もしたくなくて。前は趣味もあったのに、今は何も楽しくなくて…。',
    emotion: '燃え尽き・無気力',
    modelExpressions: [
      '以前は楽しめていたことが楽しめなくなってきているんですね。それだけ、ぎりぎりまで頑張ってきたんでしょう。',
      '好きなことも楽しめなくなってしまっている…体と心の両方が疲れているんですね。',
    ],
  },
  {
    id: 'e14',
    level: '初級',
    situation: '60代・男性。来年定年を控えている',
    statement: 'あと1年で定年なんですが…なんか急に、自分って何になるんだろうって。仕事が全部だったから。',
    emotion: '喪失感・アイデンティティの揺らぎ',
    modelExpressions: [
      'ずっと仕事を中心に歩んできて、それがなくなる…。自分が何者なのか、分からなくなるような感覚があるんですね。',
      '「自分って何になるんだろう」という言葉が印象的でした。これまで積み上げてきたものとの向き合い方に、不安を感じているんでしょうか。',
    ],
  },
  {
    id: 'e15',
    level: '初級',
    situation: '24代・男性。新卒入社2年目。希望と異なる部署に配属',
    statement: 'やりたいことがあって入ったんですけど、全然違う部署で。このまま時間が過ぎていくのかと思うと、なんか焦るというか…。',
    emotion: '失望・焦燥感',
    modelExpressions: [
      'やりたいことがあったのに、それとは違う毎日が続いている。そのズレが、焦りになっているんですね。',
      'このままでいいのかという焦り、すごくよくわかります。やりたかったことへの思いが、まだ残っているんでしょうね。',
    ],
  },
  {
    id: 'e16',
    level: '初級',
    situation: '32代・女性。上司からきつい言葉を受け続けている',
    statement: '上司に毎日きついことを言われて…。でも、自分が悪いのかなって。なんか自分がダメな気がしてきて。',
    emotion: '自責・傷つき',
    modelExpressions: [
      '毎日きつい言葉を受けていたら、だんだん自分が悪いのかって思えてきますよね。それだけ傷ついているんだと思います。',
      '「自分がダメ」という気持ち、そこまで追い込まれているんですね。本当につらい毎日だったんでしょう。',
    ],
  },
  {
    id: 'e17',
    level: '初級',
    situation: '35代・男性。家族持ち。収入が上がらず不安がある',
    statement: '給料が全然上がらなくて、子供の教育費とか考えると不安で。でも仕事を変えるのも怖くて。',
    emotion: '経済的不安・板挟み',
    modelExpressions: [
      'このままでは不安、でも変えるのも怖い。どちらに動いても不安がある、その板挟みの感じがつらいですね。',
      '家族のことを考えれば考えるほど、焦りが増してくるんですね。その重さを一人で抱えてきたんでしょう。',
    ],
  },

  // ── 中級（複雑・両価的な感情） ──
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
    id: 'e18',
    level: '中級',
    situation: '45代・女性。親の介護が始まった',
    statement: '仕事も続けたいし、親のことも見たい。でも体が一つしかなくて…どちらかを犠牲にしている感じがして、つらくて。',
    emotion: '葛藤・疲弊・罪悪感',
    modelExpressions: [
      'どちらも大切だから、どちらかを選ぶたびに、もう一方に申し訳なさを感じてしまうんですね。',
      '体は一つなのに、求められることが二方向にある。それだけで、もうすでに限界に近い疲れがあるんじゃないでしょうか。',
    ],
  },
  {
    id: 'e19',
    level: '中級',
    situation: '38代・男性。最近管理職になった',
    statement: '課長になったはいいんですが、正直自信がなくて。部下がいうこと聞いてくれるか不安で、毎回ヒヤヒヤしてます。',
    emotion: '不安・インポスター症候群',
    modelExpressions: [
      '役割は変わったのに、自分がそれにふさわしいかどうか、毎日試されているような感覚があるんでしょうか。',
      '期待に応えられるかという不安、責任の重さを日々感じているんですね。その緊張感が伝わってきます。',
    ],
  },
  {
    id: 'e20',
    level: '中級',
    situation: '33代・女性。異業種への転職を考えている',
    statement: 'やりたい仕事は別にあるんですけど、今の経験が活かせないかもしれないし、一からやり直しになるかと思うと…できるかどうかもわからなくて。',
    emotion: '期待と恐れの混在・自信のなさ',
    modelExpressions: [
      'やりたい気持ちはある、でも怖い。その両方が同時にあって、踏み出せないでいるんですね。',
      '「できるかどうかわからない」という不安と、それでもやりたいという気持ち、両方感じているんですね。',
    ],
  },
  {
    id: 'e21',
    level: '中級',
    situation: '40代・男性。安定した大企業に勤めているが充実感がない',
    statement: '客観的に見れば恵まれた仕事だと思うんですけど、なんか毎日こなすだけで…充実感がないというか。でも贅沢な悩みですよね。',
    emotion: '空虚感・自己批判（悩む権利への疑問）',
    modelExpressions: [
      '「贅沢な悩み」という言葉が気になりました。充実感がないことを、自分で認めてはいけないような気がされているんでしょうか。',
      '恵まれているのはわかっている、でも何か足りない。その気持ちを素直に出しにくいんですね。',
    ],
  },
  {
    id: 'e22',
    level: '中級',
    situation: '21代・女性。就職活動中。親からの強いプレッシャーがある',
    statement: '親が「大企業じゃないとダメ」って言って。私はそこまでこだわりないんですけど、がっかりさせたくないし。なんか自分が何をしたいかもわからなくなってきて。',
    emotion: '他者の期待からのプレッシャー・自己喪失',
    modelExpressions: [
      '親の期待に応えたい気持ちと、自分の気持ちを大事にしたい気持ちが混ざって、自分でも整理がつかなくなってきているんですね。',
      '親を喜ばせたい、でも自分がどうしたいかもわからなくなってきた。そのしんどさ、よくわかります。',
    ],
  },
  {
    id: 'e23',
    level: '中級',
    situation: '48代・男性。業績不振のチームを一人で支えている',
    statement: 'まあ、なんとかなりますよ（笑）。ここで弱音を吐いてもしょうがないし。私が頑張るしかないので。',
    emotion: '強がり・疲弊・孤立感',
    modelExpressions: [
      '「なんとかなる」と言いながらも、一人で抱えてきた重さがある気がしました。弱音を吐いてはいけないと思っているのかもしれないですね。',
      'ここで弱音を、と言いかけたとき、何か感じるものがありましたか？（少し間を置いて）',
    ],
  },
  {
    id: 'e24',
    level: '中級',
    situation: '26代・女性。職場で明らかに孤立しているが否定している',
    statement: '仕事の話は普通にするんですけど、それ以外は完全に無視されていて…。別に仲良くしたいわけじゃないけど、なんかしんどくて。',
    emotion: '孤立・悲しみ・認めたくない感情',
    modelExpressions: [
      '「仲良くしたいわけじゃない」と言いながら、しんどいと感じている。その気持ちはとても自然なことだと思います。',
      '無視されている状況が続いている…それは、仲良くなりたいかどうかに関係なく、つらいことですよね。',
    ],
  },
  {
    id: 'e25',
    level: '中級',
    situation: '42代・女性。外資系管理職。キャリアは順調だが何か物足りない',
    statement: 'キャリアは順調で、収入も上がって。でも…なんでしょう。なんか、ぽっかりしているというか。これのために頑張ってきたのかな、と。',
    emotion: '成功後の空虚感・意味の喪失',
    modelExpressions: [
      '手に入れたはずのものが、思っていたものと違う。その「ぽっかり」した感じ、うまく言葉にできないけれど確かにあるんですね。',
      '「これのために頑張ってきたのかな」という言葉に、何か大切なものを問い直しているような気持ちを感じます。',
    ],
  },

  // ── 上級（非言語・抑圧・複層的な感情） ──
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
    emotion: '怒りと恐れの混在',
    modelExpressions: [
      'すごく追い詰められているんですね。（少し間を置いて）その怒りのすぐそばに、先のことへの不安もあるんでしょうか。',
      'そこまで爆発しそうなくらい、限界なんですね。（静かに）でも…と言いかけたとき、どんな気持ちがよぎったんでしょう。',
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
    id: 'e26',
    level: '上級',
    situation: '29代・女性。話しながら涙をこらえている',
    statement: '（目に涙を浮かべながら）あ、すみません。なんかこうやって話すと…（少し間）大丈夫です。続けます。',
    emotion: '感情の抑圧・助けを求めている',
    modelExpressions: [
      '（静かに）謝らなくて大丈夫ですよ。（少し間を置いて）話しながら何か込み上げてくるものがあったんですね。',
      '急がなくて大丈夫です。（ゆっくり）ここは、そのまま出てくるものを、出してもらえる場所ですから。',
    ],
  },
  {
    id: 'e27',
    level: '上級',
    situation: '55代・男性。長年の仕事を終えて退職した。明るい口調だが目は合わない',
    statement: '（明るい口調で）もう好きなことができると思えば、まあ気楽ですよ。（しかし視線は下を向いている）',
    emotion: '喪失感・空虚感（言葉で覆い隠している）',
    modelExpressions: [
      '（静かに）そうですか…。（少し間を置いて）「気楽」と言いながら、何か言葉にしにくいものもあるかな、と感じたんですが。',
      'ずっと続けてきた仕事が終わって、「気楽」という言葉の裏に、何か別の気持ちもあったりしますか？',
    ],
  },
  {
    id: 'e28',
    level: '上級',
    situation: '36代・男性。長年貢献した会社で不当な扱いを受けた',
    statement: '本当に、あの会社のやり方は最悪です（強い口調で）。何年も貢献してきたのに、こんな扱いをされて。…まあ、いいんですけど。（急に力が抜ける）',
    emotion: '怒りの裏の悲しみ・裏切られた感覚',
    modelExpressions: [
      'すごく怒っていらっしゃる気持ち、当然だと思います。（少し間を置いて）「まあ、いいんですけど」と言ったとき、何か違う気持ちもよぎったんでしょうか。',
      '何年も信じてきた場所で、そういう扱いを受けた…。その怒りのすぐそばに、悲しさのようなものもあるかもしれないですね。',
    ],
  },
  {
    id: 'e29',
    level: '上級',
    situation: '31代・男性。長期休職から復帰を考えているが自己否定が強い',
    statement: 'こんな自分が職場に戻っても、また迷惑かけるだけだと思って。正直、自分なんていない方がいいとも思う時があって…。',
    emotion: '強い自己否定・孤立無援感',
    modelExpressions: [
      '（静かに）そこまで追い詰められているんですね。「いない方がいい」と思うくらい、つらい状況が続いているんですね。（間を置いて）今、自分を傷つけたいとか、消えてしまいたいという気持ちはありますか？',
      'それだけ自分を責め続けてきたんですね。（穏やかに）今、あなたがこうして話してくれていること、私は大切に聞かせてもらいたいと思っています。',
    ],
  },
  {
    id: 'e30',
    level: '上級',
    situation: '25代・男性。進路の選択を迫られ、答えを求めてくる',
    statement: '先生、どうしたらいいと思いますか？本当にわからなくて。もう誰かに決めてほしいくらい。',
    emotion: '決断への恐れ・他者への依存欲求',
    modelExpressions: [
      '「誰かに決めてほしい」という気持ち、それだけ今、決断することが怖くて疲れているんですよね。',
      '答えを出したくても出せない…その「わからない」という気持ちの中に、何か引っかかっているものはありますか？',
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

function extractScore(text: string): number {
  const m = text.match(/合計[：:]\s*(\d+)/)
  return m ? parseInt(m[1]) : 0
}

export default function EmpathyPractice() {
  const { apiKey, empathyRecords, addEmpathyRecord, deleteEmpathyRecord } = useStore()
  const { generate, loading, error } = useGemini()
  const [tab, setTab] = useState<'drill' | 'phrases' | 'history'>('drill')
  const [level, setLevel] = useState<'初級' | '中級' | '上級'>('初級')
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [response, setResponse] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showModel, setShowModel] = useState(false)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const levelScenarios = scenarios.filter((s) => s.level === level)
  const current = levelScenarios[scenarioIndex % levelScenarios.length]

  const handleEvaluate = async () => {
    if (!response.trim() || !current) return
    try {
      const text = await generate(buildEvalPrompt(current, response))
      setFeedback(text)
      const score = extractScore(text)
      setSessionTotal((t) => t + 1)
      if (score >= 60) setSessionCorrect((c) => c + 1)
      addEmpathyRecord({
        id: Date.now().toString(),
        scenarioId: current.id,
        level: current.level,
        situation: current.situation,
        statement: current.statement,
        response,
        feedback: text,
        score,
        date: new Date().toLocaleDateString('ja-JP'),
      })
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

  const shareRecord = async (record: EmpathyRecord) => {
    const text = [
      '【キャリコン学習 共感表現練習記録】',
      `レベル：${record.level}　${record.situation}`,
      `日時：${record.date}`,
      '',
      '--- クライアントの発言 ---',
      `「${record.statement}」`,
      '',
      '--- あなたの共感表現 ---',
      record.response,
      '',
      '--- AIフィードバック ---',
      record.feedback,
    ].join('\n')

    if (navigator.share) {
      await navigator.share({ title: '共感表現練習記録', text })
    } else {
      await navigator.clipboard.writeText(text)
      setCopiedId(record.id)
      setTimeout(() => setCopiedId(null), 2000)
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
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-2 ${tab === 'history' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          履歴 ({empathyRecords.length})
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
                    <div className="bg-teal-600 text-white px-4 py-3 flex justify-between items-center">
                      <h2 className="font-semibold">AIフィードバック</h2>
                      <span className="text-lg font-bold">{extractScore(feedback)}点</span>
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

      {tab === 'history' && (
        <div className="space-y-3">
          {empathyRecords.length === 0 ? (
            <p className="text-center text-gray-400 py-12">まだ練習履歴がありません</p>
          ) : (
            empathyRecords.map((record) => (
              <EmpathyHistoryCard
                key={record.id}
                record={record}
                onDelete={() => deleteEmpathyRecord(record.id)}
                onShare={() => shareRecord(record)}
                copied={copiedId === record.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface EmpathyHistoryCardProps {
  record: EmpathyRecord
  onDelete: () => void
  onShare: () => void
  copied: boolean
}

function EmpathyHistoryCard({ record, onDelete, onShare, copied }: EmpathyHistoryCardProps) {
  const [open, setOpen] = useState(false)
  const scoreColor = record.score >= 80 ? 'text-green-600' : record.score >= 60 ? 'text-orange-500' : 'text-red-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{record.level}</span>
            <span className="text-xs text-gray-400">{record.date}</span>
          </div>
          <p className="text-xs text-gray-500 truncate">{record.situation}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <span className={`text-lg font-bold ${scoreColor}`}>{record.score}点</span>
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">クライアントの発言</p>
            <p className="text-sm text-gray-700 leading-relaxed">「{record.statement}」</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">あなたの共感表現</p>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-teal-50 rounded-lg p-3">{record.response}</p>
          </div>

          {record.feedback && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">AIフィードバック</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-amber-50 rounded-lg p-3">{record.feedback}</pre>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onShare}
              className="flex-1 py-2 text-sm border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50"
            >
              {copied ? '✓ コピーしました' : '共有'}
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-2 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
            >
              削除
            </button>
          </div>
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
