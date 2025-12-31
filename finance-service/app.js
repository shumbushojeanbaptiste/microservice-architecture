const { startConsumer } = require("./services/consumerService");

// Optional: express if you want to expose health endpoint
const express = require("express");
const app = express();

// Start consumer
startConsumer().catch(err => console.error("Consumer failed:", err));

// Optional health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Finance Service running" });
});

app.listen(3001, () => {
  console.log("Finance Service running on port 3001");
});
