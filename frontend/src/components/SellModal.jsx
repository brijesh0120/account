import { useState } from "react";
import { sellEntry } from "../services/entryApi";

export default function SellModal({
  entry,
  onClose,
  onSold,
}) {
  const [sellPrice, setSellPrice] = useState(
    entry.livePrice || ""
  );

  const profitLoss =
    (Number(sellPrice || 0) - Number(entry.entryPrice)) *
    Number(entry.qty);

  const handleSell = async () => {
    if (!sellPrice || Number(sellPrice) <= 0) {
      alert("Enter valid sell price");
      return;
    }

    try {
      await sellEntry(entry._id, Number(sellPrice));

      onSold();
      onClose();
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
          "Failed to sell entry"
      );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Sell Entry</h2>

        <p>
          <strong>{entry.stockName}</strong>
        </p>

        <p>
          Qty: <strong>{entry.qty}</strong>
        </p>

        <p>
          Entry Price:{" "}
          <strong>₹{entry.entryPrice}</strong>
        </p>

        <div className="form-group">
          <label>Sell Price</label>

          <input
            type="number"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            step="0.01"
          />
        </div>

        <div className="investment-box">
          <span>Profit / Loss</span>
          <strong>₹{profitLoss.toLocaleString("en-IN")}</strong>
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>
            Cancel
          </button>

          <button onClick={handleSell}>
            Confirm Sell
          </button>
        </div>
      </div>
    </div>
  );
}