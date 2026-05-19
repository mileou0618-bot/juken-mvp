import Link from "next/link";

export default function CnHomePage() {
  return (
    <div className="lp-page cn-page">
      <main>
        <section className="lp-hero">
          <div className="lp-hero-inner">
            <div className="lp-hero-copy">
              <p className="lp-pill">在日华人家庭 · 中学受験</p>

              <h1 className="cn-hero-title">
                塾的作业很多，
                <br className="sp-only" />
                但成绩为什么还是不稳定？
              </h1>

              <p className="lp-lead">
                很多在日华人家庭的问题，
                <br className="sp-only" />
                不是孩子不努力，
                <br className="sp-only" />
                而是家庭学习结构没有稳定下来。
                <br />
                通过18题免费诊断，
                <br className="sp-only" />
                先看清楚现在真正卡在哪里。
              </p>

              <Link href="/cn/diagnosis" className="lp-cta">
                免费开始诊断
              </Link>
            </div>

            <div className="lp-hero-visual" aria-hidden="true">
              <div className="lp-report-card">
                <div className="lp-report-kicker">家庭学习整理</div>
                <div className="lp-report-title">诊断后你会看到</div>
                <ul className="lp-report-list">
                  <li>作业与复习的卡点</li>
                  <li>优先级混乱的位置</li>
                  <li>家长介入的负担</li>
                </ul>
                <div className="lp-report-note">约3分钟 · 18题</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" style={{ textAlign: "left" }}>
          <h2>你家是不是也出现这些情况？</h2>
          <div className="worries" style={{ marginTop: 18 }}>
            <div>每天都在赶作业，但复习总是做不完</div>
            <div>作业完成了，考试还是反复错</div>
            <div>家长不盯，学习就停下来</div>
            <div>一到考试前，家里气氛就紧张</div>
            <div>明明投入很多，却越来越累</div>
          </div>
        </section>

        <section className="bottom-cta">
          <h2>免费查看当前家庭学习结构</h2>
          <p style={{ marginTop: 12 }}>先从 18 题开始，把现状说清楚。</p>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
            <Link href="/cn/diagnosis" className="cta">
              开始18题免费诊断
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
