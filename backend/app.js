require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const applicationRoutes = require("./routes/applicationRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URI,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
  }),
);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Home",
  });
});

app.use("/", applicationRoutes);
app.use("/", authRoutes);

module.exports = app;
