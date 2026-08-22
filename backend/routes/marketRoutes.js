const express = require("express");
const axios = require("axios");

const router = express.Router();
const cache = new Map();
const cacheDuration = 10000;

const yahooClient = axios.create({
  baseURL: "https://query1.finance.yahoo.com",
  timeout: 8000,
  headers: {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (compatible; InvestmentTracker/1.0)",
  },
});

const isValidSymbol = (symbol) => /^[A-Z0-9&-]{1,30}$/.test(symbol);

const getQuote = async (rawSymbol) => {
  const symbol = rawSymbol.trim().toUpperCase();
  const cached = cache.get(symbol);

  if (cached && Date.now() - cached.cachedAt < cacheDuration) {
    return cached.data;
  }

  const response = await yahooClient.get(
    `/v8/finance/chart/${encodeURIComponent(`${symbol}.NS`)}`,
    { params: { range: "1d", interval: "1m" } },
  );
  const meta = response.data?.chart?.result?.[0]?.meta;
  const lastPrice = Number(meta?.regularMarketPrice);

  if (!Number.isFinite(lastPrice)) {
    throw new Error("Quote not available");
  }

  const previousClose = Number(meta.regularMarketPreviousClose);
  const change = Number.isFinite(previousClose) ? lastPrice - previousClose : 0;
  const percentChange = previousClose
    ? (change / previousClose) * 100
    : 0;
  const data = {
    symbol,
    companyName: meta.longName || meta.shortName || symbol,
    lastPrice,
    change,
    percentChange,
    updatedAt: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : null,
    source: "Yahoo Finance",
  };

  cache.set(symbol, { data, cachedAt: Date.now() });
  return data;
};

router.get("/quote/:symbol", async (req, res) => {
  const symbol = req.params.symbol.trim().toUpperCase();

  if (!isValidSymbol(symbol)) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid NSE symbol",
    });
  }

  try {
    return res.json({ success: true, data: await getQuote(symbol) });
  } catch (error) {
    console.error(`Quote failed for ${symbol}:`, error.message);
    return res.status(502).json({
      success: false,
      message: "Live quote is currently unavailable. Please enter the price manually.",
    });
  }
});

router.get("/quotes", async (req, res) => {
  const symbols = [...new Set(
    String(req.query.symbols || "")
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(isValidSymbol),
  )].slice(0, 50);

  if (!symbols.length) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one valid symbol",
    });
  }

  const results = await Promise.allSettled(symbols.map(getQuote));
  const data = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  return res.json({
    success: true,
    data,
    unavailable: symbols.length - data.length,
  });
});

module.exports = router;
