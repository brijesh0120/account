import mongoose from "mongoose";

const soldStockSchema = new mongoose.Schema(
  {
    stockName: {
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

    sellPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    totalInvestment: {
      type: Number,
      default: 0,
    },

    sellValue: {
      type: Number,
      default: 0,
    },

    profitLoss: {
      type: Number,
      default: 0,
    },

    profitLossPercentage: {
      type: Number,
      default: 0,
    },

    entryDate: {
      type: Date,
    },

    soldDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const SoldStock = mongoose.model("SoldStock", soldStockSchema);

export default SoldStock;