import { useEffect, useState } from "react";
import api from "../../api/client";

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled", "refunded"];

export default function AdminOrders() {
  const [data, setData] = useState({ items: [], pages: 1 });
  const [status, setStatus] = useState("");
  const [fraudOnly, setFraudOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);

  const load = () =>
    api.get("/admin/orders", {
      params: { status: status || undefined, fraud_only: fraudOnly, page, limit: 20 },
    }).then((r) => setData(r.data));

  useEffect(() => { load(); }, [status, fraudOnly, page]);

  const changeStatus = async (order, newStatus) => {
    await api.patch(`/admin/orders/${order.id}/status?status=${newStatus}`);
    load();
  };

  const view = async (order) => {
    const res = await api.get(`/orders/${order.order_number}`);
    setDetail(res.data);
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <p className="eyebrow">Fulfilment</p>
          <h2>Orders</h2>
        </div>
      </div>

      <div className="panel">
        <div className="row-actions" style={{ marginBottom: "1.4rem", flexWrap: "wrap" }}>
          <select className="status-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="check-row" style={{ margin: 0 }}>
            <input type="checkbox" checked={fraudOnly} onChange={(e) => { setFraudOnly(e.target.checked); setPage(1); }} />
            Fraud flagged only
          </label>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Order #</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Fraud</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number}</td>
                  <td>{o.first_name} {o.last_name}<br /><span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{o.email}</span></td>
                  <td>PKR {Number(o.total_amount).toLocaleString()}</td>
                  <td><span className="badge">{o.payment_method === "cod" ? "COD" : "Bank"}</span></td>
                  <td>
                    <select className="status-select" value={o.status} onChange={(e) => changeStatus(o, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{o.fraud_flag ? <span className="badge red">Flagged</span> : <span className="badge green">Safe</span>}</td>
                  <td><button className="mini-btn" onClick={() => view(o)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.pages > 1 && (
          <div className="pagination">
            <button className="mini-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="page-num">{page} / {data.pages}</span>
            <button className="mini-btn" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>

      {detail && (
        <div className="order-detail">
          <div className="row-actions" style={{ justifyContent: "space-between" }}>
            <h3>{detail.order_number}</h3>
            <button className="mini-btn" onClick={() => setDetail(null)}>Close</button>
          </div>
          <p>{detail.first_name} {detail.last_name} · {detail.email} · {detail.phone_number}</p>
          <p>{detail.address}, {detail.city}, {detail.postal_code}, {detail.country}</p>
          {detail.landmark && <p>Landmark: {detail.landmark}</p>}
          <hr className="hairline" style={{ margin: "1.2rem 0" }} />
          {detail.items.map((i) => (
            <p key={i.id}>{i.quantity} × {i.product_name} — PKR {Number(i.price).toLocaleString()}</p>
          ))}
          <p style={{ color: "var(--gold)", marginTop: "0.8rem" }}>Total: PKR {Number(detail.total_amount).toLocaleString()}</p>
          {detail.payment_screenshot && (
            <a href={detail.payment_screenshot} target="_blank" rel="noreferrer">
              <img src={detail.payment_screenshot} alt="Payment proof" />
            </a>
          )}
        </div>
      )}
    </>
  );
}