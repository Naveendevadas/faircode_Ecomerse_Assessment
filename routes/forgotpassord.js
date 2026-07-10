const express = require("express");
const router = express.Router();
const sendEmail = require("../utils/sendEmail");

router.get("/test-mail", async (req, res) => {
  try {
    await sendEmail(
      "YOUR_EMAIL@gmail.com",
      "Nodemailer Test",
      "<h2>Hello Buddy! 🎉</h2><p>Your email is working.</p>"
    );

    res.send("Email sent successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

module.exports = router;