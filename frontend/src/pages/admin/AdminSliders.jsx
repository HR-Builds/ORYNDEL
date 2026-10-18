import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AdminSliders() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", button_text: "SHOP NOW", button_link: "/shop" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/admin/sliders").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const pickFile = (e) => {
    const f = e.target.files[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Choose a slide image first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("button_text", form.button_text || "SHOP NOW");
      fd.append("button_link", form.button_link || "/shop");
      fd.append("file", file);
      await api.post("/admin/sliders", fd);
      setForm({ title: "", button_text: "SHOP NOW", button_link: "/shop" });
      setFile(null);
      setPreview("");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create slide.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete slide "${s.title}"?`)) return;
    await api.delete(`/admin/sliders/${s.id}`);
    load();
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Homepage</p>
          <h2>Sliders</h2>
        </div>
      </div>

      <div className="panel">
        <h3>Add Slide</h3>
        <form className="admin-form" onSubmit={submit}>
          <div className="field full">
            <label className="label">Slide Title *</label>
            <input
              className="input"
              required
              placeholder="Autumn / Winter 2026"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Button Text</label>
            <input
              className="input"
              value={form.button_text}
              onChange={(e) => setForm({ ...form, button_text: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Button Link</label>
            <input
              className="input"
              placeholder="/shop"
              value={form.button_link}
              onChange={(e) => setForm({ ...form, button_link: e.target.value })}
            />
          </div>
          <div className="field full">
            <label className="label">Slide Image *</label>
            <label className="file-btn" htmlFor="slide-image">Choose Image</label>
            <input
              id="slide-image"
              className="file-input-hidden"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={pickFile}
            />
            <p className="file-hint">{file ? file.name : "Wide image works best — JPG, PNG or WEBP from your PC"}</p>
            {preview && <img className="preview-img" src={preview} alt="Preview" style={{ maxWidth: "220px" }} />}
          </div>
          {error && <p className="error-text full">{error}</p>}
          <div className="full">
            <button className="btn btn-solid" disabled={busy}>
              {busy ? "Saving" : "Add Slide"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h3>All Slides</h3>
        {items.length === 0 ? (
          <p className="file-hint">No slides yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th></th><th>Title</th><th>Button</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.image ? (
                        <img className="thumb" style={{ width: "80px", height: "44px" }} src={s.image} alt="" />
                      ) : (
                        <div className="thumb-empty" style={{ width: "80px", height: "44px" }} />
                      )}
                    </td>
                    <td style={{ fontFamily: "var(--serif)", fontSize: "1.1rem" }}>{s.title}</td>
                    <td>
                      <span className="badge">{s.button_text}</span>
                    </td>
                    <td>
                      <span className={`badge ${s.is_active ? "green" : "red"}`}>
                        {s.is_active ? "Live" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <button className="mini-btn danger" onClick={() => remove(s)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}