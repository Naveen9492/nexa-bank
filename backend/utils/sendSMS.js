import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/api/auth/send-otp", async (req, res) => {
  try {
    //const { mobile } = req.body;
    const mobile = "9493676225";
    if (!/^[6-9]\d{9}$/.test(mobile || "")) {
      return res.status(400).json({
        message: "Enter a valid Indian mobile number",
      });
    }

    const response = await axios.post(
      "https://www.fast2sms.com/dev/otp/send",
      {
        mobile,
        otp_id: process.env.FAST2SMS_OTP_ID,
      },
      {
        headers: {
          Authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.data.return) {
      return res.status(502).json({
        message: "OTP delivery request failed",
      });
    }

    res.json({ message: "OTP SMS requested successfully" });
  } catch (error) {
    console.error("OTP provider request failed");
    res.status(502).json({
      message: "Unable to send OTP. Please try again.",
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
