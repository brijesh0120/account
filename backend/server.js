const express = require("express");
const cors = require("cors");

const app = express();

const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const entryRoutes = require("./routes/entryRoutes");

app.use("/api/entries", entryRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Investment Tracker API is running",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});