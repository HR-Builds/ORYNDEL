import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="footer-brand">ORYNDEL</div>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: "1rem", maxWidth: "280px", lineHeight: 1.8 }}>
            Curated clothing, footwear, fragrance and accessories. Delivered across Pakistan.
          </p>
        </div>
        <div>
          <p className="eyebrow" style={{ marginBottom: "1.2rem" }}>Shop</p>
          <Link to="/shop">All Products</Link>
          <Link to="/shop?category=clothing">Clothing</Link>
          <Link to="/shop?category=footwear">Footwear</Link>
          <Link to="/shop?category=fragrance">Fragrance</Link>
        </div>
        <div>
          <p className="eyebrow" style={{ marginBottom: "1.2rem" }}>Company</p>
          <Link to="/contact">Contact</Link>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <a href="https://github.com/HR-Builds" target="_blank" rel="noreferrer">Developer — HR-Builds</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} ORYNDEL. All rights reserved.</span>
        <span>Developed by Hassan Rashid · Cash on Delivery · Bank Transfer</span>
      </div>
    </footer>
  );
}