import { useEffect, useState } from "react";
import { getSoldEntries } from "../services/entryApi";

export default function SoldEntries() {
  const [entries, setEntries] = useState([]);

  const loadEntries = async () => {
    try {
      const response = await getSoldEntries();

      setEntries(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  return (
    <div>
      <h1>Sold Entries</h1>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Stock Name</th>
              <th>Entry Price</th>
              <th>Qty</th>
              <th>Sell Price</th>
              <th>P/L</th>
              <th>Sold At</th>
            </tr>
          </thead>

          <tbody>
            {entries.map((entry) => (
              <tr key={entry._id}>
                <td>{entry._id}</td>

                <td>{entry.stockName}</td>

                <td>₹{entry.entryPrice.toFixed(2)}</td>

                <td>{entry.qty}</td>

                <td>₹{entry.sellPrice.toFixed(2)}</td>

                <td>
                  ₹{entry.profitLoss.toFixed(2)}
                </td>

                <td>
                  {new Date(
                    entry.soldAt
                  ).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}

            {entries.length === 0 && (
              <tr>
                <td colSpan="7">
                  No sold entries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}