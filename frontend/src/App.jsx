import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_URL = new URL("api/entries", API_BASE_URL).toString();

function App() {
  const [activeTab, setActiveTab] = useState("active");

  const [entries, setEntries] = useState([]);
  const [soldEntries, setSoldEntries] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [sellEntry, setSellEntry] = useState(null);
  const [sellPrice, setSellPrice] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("idle");

  const [form, setForm] = useState({
    symbol: "",
    qty: "",
    entryPrice: "",
  });

  const [loading, setLoading] = useState(false);

  const refreshLivePrices = (positions) => {
    const symbols = [
      ...new Set(positions.map((entry) => entry.symbol).filter(Boolean)),
    ];
    if (!symbols.length) return;

    const quoteUrl = new URL("api/market/quotes", API_BASE_URL);
    quoteUrl.searchParams.set("symbols", symbols.join(","));

    fetch(quoteUrl)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) return;

        const prices = new Map(
          result.data.map((quoteItem) => [
            quoteItem.symbol,
            quoteItem.lastPrice,
          ]),
        );

        setEntries((currentEntries) =>
          currentEntries
            .map((entry) => {
              const livePrice = prices.get(entry.symbol) ?? entry.livePrice;
              const pointDifference = livePrice - entry.entryPrice;
              const percentage = entry.entryPrice
                ? (pointDifference / entry.entryPrice) * 100
                : 0;

              return {
                ...entry,
                livePrice,
                pointDifference,
                percentage,
              };
            })
            .sort((first, second) => {
              const firstProfit = first.pointDifference * first.qty;
              const secondProfit = second.pointDifference * second.qty;
              return secondProfit - firstProfit;
            }),
        );
      })
      .catch((error) => console.error("Failed to refresh live prices:", error));
  };

  /*
    LOAD DATA
  */
  const loadEntries = async () => {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(
          "The backend is unavailable. Check the server and database connection.",
        );
      }

      const result = await response.json();

      if (result.success) {
        setEntries(result.data.active);
        setSoldEntries(result.data.sold);
        refreshLivePrices(result.data.active);
      } else {
        throw new Error(result.message || "Failed to load entries");
      }
    } catch (error) {
      console.error("Failed to load entries:", error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetch(API_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "The backend is unavailable. Check the server and database connection.",
          );
        }

        return response.json();
      })
      .then((result) => {
        if (!cancelled && result.success) {
          setEntries(result.data.active);
          setSoldEntries(result.data.sold);
          refreshLivePrices(result.data.active);
        }
      })
      .catch((error) => console.error("Failed to load entries:", error));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!entries.length) return undefined;

    const refreshTimer = setInterval(() => refreshLivePrices(entries), 15000);
    return () => clearInterval(refreshTimer);
  }, [entries]);

  useEffect(() => {
    const symbol = form.symbol.trim().toUpperCase();
    if (symbol.length < 2) {
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setQuoteStatus("loading");
      fetch(
        new URL(`api/market/quote/${encodeURIComponent(symbol)}`, API_BASE_URL),
        {
          signal: controller.signal,
        },
      )
        .then((response) => response.json())
        .then((result) => {
          if (!result.success) throw new Error(result.message);
          setQuote(result.data);
          setQuoteStatus("ready");
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setQuote(null);
            setQuoteStatus("unavailable");
          }
        });
    }, 600);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [form.symbol]);

  /*
    FORM CHANGE
  */
  const handleFormChange = (e) => {
    if (e.target.name === "symbol") {
      setQuote(null);
      setQuoteStatus("idle");
    }

    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  /*
    ADD / EDIT ENTRY
  */
  const handleAddEntry = async (e) => {
    e.preventDefault();

    if (!form.symbol || !form.qty || !form.entryPrice) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const isEditing = Boolean(editingEntry);

      const response = await fetch(
        isEditing ? `${API_URL}/${editingEntry._id}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: form.symbol.trim().toUpperCase(),
            qty: Number(form.qty),
            entryPrice: Number(form.entryPrice),
          }),
        },
      );

      const result = await response.json();

      if (!result.success) {
        alert(
          result.message ||
            (isEditing ? "Failed to update entry" : "Failed to save entry"),
        );
        return;
      }

      await loadEntries();
      resetEntryForm();
      setShowAddModal(false);
    } catch (error) {
      console.error("ADD/UPDATE ERROR:", error);
      alert(
        editingEntry
          ? "Failed to update entry: " + error.message
          : "Failed to save entry: " + error.message,
      );
    } finally {
      setLoading(false);
    }
  };

  /*
    RESET ENTRY FORM
  */
  const resetEntryForm = () => {
    setForm({
      symbol: "",
      qty: "",
      entryPrice: "",
    });
    setQuote(null);
    setQuoteStatus("idle");
    setEditingEntry(null);
  };

  /*
    EDIT ENTRY
  */
  const handleEditClick = (entry) => {
    setEditingEntry(entry);

    setForm({
      symbol: entry.symbol || "",
      qty: String(entry.qty ?? ""),
      entryPrice: String(entry.entryPrice ?? ""),
    });

    setQuote(null);
    setQuoteStatus("idle");
    setShowAddModal(true);
  };

  /*
    DELETE ENTRY
  */
  const handleDeleteClick = async (entry) => {
    const confirmed = window.confirm(
      "Delete this entry? This cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/${entry._id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to delete entry");
      }

      await loadEntries();
    } catch (error) {
      console.error("DELETE ERROR:", error);
      alert("Failed to delete entry: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  /*
    SELL ENTRY
  */
  const handleSell = async () => {
    if (!sellEntry) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/${sellEntry._id}/sell`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          sellPrice: Number(sellPrice),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.message);
        return;
      }

      /*
        Reload JSON
      */
      await loadEntries();

      setSellEntry(null);
      setSellPrice("");
    } catch (error) {
      console.error(error);

      alert("Failed to sell entry");
    } finally {
      setLoading(false);
    }
  };

  /*
    SUMMARY
  */
  const totalInvestment = entries.reduce(
    (total, entry) => total + entry.totalInvestment,
    0,
  );

  const totalProfitLoss = entries.reduce(
    (total, entry) => total + (entry.pointDifference || 0) * entry.qty,
    0,
  );

  return (
    <div className="app">
      {/* HEADER */}

      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">₹</div>

          <div>
            <h1>Investment Tracker</h1>

            <p>Track your stock entries and exits</p>
          </div>
        </div>

        <button
          className="add-button"
          onClick={() => {
            resetEntryForm();
            setShowAddModal(true);
          }}
        >
          <span>+</span>
          Add Entry
        </button>
      </header>

      <main className="main-content">
        {/* SUMMARY */}

        <section className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon investment-icon">₹</div>

            <div>
              <span>Total Investment</span>

              <strong>
                ₹
                {totalInvestment.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon active-icon">●</div>

            <div>
              <span>Active Entries</span>

              <strong>{entries.length}</strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon profit-icon">↗</div>

            <div>
              <span>Current P/L</span>

              <strong className={totalProfitLoss >= 0 ? "profit" : "loss"}>
                {totalProfitLoss >= 0 ? "+" : ""}₹
                {totalProfitLoss.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon sold-icon">✓</div>

            <div>
              <span>Sold Entries</span>

              <strong>{soldEntries.length}</strong>
            </div>
          </div>
        </section>

        {/* CONTENT */}

        <section className="content-card">
          <div className="content-header">
            <div>
              <h2>
                {activeTab === "active" ? "Active Entries" : "Sold Entries"}
              </h2>

              <p>
                {activeTab === "active"
                  ? "Monitor your current stock positions"
                  : "View your completed stock positions"}
              </p>
            </div>

            <div className="tabs">
              <button
                className={activeTab === "active" ? "tab active" : "tab"}
                onClick={() => setActiveTab("active")}
              >
                Active Entries
                <span>{entries.length}</span>
              </button>

              <button
                className={activeTab === "sold" ? "tab active" : "tab"}
                onClick={() => setActiveTab("sold")}
              >
                Sold Entries
                <span>{soldEntries.length}</span>
              </button>
            </div>
          </div>

          {/* ACTIVE */}

          {activeTab === "active" &&
            (entries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">₹</div>

                <h3>No active entries</h3>

                <p>
                  Add your first stock entry to start tracking your investment.
                </p>

                <button
                  className="empty-button"
                  onClick={() => {
                    resetEntryForm();
                    setShowAddModal(true);
                  }}
                >
                  + Add Entry
                </button>
              </div>
            ) : (
<div className="table-container">
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Stock</th>
        <th>Entry Price</th>
        <th>Qty</th>
        <th>Live Price</th>
        <th>Point Difference</th>
        <th>Percentage</th>
        <th>Action</th>
      </tr>
    </thead>

    <tbody>
      {entries.map((entry) => (
        <tr key={entry._id}>
          {/* ID */}
          <td data-label="ID" className="id-cell">
            <span className="mobile-value">
              #{String(entry._id).slice(-4)}
            </span>
          </td>

          {/* STOCK */}
          <td data-label="Stock">
            <div className="stock-cell">
              <div className="stock-avatar">
                {entry.symbol?.charAt(0)?.toUpperCase()}
              </div>

              <div className="stock-info">
                <strong>{entry.stockName}</strong>
                <span>{entry.symbol}</span>
              </div>
            </div>
          </td>

          {/* ENTRY PRICE */}
          <td data-label="Entry Price">
            <span className="mobile-value">
              ₹{Number(entry.entryPrice).toLocaleString("en-IN")}
            </span>
          </td>

          {/* QTY */}
          <td data-label="Qty">
            <span className="mobile-value">
              {entry.qty}
            </span>
          </td>

          {/* LIVE PRICE */}
          <td data-label="Live Price" className="live-price">
            <span className="mobile-value live-price-value">
              ₹{Number(entry.livePrice).toLocaleString("en-IN")}
              <span className="live-dot" />
            </span>
          </td>

          {/* POINT DIFFERENCE */}
          <td
            data-label="Point Difference"
            className={
              Number(entry.pointDifference) >= 0
                ? "profit"
                : "loss"
            }
          >
            <span className="mobile-value">
              {Number(entry.pointDifference) >= 0 ? "+" : ""}
              {Number(entry.pointDifference).toFixed(2)}
            </span>
          </td>

          {/* PERCENTAGE */}
          <td
            data-label="Percentage"
            className={
              Number(entry.percentage) >= 0
                ? "profit"
                : "loss"
            }
          >
            <span className="mobile-value">
              {Number(entry.percentage) >= 0 ? "+" : ""}
              {Number(entry.percentage).toFixed(2)}%
            </span>
          </td>

          {/* ACTION */}
          <td data-label="Action" className="action-cell">
            <div className="action-buttons">
              <button
                type="button"
                className="sell-button"
                onClick={() => handleSellClick(entry)}
              >
                Sell
              </button>

              <button
                type="button"
                className="edit-button"
                onClick={() => handleEditClick(entry)}
              >
                Edit
              </button>

              <button
                type="button"
                className="delete-button"
                onClick={() => handleDeleteClick(entry)}
                disabled={loading}
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
            ))}

          {/* SOLD */}

          {activeTab === "sold" &&
            (soldEntries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>

                <h3>No sold entries</h3>

                <p>
                  Sold positions will appear here after you close an active
                  entry.
                </p>
              </div>
            ) : (
<div className="table-container sold-table-container">
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Stock</th>
        <th>Entry Price</th>
        <th>Qty</th>
        <th>Sell Price</th>
        <th>Point Difference</th>
        <th>P/L</th>
        <th>Sold At</th>
      </tr>
    </thead>

    <tbody>
      {soldEntries.map((entry) => (
        <tr key={entry._id}>

          {/* ID */}
          <td data-label="ID" className="id-cell">
            <span className="mobile-value">
              #{String(entry._id).slice(-4)}
            </span>
          </td>

          {/* STOCK */}
          <td data-label="Stock">
            <div className="stock-cell">
              <div className="stock-avatar">
                {entry.symbol?.charAt(0)?.toUpperCase()}
              </div>

              <div className="stock-info">
                <strong>{entry.stockName}</strong>
                <span>{entry.symbol}</span>
              </div>
            </div>
          </td>

          {/* ENTRY PRICE */}
          <td data-label="Entry Price">
            <span className="mobile-value">
              ₹{Number(entry.entryPrice).toLocaleString("en-IN")}
            </span>
          </td>

          {/* QTY */}
          <td data-label="Qty">
            <span className="mobile-value">
              {entry.qty}
            </span>
          </td>

          {/* SELL PRICE */}
          <td data-label="Sell Price">
            <span className="mobile-value">
              ₹{Number(entry.sellPrice).toLocaleString("en-IN")}
            </span>
          </td>

          {/* POINT DIFFERENCE */}
          <td
            data-label="Point Difference"
            className={
              Number(entry.pointDifference) >= 0
                ? "profit"
                : "loss"
            }
          >
            <span className="mobile-value">
              {Number(entry.pointDifference) >= 0 ? "+" : ""}
              {Number(entry.pointDifference).toFixed(2)}
            </span>
          </td>

          {/* P/L */}
          <td
            data-label="P/L"
            className={
              Number(entry.profitLoss) >= 0
                ? "profit"
                : "loss"
            }
          >
            <span className="mobile-value">
              {Number(entry.profitLoss) >= 0 ? "+" : "-"}₹
              {Math.abs(Number(entry.profitLoss)).toLocaleString("en-IN")}
            </span>
          </td>

          {/* SOLD AT */}
          <td data-label="Sold At">
            <span className="mobile-value sold-date">
              {entry.soldAt
                ? new Date(entry.soldAt).toLocaleString("en-IN")
                : "-"}
            </span>
          </td>

        </tr>
      ))}
    </tbody>
  </table>
</div>
            ))}
        </section>
      </main>

      {/* ADD MODAL */}

      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            resetEntryForm();
          }}
        >
          <div
            className="modal entry-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">{editingEntry ? "Edit position" : "New position"}</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => {
                  setShowAddModal(false);
                  resetEntryForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddEntry}>
              <p className="form-section-label">Position details</p>
              <div className="form-row">
                <div className="form-group">
                  <label>Symbol</label>

                  <input
                    type="text"
                    name="symbol"
                    value={form.symbol}
                    onChange={handleFormChange}
                    placeholder="e.g. RELIANCE"
                    autoCapitalize="characters"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quantity</label>

                  <input
                    type="number"
                    name="qty"
                    value={form.qty}
                    onChange={handleFormChange}
                    placeholder="10"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-row entry-summary-row">
                <div className="form-group">
                  <label>Entry Price</label>

                  <div className="price-input">
                    <span>₹</span>

                    <input
                      type="number"
                      name="entryPrice"
                      value={form.entryPrice}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="investment-preview">
                  <span>Total Investment</span>

                  <strong>
                    ₹
                    {(
                      Number(form.qty || 0) * Number(form.entryPrice || 0)
                    ).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </div>
              </div>

              {quoteStatus !== "idle" && (
                <div className={`ltp-card ${quoteStatus}`}>
                  {quoteStatus === "loading" && (
                    <span>Fetching NSE live LTP…</span>
                  )}
                  {quoteStatus === "unavailable" && (
                    <span>
                      NSE quote unavailable. You can enter the price manually.
                    </span>
                  )}
                  {quoteStatus === "ready" && quote && (
                    <>
                      <div>
                        <span className="ltp-label">NSE Live LTP</span>
                        <strong>
                          ₹{quote.lastPrice.toLocaleString("en-IN")}
                        </strong>
                        <small
                          className={quote.change >= 0 ? "profit" : "loss"}
                        >
                          {quote.change >= 0 ? "+" : ""}
                          {quote.change} ({quote.percentChange}%)
                        </small>
                      </div>
                      <button
                        type="button"
                        className="use-ltp-button"
                        onClick={() =>
                          setForm({
                            ...form,
                            entryPrice: String(quote.lastPrice),
                          })
                        }
                      >
                        Use LTP
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetEntryForm();
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={loading}
                >
                  {loading
                    ? editingEntry
                      ? "Updating..."
                      : "Saving..."
                    : editingEntry
                      ? "Update Entry"
                      : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SELL MODAL */}

      {sellEntry && (
        <div className="modal-overlay" onClick={() => setSellEntry(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Sell Entry</h2>

                <p>Close your {sellEntry.symbol} position</p>
              </div>

              <button
                className="close-button"
                onClick={() => setSellEntry(null)}
              >
                ×
              </button>
            </div>

            <div className="sell-summary">
              <div>
                <span>Stock</span>
                <strong>{sellEntry.stockName}</strong>
              </div>

              <div>
                <span>Quantity</span>
                <strong>{sellEntry.qty}</strong>
              </div>

              <div>
                <span>Entry Price</span>
                <strong>₹{sellEntry.entryPrice}</strong>
              </div>

              <div>
                <span>Current Price</span>
                <strong>₹{sellEntry.livePrice}</strong>
              </div>
            </div>

            <div className="form-group">
              <label>Sell Price</label>
              <div className="price-input">
                <span>₹</span>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(event) => setSellPrice(event.target.value)}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="sell-warning">
              <span>⚠</span>

              <p>
                This entry will be removed from Active Entries and moved to Sold
                Entries.
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setSellEntry(null)}
              >
                Cancel
              </button>

              <button
                className="confirm-sell-button"
                onClick={handleSell}
                disabled={loading}
              >
                {loading ? "Selling..." : "Confirm Sell"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /*
    SELL BUTTON HANDLER
  */
  function handleSellClick(entry) {
    setSellEntry(entry);
    setSellPrice(String(entry.livePrice));
  }
}

export default App;