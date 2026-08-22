require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5001;

mongoose.set("bufferCommands", false);

app.use(cors());
app.use(express.json());

const entryRoutes = require("./routes/entryRoutes");
const marketRoutes = require("./routes/marketRoutes");

app.use("/api/entries", entryRoutes);
app.use("/api/market", marketRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Investment Tracker API is running",
    health: "/api/health",
    entries: "/api/entries",
  });
});

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    success: connected,
    database: connected ? "connected" : "disconnected",
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    setTimeout(connectDatabase, 5000);
  }
};

connectDatabase();
