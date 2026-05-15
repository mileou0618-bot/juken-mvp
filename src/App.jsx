
import React, { useEffect, useState } from "react";
import JukenResultPage from "./JukenResultPage.jsx";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRWAZkYfowt0KgZQgvizc5-ICWqC9ZxMbtfdK__uEQjeNTNp7y3YSS32emGrammMCh/exec";

const worries = [
  "宿題は終わっているのに、テストで点が取れない",
  "復習・直し・暗記の優先順位が分からない",
  "予定を立てても、数日で崩れてしまう",
  "親が毎日声をかけないと、学習が進まない",
  "課題量が多く、親子ともに疲れている",
];

const questions = [
  "塾の宿題は終わっているのに、テストで同じような問題を間違えることが多い。",
  "丸つけや直しが、答えを書き写すだけになっていることがある。",
  "『やった量』は多いが、『何ができるようになったか』が分かりにくい。",
  "授業や解説を聞いた直後は分かったと言うが、翌日には解けないことがある。",
  "基本問題の考え方を説明させると、うまく説明できないことがある。",
  "間違えた問題について、なぜ間違えたのかを自分で整理できていない。",
  "時間をかければ解けるが、テスト時間内に解き切れないことが多い。",
  "計算・漢字・語句・暗記などの基礎処理に時間がかかる。",
  "問題演習の量が不足していて、解くスピードが上がっていないと感じる。",
  "その日に何を優先してやるべきか、親子で迷うことが多い。",
  "塾の宿題、復習、テスト直し、暗記の順番が整理できていない。",
  "学習予定を立てても、数日で崩れてしまう。",
  "塾の課題量が多く、全部を終わらせるだけで精一杯になっている。",
  "睡眠・休憩・食事の時間を削って学習していることがある。",
  "重要な復習や弱点補強が、宿題に追われて後回しになっている。",
  "日によって集中力や学習量の差が大きい。",
  "親が声をかけないと、学習が始まらないことが多い。",
  "テスト前だけ頑張り、普段の学習リズムが安定していない。",
];

const options = [
  { label: "1", text: "まったく当てはまらない", value: 1 },
  { label: "2", text: "あまり当てはまらない", value: 2 },
  { label: "3", text: "どちらともいえない", value: 3 },
  { label: "4", text: "やや当てはまる", value: 4 },
  { label: "5", text: "とても当てはまる", value: 5 },
];

