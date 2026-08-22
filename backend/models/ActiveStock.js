const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    stockName: {
      type: String,
      required: true,
      trim: true,
    },

    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    entryPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    livePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    totalInvestment: {
      type: Number,
      default: 0,
    },

    pointDifference: {
      type: Number,
      default: 0,
    },

    sellPrice: {
      type: Number,
      min: 0,
    },

    percentage: {
      type: Number,
      default: 0,
    },

    profitLoss: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "sold"],
      default: "active",
      index: true,
    },

    soldAt: Date,
  },
  {
    timestamps: true,
  }
);

const Entry = mongoose.models.Entry || mongoose.model("Entry", entrySchema);

module.exports = Entry;
