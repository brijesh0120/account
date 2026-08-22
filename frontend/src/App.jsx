import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_URL = new URL("api/entries", API_BASE_URL).toString();

function App() {
  const [activeTab, setActiveTab] = useState("active");

  const [entries, setEntries] = useState([]);
  const [soldEntries, setSoldEntries] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);

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
    const symbols = [...new Set(positions.map((entry) => entry.symbol).filter(Boolean))];
    if (!symbols.length) return;

    const quoteUrl = new URL("api/market/quotes", API_BASE_URL);
    quoteUrl.searchParams.set("symbols", symbols.join(","));

    fetch(quoteUrl)
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) return;

        const prices = new Map(
          result.data.map((quoteItem) => [quoteItem.symbol, quoteItem.lastPrice]),
        );

        setEntries((currentEntries) => currentEntries
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
          }));
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
        throw new Error("The backend is unavailable. Check the server and database connection.");
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
          throw new Error("The backend is unavailable. Check the server and database connection.");
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
      fetch(new URL(`api/market/quote/${encodeURIComponent(symbol)}`, API_BASE_URL), {
        signal: controller.signal,
      })
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
    ADD ENTRY
  */
  const handleAddEntry = async (e) => {
    e.preventDefault();

    if (!form.symbol || !form.qty || !form.entryPrice) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          symbol: form.symbol,
          qty: Number(form.qty),
          entryPrice: Number(form.entryPrice),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.message);
        return;
      }

      /*
        Reload JSON data
      */
      await loadEntries();

      setForm({
        symbol: "",
        qty: "",
        entryPrice: "",
      });

      setQuote(null);
      setQuoteStatus("idle");

      setShowAddModal(false);
    } catch (error) {
      console.error("SAVE ERROR:", error);
      alert("Failed to save entry: " + error.message);
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

        <button className="add-button" onClick={() => setShowAddModal(true)}>
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
                  onClick={() => setShowAddModal(true)}
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
                      <tr key={entry.id}>
                        <td className="id-cell">
                          #{String(entry._id).slice(-4)}
                        </td>

                        <td>
                          <div className="stock-cell">
                            <div className="stock-avatar">
                              {entry.symbol.charAt(0)}
                            </div>

                            <div>
                              <strong>{entry.stockName}</strong>

                              <span>{entry.symbol}</span>
                            </div>
                          </div>
                        </td>

                        <td>₹{entry.entryPrice.toLocaleString("en-IN")}</td>

                        <td>{entry.qty}</td>

                        <td className="live-price">
                          ₹{Number(entry.livePrice).toLocaleString("en-IN")}
                          <span className="live-dot" />
                        </td>

                        <td
                          className={
                            entry.pointDifference >= 0 ? "profit" : "loss"
                          }
                        >
                          {entry.pointDifference >= 0 ? "+" : ""}

                          {Number(entry.pointDifference).toFixed(2)}
                        </td>

                        <td
                          className={entry.percentage >= 0 ? "profit" : "loss"}
                        >
                          {entry.percentage >= 0 ? "+" : ""}
                          {Number(entry.percentage).toFixed(2)}%
                        </td>

                        <td>
                          <button
                            className="sell-button"
                            onClick={() => handleSellClick(entry)}
                          >
                            Sell
                          </button>
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
              <div className="table-container">
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
                      <tr key={entry.id}>
                        <td className="id-cell">
                          #{String(entry._id).slice(-4)}
                        </td>

                        <td>
                          <div className="stock-cell">
                            <div className="stock-avatar">
                              {entry.symbol.charAt(0)}
                            </div>

                            <div>
                              <strong>{entry.stockName}</strong>

                              <span>{entry.symbol}</span>
                            </div>
                          </div>
                        </td>

                        <td>₹{entry.entryPrice.toLocaleString("en-IN")}</td>

                        <td>{entry.qty}</td>

                        <td>₹{entry.sellPrice.toLocaleString("en-IN")}</td>

                        <td
                          className={
                            entry.pointDifference >= 0 ? "profit" : "loss"
                          }
                        >
                          {entry.pointDifference >= 0 ? "+" : ""}

                          {Number(entry.pointDifference).toFixed(2)}
                        </td>

                        <td
                          className={entry.profitLoss >= 0 ? "profit" : "loss"}
                        >
                          {entry.profitLoss >= 0 ? "+" : ""}₹
                          {entry.profitLoss.toLocaleString("en-IN")}
                        </td>

                        <td>
                          {new Date(entry.soldAt).toLocaleString("en-IN")}
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
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal entry-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">New position</p>
              </div>

              <button
                className="close-button"
                onClick={() => setShowAddModal(false)}
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
                  {quoteStatus === "loading" && <span>Fetching NSE live LTP…</span>}
                  {quoteStatus === "unavailable" && (
                    <span>NSE quote unavailable. You can enter the price manually.</span>
                  )}
                  {quoteStatus === "ready" && quote && (
                    <>
                      <div>
                        <span className="ltp-label">NSE Live LTP</span>
                        <strong>₹{quote.lastPrice.toLocaleString("en-IN")}</strong>
                        <small className={quote.change >= 0 ? "profit" : "loss"}>
                          {quote.change >= 0 ? "+" : ""}{quote.change} ({quote.percentChange}%)
                        </small>
                      </div>
                      <button
                        type="button"
                        className="use-ltp-button"
                        onClick={() => setForm({ ...form, entryPrice: String(quote.lastPrice) })}
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
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Entry"}
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
