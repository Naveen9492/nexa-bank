require("dotenv").config();
const app = require("./app");
const connectDatabase = require("./config/database");
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`NexaBank API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};
startServer();
