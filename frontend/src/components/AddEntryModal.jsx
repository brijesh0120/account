import { useState } from "react";
import { createEntry } from "../services/entryApi";

export default function AddEntryModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    stockName: "",
    symbol: "",
    securityId: "",
    exchangeSegment: "NSE_EQ",
    qty: "",
    entryPrice: "",
  });

  const [loading, setLoading] = useState(false);

  const totalInvestment =
    Number(form.qty || 0) * Number(form.entryPrice || 0);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.stockName ||
      !form.symbol ||
      !form.qty ||
      !form.entryPrice
    ) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      await createEntry({
        ...form,
        qty: Number(form.qty),
        entryPrice: Number(form.entryPrice),
      });

      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.message || "Failed to save entry"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Add Entry</h2>

          <button onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Stock Name</label>

            <input
              name="stockName"
              value={form.stockName}
              onChange={handleChange}
              placeholder="Reliance Industries"
            />
          </div>

          <div className="form-group">
            <label>Symbol</label>

            <input
              name="symbol"
              value={form.symbol}
              onChange={handleChange}
              placeholder="RELIANCE"
            />
          </div>

          <div className="form-group">
            <label>Security ID</label>

            <input
              name="securityId"
              value={form.securityId}
              onChange={handleChange}
              placeholder="Dhan Security ID"
            />
          </div>

          <div className="form-group">
            <label>Qty</label>

            <input
              type="number"
              name="qty"
              value={form.qty}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Entry Price</label>

            <input
              type="number"
              name="entryPrice"
              value={form.entryPrice}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
          </div>

          <div className="investment-box">
            <span>Total Investment</span>
            <strong>₹{totalInvestment.toLocaleString("en-IN")}</strong>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}