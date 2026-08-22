const express = require("express");
const Entry = require("../models/ActiveStock");

const router = express.Router();

/*
  GET ALL ENTRIES
*/
router.get("/", async (req, res) => {
  try {
    const active = await Entry.find({
      status: "active",
    }).sort({ createdAt: -1 });

    const sold = await Entry.find({
      status: "sold",
    }).sort({ soldAt: -1 });

    res.json({
      success: true,
      data: {
        active,
        sold,
      },
    });
  } catch (error) {
    console.error("GET ENTRIES ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to read entries",
    });
  }
});

/*
  CREATE ENTRY
*/
router.post("/", async (req, res) => {
  try {
    const {
      stockName,
      symbol,
      qty,
      entryPrice,
    } = req.body;

    if (!symbol || !qty || !entryPrice) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const quantity = Number(qty);
    const price = Number(entryPrice);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity",
      });
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry price",
      });
    }

    const newEntry = await Entry.create({
      stockName: stockName?.trim() || symbol.toUpperCase(),
      symbol: symbol.toUpperCase(),
      qty: quantity,
      entryPrice: price,
      totalInvestment: quantity * price,
      livePrice: price,
      pointDifference: 0,
      percentage: 0,
      status: "active",
    });

    res.status(201).json({
      success: true,
      data: newEntry,
    });
  } catch (error) {
    console.error("CREATE ENTRY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create entry",
    });
  }
});

/*
  SELL ENTRY
*/
router.put("/:id/sell", async (req, res) => {
  try {
    const { sellPrice } = req.body;

    if (
      !sellPrice ||
      Number(sellPrice) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid sell price is required",
      });
    }

    const finalSellPrice = Number(sellPrice);

    const entry = await Entry.findOne({
      _id: req.params.id,
      status: "active",
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Active entry not found",
      });
    }

    const pointDifference =
      finalSellPrice - entry.entryPrice;

    const percentage =
      entry.entryPrice > 0
        ? (pointDifference / entry.entryPrice) * 100
        : 0;

    const profitLoss =
      pointDifference * entry.qty;

    entry.sellPrice = finalSellPrice;
    entry.pointDifference = pointDifference;
    entry.percentage = percentage;
    entry.profitLoss = profitLoss;
    entry.status = "sold";
    entry.soldAt = new Date();

    await entry.save();

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error("SELL ENTRY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to sell entry",
    });
  }
});

/*
  DELETE ENTRY
*/
router.delete("/:id", async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found",
      });
    }

    await Entry.deleteOne({ _id: req.params.id });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE ENTRY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete entry",
    });
  }
});

module.exports = router;
