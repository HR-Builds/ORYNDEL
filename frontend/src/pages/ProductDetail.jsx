import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import Reveal from "../components/Reveal";

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    setProduct(null);
    setQty(1);
    setRelated([]);
    api
      .get(`/products/${slug}`)
      .then((res) => {
        setProduct(res.data);
        return api.get("/products", { params: { category: res.data.category, limit: 5 } });
      })
      .then((res) => setRelated(res.data.items.filter((i) => i.slug !== slug)))
      .catch(() => setNotFound(true));
  }, [slug]);

  const addToCart = async () => {
    if (!localStorage.getItem("oryndel_token")) {
      navigate("/login");
      return;
    }
    try {
      await api.post("/cart", { product_id: product.id, quantity: qty });
      setMessage("Added to cart.");
    } catch (e) {
      setMessage(e.response?.data?.detail || "Could not add to cart.");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  if (notFound) {
    return (
      <section className="page-head" style={{ minHeight: "70vh" }}>
        <p className="eyebrow">404</p>
        <h1>Product not found.</h1>
        <div style={{ marginTop: "2rem" }}>
          <Link to="/shop" className="btn">Back to Shop</Link>
        </div>
      </section>
    );
  }

  if (!product) {
    return <p className="loading-state" style={{ paddingTop: "14rem" }}>Loading</p>;
  }

  return (
    <>
      <section className="detail">
        <Reveal>
          <div className="detail-media">
            {product.image && <img src={product.image} alt={product.name} />}
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">PKR {Number(product.price).toLocaleString()}</p>
          <p className="detail-desc">{product.description || "No description available for this piece."}</p>
          {product.stock === 0 && <p className="stock-note">Out of stock</p>}
          <div className="qty-row">
            <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span className="qty-val">{qty}</span>
            <button className="qty-btn" onClick={() => setQty(Math.min(product.stock, qty + 1))}>+</button>
          </div>
          <button className="btn btn-solid" disabled={product.stock === 0} onClick={addToCart}>
            {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
          </button>
          {message && <p className="inline-msg">{message}</p>}
        </Reveal>
      </section>

      {related.length > 0 && (
        <section className="section-tight">
          <Reveal>
            <p className="eyebrow" style={{ marginBottom: "2rem" }}>More in {product.category}</p>
          </Reveal>
          <div className="grid">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}>
                <Link to={`/product/${p.slug}`} className="card">
                  <div className="card-media">
                    {p.image && <img src={p.image} alt={p.name} loading="lazy" />}
                  </div>
                  <div className="card-body">
                    <p className="card-cat">{p.category}</p>
                    <h3 className="card-name">{p.name}</h3>
                    <p className="card-price">PKR {Number(p.price).toLocaleString()}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  );
}