function Landing({ onStart }) {
  const diagnosticItems = [
    ["chart", "現在の状態", "どこで止まっているか"],
    ["target", "ズレの原因", "何がズレているか"],
    ["checklist", "今週やること", "何を直すか"],
  ];

  const statusItems = [
    ["doc", "宿題は終わるが、点が取れない"],
    ["route", "優先順位が決められない"],
    ["calendar", "計画が続かない"],
    ["person", "声かけしないと動かない"],
    ["tired", "親子ともに疲れている"],
  ];

  return (
    <div className="lp-page">
      <header className="lp-header">
        <div className="lp-header-inner">
          <div>
            <div className="lp-brand">
              metech-i <span>/ juken</span>
            </div>
            <div className="lp-header-sub">中学受験の保護者向け 学習管理診断</div>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-inner">
            <div className="lp-hero-copy">
              <p className="lp-pill">中学受験の保護者向け</p>

              <h1>
                塾の宿題を「こなす」だけでなく、
                <br />
                成績につながる家庭学習に変える。
              </h1>

              <p className="lp-lead">
                塾の学習を家庭で無駄なく回すための、
                <br />
                保護者向け学習管理システム。
              </p>

              <button type="button" className="lp-cta" onClick={onStart}>
                無料で診断する（約3分）
              </button>

              <p className="lp-note">※個人情報の入力は最小限です</p>
            </div>

            <div className="lp-hero-visual" aria-hidden="true">
              <div className="visual-blob"></div>
              <div className="clipboard">
                <div className="clip"></div>
                {[0, 1, 2, 3].map((item) => (
                  <div className="check-row" key={item}>
                    <span>✓</span>
                    <i></i>
                  </div>
                ))}
              </div>
              <div className="magnifier"></div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-diagnosis">
          <h2>この診断でわかること</h2>

          <div className="lp-card-grid">
            {diagnosticItems.map(([icon, title, body]) => (
              <div className="lp-card" key={title}>
                <div className={`lp-icon ${icon}`}></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section lp-status">
          <h2>こんな状態を確認します</h2>

          <div className="status-list">
            {statusItems.map(([icon, text]) => (
              <div className="status-item" key={text}>
                <div className={`status-icon ${icon}`}></div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="warning-copy">
            <strong>放置すると、差は広がります。</strong>
            <p>では、今の状態を確認してみてください。</p>
          </div>
        </section>

        <section className="lp-final-cta">
          <div className="lp-final-inner">
            <h2>
              やり方を変えない限り、<br />
              結果は変わりません。
            </h2>
            <button type="button" className="lp-cta lp-cta-light" onClick={onStart}>
              無料で診断する（約3分）
            </button>
            <p>各項目をもとに、結果がメールで届きます。</p>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        運営会社：株式会社metech-i　｜　プライバシーポリシー
      </footer>
    </div>
  );
}

function Basic({ form, setForm, onNext, onBack }) {
  const next = () => {
    if (!form.email.trim()) return alert("メールアドレスを入力してください。");
    if (!form.grade) return alert("お子さまの学年を選択してください。");
    onNext();
  };
  return (
    <div className="form-page">
      <TopBar left="← トップへ戻る" right="" onLeft={onBack} />
      <main className="step-main">
        <p className="blue">無料・18問・約3分</p>
        <h1>基本情報</h1>
        <p className="desc">診断結果をお送りするために、必要な情報を入力してください。</p>
        <div className="info-card">
          <label>保護者のお名前 (任意)<input value={form.parentName} onChange={e=>setForm({...form,parentName:e.target.value})} placeholder="例: 山田 太郎"/></label>
          <label>メールアドレス<input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="example@email.com"/></label>
          <label>お子さまの学年<select value={form.grade} onChange={e=>setForm({...form,grade:e.target.value})}><option value="">選択してください</option><option>小学4年生</option><option>小学5年生</option><option>小学6年生</option><option>その他</option></select></label>
          <label>通っている塾 (任意)<input value={form.school} onChange={e=>setForm({...form,school:e.target.value})} placeholder="例: SAPIX、早稲田アカデミー、日能研など"/></label>
        </div>
      </main>
      <BottomNav left="戻る" right="質問へ進む" onLeft={onBack} onRight={next}/>
    </div>
  );
}

function TopBar({ left, right, onLeft }) {
  return <header className="topbar"><button onClick={onLeft}>{left}</button><b>{right}</b></header>;
}

function BottomNav({ left, right, onLeft, onRight, disabled }) {
  return <div className="bottom-nav"><button className="secondary" onClick={onLeft}>{left}</button><button className="primary" disabled={disabled} onClick={onRight}>{right}</button></div>;
}

function Questions({ form, onBack, onDone }) {
  const [answers, setAnswers] = useState({});
  const [page, setPage] = useState(0);
  const [isSp, setIsSp] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const f = () => setIsSp(window.innerWidth < 768);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  const perPage = isSp ? 1 : 3;
  const start = page * perPage;
  const pageQs = questions.slice(start, start + perPage);
  const end = Math.min(start + pageQs.length, questions.length);
  const last = end >= questions.length;
  const answered = pageQs.every((_, i) => answers[start + i]);

  const submit = async (finalAnswers) => {
    setLoading(true);
    const payload = {
      parentName: form.parentName.trim() || "未入力",
      email: form.email.trim(),
      grade: form.grade,
      school: form.school.trim(),
      answers: questions.map((_, i) => finalAnswers[i]),
    };
    console.log("submit payload", payload);
    try {
      await fetch(APPS_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
      onDone();
    } finally {
      setLoading(false);
    }
  };

  const forward = (nextAnswers = answers) => {
    if (last) return submit(nextAnswers);
    setPage(p => p + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const select = (idx, value) => {
    const nextAnswers = { ...answers, [idx]: value };
    setAnswers(nextAnswers);
  };

  const prev = () => {
    if (page === 0) return onBack();
    setPage(p => p - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const manualNext = () => {
    if (!answered) return alert("このページの質問にすべて回答してください。");
    forward();
  };

  return (
    <div className="form-page">
      <TopBar left="← 戻る" right={isSp ? `質問 ${start + 1} / 18` : `${end} / 18`} onLeft={prev}/>
      <div className="progress"><div style={{width:`${(end/18)*100}%`}}/></div>
      <main className="question-main">
        <p className="blue">{isSp ? `質問 ${start + 1} / 18` : `質問 ${start + 1} - ${end}`}</p>
        <h1>家庭学習の様子について</h1>
        {pageQs.map((q, local) => {
          const idx = start + local;
          return (
            <fieldset className="q-card" key={q}>
              <legend>Q{idx + 1}. {q}</legend>
              <div className="choices">
                {options.map(o => (
                  <label className={answers[idx] === o.value ? "choice selected" : "choice"} key={o.value}>
                    <input type="radio" name={`q${idx}`} checked={answers[idx] === o.value} onChange={() => select(idx, o.value)}/>
                    <b>{o.label}</b><span>{o.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </main>
      <BottomNav left="戻る" right={loading ? "送信中..." : last ? "診断結果を受け取る" : "次へ"} onLeft={prev} onRight={manualNext} disabled={loading}/>
    </div>
  );
}

function Done({ onBack }) {
  return (
    <div className="done-page">
      <div className="done-card">
        <h1>送信しました</h1>
        <p>ご回答ありがとうございます。<br/>診断結果は、数分以内にメールでお送りします。</p>
        <p>メールが届かない場合は、迷惑メールフォルダもご確認ください。</p>
        <button onClick={onBack}>トップへ戻る</button>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [form, setForm] = useState({ parentName:"", email:"", grade:"", school:"" });

  if (screen === "basic") return <Basic form={form} setForm={setForm} onBack={()=>setScreen("landing")} onNext={()=>setScreen("questions")}/>;
  if (screen === "questions") return <Questions form={form} onBack={()=>setScreen("basic")} onDone={()=>setScreen("result")}/>;
  if (screen === "result") return <JukenResultPage onBack={()=>setScreen("landing")} />;
  if (screen === "done") return <Done onBack={()=>setScreen("landing")}/>;
  return <Landing onStart={()=>setScreen("basic")}/>;
}
