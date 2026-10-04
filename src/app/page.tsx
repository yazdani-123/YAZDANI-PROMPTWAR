import ReflectionWorkspace from "./reflection-workspace";

export default function Home() {
  return (
    <main className="workspace">
      <header className="brand-row">
        <a className="brand" href="#top" aria-label="The Blind Spot home">
          <span className="brand-mark" aria-hidden="true">
            B
          </span>
          <span>The Blind Spot</span>
        </a>
        <span className="privacy-label">
          <span className="privacy-dot" aria-hidden="true" />
          Your workspace
        </span>
      </header>
      <section id="top" className="intro">
        <p className="eyebrow">A thinking partner for decisions</p>
        <h1>What might be worth a second look?</h1>
        <p className="intro-copy">
          Lay out the decision and your reasoning. We’ll help you explore
          questions and tensions in what you share. The decision stays yours.
        </p>
      </section>

      <ReflectionWorkspace />
      <footer className="site-footer">
        <span>The Blind Spot</span>
        <span>Take what’s useful. Leave what isn’t.</span>
      </footer>
    </main>
  );
}
