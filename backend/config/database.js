require("dotenv").config();
const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Database Connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

module.exports = connectDatabase;
