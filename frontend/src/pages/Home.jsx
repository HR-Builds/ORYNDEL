import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import api from "../api/client";
import Reveal from "../components/Reveal";
import MeetDeveloper from "../components/MeetDeveloper";
import Recommendations from "../components/Recommendations";

gsap.registerPlugin(ScrollTrigger);

const CATEGORIES = [
  {
    key: "clothing",
    letter: "C",
    name: "Clothing",
    blurb: "Structured silhouettes, heavyweight fabrics.",
  },
  {
    key: "footwear",
    letter: "F",
    name: "Footwear",
    blurb: "Hand-finished leather, considered soles.",
  },
  {
    key: "fragrance",
    letter: "R",
    name: "Fragrance",
    blurb: "Oud, amber and smoked woods.",
  },
  {
    key: "accessories",
    letter: "A",
    name: "Accessories",
    blurb: "Small objects, lasting weight.",
  },
];

function TiltTile({ cat }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.02)`;
  };
  const onLeave = () => {
    ref.current.style.transform = "rotateY(0deg) rotateX(0deg) scale(1)";
  };

  return (
    <Link
      to={`/shop?category=${cat.key}`}
      className="tile"
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transition:
          "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.4s",
      }}
    >
      <span className="tile-letter">{cat.letter}</span>
      <h3>{cat.name}</h3>
      <p>{cat.blurb}</p>
    </Link>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const heroRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(
      ".hero-line",
      { yPercent: 115 },
      {
        yPercent: 0,
        duration: 1.3,
        stagger: 0.12,
        ease: "power4.out",
        delay: 0.25,
      },
    );
    gsap.fromTo(
      ".hero-sub, .hero-cta, .scroll-hint",
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.15,
        delay: 0.9,
        ease: "power3.out",
      },
    );
    gsap.to(".hero-inner", {
      opacity: 0.15,
      y: -90,
      ease: "none",
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
    api
      .get("/products", { params: { limit: 4 } })
      .then((r) => setProducts(r.data.items));
  }, []);

  return (
    <>
      <section className="hero" ref={heroRef}>
        <div className="hero-inner">
          <p className="eyebrow hero-sub" style={{ marginBottom: "1.6rem" }}>
            New Season · 2026
          </p>
          <h1 className="hero-title">
            <span className="hero-line-mask">
              <span className="hero-line">Objects of</span>
            </span>
            <span className="hero-line-mask">
              <span className="hero-line">
                <em>quiet luxury,</em>
              </span>
            </span>
            <span className="hero-line-mask">
              <span className="hero-line">made to last.</span>
            </span>
          </h1>
          <p className="hero-sub">
            ORYNDEL curates clothing, footwear and fragrance in limited
            quantities. No noise, no excess. Only material, weight and craft.
          </p>
          <div className="hero-cta">
            <Link to="/shop" className="btn btn-solid">
              Shop the Collection
            </Link>
            <Link to="/contact" className="btn btn-ghost">
              Get in Touch
            </Link>
          </div>
        </div>
        <div className="scroll-hint">Scroll</div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((n) => (
            <span key={n}>
              Clothing <b>·</b> Footwear <b>·</b> Fragrance <b>·</b> Accessories{" "}
              <b>·</b> Cosmetics <b>·</b>&nbsp;
            </span>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <Reveal>
            <p className="eyebrow" style={{ marginBottom: "0.8rem" }}>
              Latest Arrivals
            </p>
            <h2>New this week</h2>
          </Reveal>
          <Reveal delay={0.15}>
            <Link to="/shop" className="btn">
              View All
            </Link>
          </Reveal>
        </div>
        <div className="grid">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <Link to={`/product/${p.slug}`} className="card">
                <div className="card-media">
                  {p.image && <img src={p.image} alt={p.name} loading="lazy" />}
                </div>
                <div className="card-body">
                  <p className="card-cat">{p.category}</p>
                  <h3 className="card-name">{p.name}</h3>
                  <p className="card-price">
                    PKR {Number(p.price).toLocaleString()}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section-tight">
        <Reveal>
          <p className="eyebrow" style={{ marginBottom: "2.5rem" }}>
            Departments
          </p>
        </Reveal>
        <div className="tiles">
          {CATEGORIES.map((c, i) => (
            <Reveal key={c.key} delay={i * 0.08}>
              <TiltTile cat={c} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <Reveal>
          <p className="manifesto">
            We do not chase seasons. Every piece is selected for its
            <em> material honesty</em>, cut with intent, and priced without
            theatre. When it sells out, it is gone.
          </p>
        </Reveal>
      </section>

      <section className="section-tight" style={{ textAlign: "center" }}>
        <Reveal>
          <p className="eyebrow" style={{ marginBottom: "1.4rem" }}>
            Cash on Delivery · Bank Transfer
          </p>
          <h2
            className="display"
            style={{ fontSize: "clamp(2rem, 5vw, 3.6rem)" }}
          >
            Ready when you are.
          </h2>
          <div style={{ marginTop: "2.4rem" }}>
            <Link to="/shop" className="btn btn-solid">
              Begin Browsing
            </Link>
          </div>
        </Reveal>
        <MeetDeveloper />
        <Recommendations />
      </section>
    </>
  );
}
