const Entry = require("../models/Entry");

exports.createEntry = async (req, res) => {
  try {
    const {
      stockName,
      symbol,
      securityId,
      exchangeSegment,
      qty,
      entryPrice,
    } = req.body;

    if (!stockName || !symbol || !qty || !entryPrice) {
      return res.status(400).json({
        success: false,
        message: "All required fields are required",
      });
    }

    const totalInvestment = Number(qty) * Number(entryPrice);

    const entry = await Entry.create({
      stockName,
      symbol,
      securityId,
      exchangeSegment,
      qty: Number(qty),
      entryPrice: Number(entryPrice),
      totalInvestment,
      status: "active",
    });

    res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error("Create Entry Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create entry",
    });
  }
};

exports.getActiveEntries = async (req, res) => {
  try {
    const entries = await Entry.find({
      status: "active",
    }).sort({ createdAt: -1 });

    const data = entries.map((entry) => {
      const livePrice = Number(entry.livePrice || entry.entryPrice);
      const difference = livePrice - entry.entryPrice;
      const percentage =
        entry.entryPrice > 0
          ? (difference / entry.entryPrice) * 100
          : 0;

      return {
        ...entry.toObject(),
        difference,
        percentage,
      };
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get Active Entries Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch active entries",
    });
  }
};

exports.getSoldEntries = async (req, res) => {
  try {
    const entries = await Entry.find({
      status: "sold",
    }).sort({ soldAt: -1 });

    res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error("Get Sold Entries Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch sold entries",
    });
  }
};

exports.sellEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { sellPrice } = req.body;

    if (!sellPrice || Number(sellPrice) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid sell price is required",
      });
    }

    const entry = await Entry.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found",
      });
    }

    if (entry.status === "sold") {
      return res.status(400).json({
        success: false,
        message: "Entry already sold",
      });
    }

    const profitLoss =
      (Number(sellPrice) - Number(entry.entryPrice)) *
      Number(entry.qty);

    entry.sellPrice = Number(sellPrice);
    entry.profitLoss = profitLoss;
    entry.status = "sold";
    entry.soldAt = new Date();

    await entry.save();

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error("Sell Entry Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to sell entry",
    });
  }
};