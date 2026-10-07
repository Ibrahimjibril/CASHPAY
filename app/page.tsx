const steps = [
  ["01", "Choose who to pay", "Email, @username or wallet."],
  ["02", "Enter amount", "Pick a quick amount or type your own."],
  ["03", "Send", "Confirm once. Network fee shown upfront."],
  ["04", "They get notified", "An email lands with a claim button."],
  ["05", "They claim", "Google or wallet. Money is theirs."],
];
const uses = ["Creator tips", "Freelancer payments", "Community rewards", "Global payments", "Micro-payments", "Digital gifts", "Remote work", "Online communities", "AI/agent payments"];

export default function Home() {
  return (
    <main>
      <div className="wrap">
        <nav className="nav" aria-label="Main">
          <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
          <div className="nav-links">
            <a href="#pay">Pay anyone</a><a href="#tips">Tips</a><a href="#tempo">Tempo</a><a href="#how">How it works</a>
          </div>
          <a className="btn primary" href="#how">Start Sending</a>
        </nav>

        <div className="hero">
          <div>
            <span className="pill">Money for the social internet</span>
            <h1>Send money. <span>Just like sending a message.</span></h1>
            <p className="lead">Send stablecoin payments to anyone using their email, username, or wallet — powered by Tempo.</p>
            <div className="cta">
              <a className="btn primary" href="#how">Start Sending</a>
              <a className="btn" href="#how">See How It Works</a>
            </div>
          </div>
          <div className="stage" aria-hidden="true">
            <div className="phone">
              <div className="row"><div className="avatar">A</div><div><b>Alice</b><div className="small">to @sarah</div></div></div>
              <div className="amt">$20.00</div>
              <div className="ok">✓ Payment confirmed</div>
              <div className="small">Tempo</div>
            </div>
            <div className="phone b">
              <div className="small">CashPay</div>
              <div className="amt">You received $20</div>
              <div className="small">Alice sent you money.</div>
              <div className="cta"><span className="btn primary">Claim $20</span></div>
            </div>
          </div>
        </div>
      </div>

      <section><div className="wrap">
        <h2>Money should be as easy to send as a message.</h2>
        <p className="lead">No wallet address required. No crypto complexity. Just choose who you want to pay.</p>
      </div></section>

      <section id="pay"><div className="wrap">
        <h2>Pay anyone.</h2>
        <div className="grid c3">
          <div className="card"><h3>Email</h3><p>Send to sarah@gmail.com even if she has never used CashPay.</p></div>
          <div className="card"><h3>Username</h3><p>Search @john and pay in seconds.</p></div>
          <div className="card"><h3>Wallet</h3><p>Paste an address for Web3-native friends. One payment experience.</p></div>
        </div>
      </div></section>

      <section><div className="wrap">
        <h2>Unclaimed money isn’t lost.</h2>
        <p className="lead">Send → email notification → claim link → connect wallet or Google → money received.</p>
      </div></section>

      <section id="tips"><div className="wrap">
        <h2>Tip anyone you appreciate.</h2>
        <p className="lead">Search @username, choose $5, $10, $20 or $50, send, then share on X.</p>
        <div className="chips"><span className="chip">$5</span><span className="chip">$10</span><span className="chip">$20</span><span className="chip">$50</span></div>
      </div></section>

      <section id="tempo"><div className="wrap">
        <h2>Powered by Tempo.</h2>
        <p className="lead">Tempo is a payment-focused, EVM-compatible blockchain built around stablecoins and the TIP-20 token standard, designed for fast settlement and a predictable payment experience.</p>
      </div></section>

      <section><div className="wrap">
        <h2>Made for real life.</h2>
        <div className="chips">{uses.map((u) => <span className="chip" key={u}>{u}</span>)}</div>
      </div></section>

      <section id="how"><div className="wrap">
        <h2>How it works</h2>
        <div className="grid c5">
          {steps.map(([n, t, d]) => (
            <div className="card" key={n}><div className="num">{n}</div><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </div></section>

      <div className="wrap">
        <div className="final">
          <h2>Your money. Your people.<br />One simple payment layer.</h2>
          <a className="btn" href="#how">Start Sending</a>
        </div>
        <footer><span>© CashPay</span><span>Built on Tempo</span></footer>
      </div>
    </main>
  );
}
