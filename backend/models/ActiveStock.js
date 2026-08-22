import mongoose from "mongoose";

const activeStockSchema = new mongoose.Schema(
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

    livePrice: {
      type: Number,
      default: 0,
    },

    totalInvestment: {
      type: Number,
      default: 0,
    },

    pointDifference: {
      type: Number,
      default: 0,
    },

    percentageDifference: {
      type: Number,
      default: 0,
    },

    entryDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const ActiveStock = mongoose.model("ActiveStock", activeStockSchema);

export default ActiveStock;