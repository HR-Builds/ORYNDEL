import Reveal from "./Reveal";

export default function MeetDeveloper() {
  return (
    <section className="dev-section" id="developer">
      <Reveal>
        <p className="eyebrow">Behind the Build</p>
        <h2 className="display" style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", marginTop: "0.8rem" }}>Meet the Developer</h2>
      </Reveal>
      <Reveal delay={0.15}>
        <div className="dev-card">
          <div className="dev-avatar">HR</div>
          <h3>Hassan Rashid</h3>
          <p className="dev-role">Full-Stack Developer · HR-Builds</p>
          <p>
            Designed and engineered the ORYNDEL platform end to end — from the
            FastAPI backend and AI agent pipelines to this WebGL storefront.
          </p>
          <div className="dev-links">
            <a className="dev-link solid" href="https://github.com/HR-Builds" target="_blank" rel="noreferrer">GitHub</a>
            <a className="dev-link" href="mailto:dev.hassanrashid@gmail.com">Email</a>
            <a className="dev-link" href="https://wa.me/923242693485" target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}