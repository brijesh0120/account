import { useEffect, useState } from "react";
import {
  getActiveEntries,
} from "../services/entryApi";
import AddEntryModal from "./AddEntryModal";
import SellModal from "./SellModal";

export default function ActiveEntries() {
  const [entries, setEntries] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const loadEntries = async () => {
    try {
      const response = await getActiveEntries();

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
      <div className="page-header">
        <h1>Active Entries</h1>

        <button onClick={() => setShowAdd(true)}>
          + Add Entry
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Stock Name</th>
              <th>Entry Price</th>
              <th>Qty</th>
              <th>Live Price</th>
              <th>Point Difference</th>
              <th>Percentage</th>
              <th>Sell</th>
            </tr>
          </thead>

          <tbody>
            {entries.map((entry) => (
              <tr key={entry._id}>
                <td>{entry._id}</td>

                <td>{entry.stockName}</td>

                <td>
                  ₹{entry.entryPrice.toFixed(2)}
                </td>

                <td>{entry.qty}</td>

                <td>
                  ₹{Number(
                    entry.livePrice || entry.entryPrice
                  ).toFixed(2)}
                </td>

                <td>
                  {entry.difference >= 0 ? "+" : ""}
                  {entry.difference.toFixed(2)}
                </td>

                <td>
                  {entry.percentage >= 0 ? "+" : ""}
                  {entry.percentage.toFixed(2)}%
                </td>

                <td>
                  <button
                    onClick={() =>
                      setSelectedEntry(entry)
                    }
                  >
                    Sell
                  </button>
                </td>
              </tr>
            ))}

            {entries.length === 0 && (
              <tr>
                <td colSpan="8">
                  No active entries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddEntryModal
          onClose={() => setShowAdd(false)}
          onSaved={loadEntries}
        />
      )}

      {selectedEntry && (
        <SellModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSold={loadEntries}
        />
      )}
    </div>
  );
}