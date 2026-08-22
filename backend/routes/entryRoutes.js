const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const router = express.Router();

const dataFile = path.join(
  __dirname,
  "../data/entries.json"
);

const readData = async () => {
  try {
    const file = await fs.readFile(dataFile, "utf8");

    return JSON.parse(file);
  } catch (error) {
    const defaultData = {
      active: [],
      sold: [],
    };

    await fs.writeFile(
      dataFile,
      JSON.stringify(defaultData, null, 2)
    );

    return defaultData;
  }
};

const writeData = async (data) => {
  await fs.writeFile(
    dataFile,
    JSON.stringify(data, null, 2)
  );
};

/*
  GET ALL ENTRIES
*/
router.get("/", async (req, res) => {
  try {
    const data = await readData();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

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

    if (
      !stockName ||
      !symbol ||
      !qty ||
      !entryPrice
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const data = await readData();

    const quantity = Number(qty);
    const price = Number(entryPrice);

    const newEntry = {
      id: Date.now(),
      stockName,
      symbol: symbol.toUpperCase(),
      qty: quantity,
      entryPrice: price,
      totalInvestment: quantity * price,
      livePrice: price,
      difference: 0,
      percentage: 0,
      createdAt: new Date().toISOString(),
    };

    data.active.unshift(newEntry);

    await writeData(data);

    res.status(201).json({
      success: true,
      data: newEntry,
    });
  } catch (error) {
    console.error(error);

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
    const id = Number(req.params.id);

    const { sellPrice } = req.body;

    if (!sellPrice || Number(sellPrice) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid sell price is required",
      });
    }

    const data = await readData();

    const index = data.active.findIndex(
      (entry) => entry.id === id
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Active entry not found",
      });
    }

    const entry = data.active[index];

    const finalSellPrice = Number(sellPrice);

    const pointDifference =
      finalSellPrice - entry.entryPrice;

    const percentage =
      entry.entryPrice > 0
        ? (pointDifference / entry.entryPrice) * 100
        : 0;

    const profitLoss =
      pointDifference * entry.qty;

    const soldEntry = {
      ...entry,

      sellPrice: finalSellPrice,

      pointDifference,

      percentage,

      profitLoss,

      soldAt: new Date().toISOString(),
    };

    /*
      Remove from active
    */
    data.active.splice(index, 1);

    /*
      Add to sold
    */
    data.sold.unshift(soldEntry);

    await writeData(data);

    res.json({
      success: true,
      data: soldEntry,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to sell entry",
    });
  }
});

module.exports = router;