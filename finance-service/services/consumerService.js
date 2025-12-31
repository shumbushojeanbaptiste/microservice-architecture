const redis = require("./redis");
const pool = require("../models/financeModel");

async function startConsumer() {
  const GROUP = "finance-group";
  const CONSUMER = "finance-1";
  const STREAM = "coffee.events";

  // 1️⃣ Create group if not exists
  try {
    await redis.xGroupCreate(STREAM, GROUP, "0", { MKSTREAM: true });
  } catch (err) {
    if (!err.message.includes("BUSYGROUP")) console.error(err);
  }

  console.log("Finance Consumer started...");

  while (true) {
    try {
      // 2️⃣ Read messages correctly
      const streams = await redis.xReadGroup(
        GROUP,
        CONSUMER,
        [{ key: STREAM, id: ">" }],   // <<< FIXED: array of objects
        { COUNT: 10, BLOCK: 5000 }
      );

      if (!streams) continue;

      for (const streamData of streams) {
        const { name, messages } = streamData;   // name = streamName
        for (const msg of messages) {
          const id = msg.id;
          const fieldsArray = msg.message;      // msg.message is object in v5
          const message = fieldsArray;

          const eventId = message.event_id;
          const eventType = message.event_type;
          const payload = JSON.parse(message.payload);

          // Idempotency
          const [rows] = await pool.query(
            "SELECT * FROM processed_events WHERE event_id = ?",
            [eventId]
          );
          if (rows.length > 0 && eventType === "CeriseCollected") {
            await redis.xAck(STREAM, GROUP, id);
            continue;
          }

          // Handle event
          if (eventType === "CeriseCollected") {
            const amount = payload.weight * payload.price;
            await pool.query(
              "INSERT INTO expenses (station_id, farmer_id, amount, event_id) VALUES (?, ?, ?, ?)",
              [payload.station_id, payload.farmer_id, amount, eventId]
            );
          }
            else if (eventType === "CeriseUpdated") {
            const amount = payload.weight * payload.price;
            await pool.query(
              "UPDATE expenses SET amount = ? ,farmer_id = ? WHERE event_id = ?",
              [amount, payload.farmer_id, eventId]
            );
          }
            else if (eventType === "CeriseDeleted") {
            await pool.query(
              "DELETE FROM expenses WHERE event_id = ?",
              [eventId]
            );
          }

          // Mark processed
          await pool.query("INSERT INTO processed_events (event_id,event_type) VALUES (?,?)", [eventId, eventType]);

          // Acknowledge in Redis
          await redis.xAck(STREAM, GROUP, id);
        }
      }

    } catch (err) {
      console.error("Error consuming events:", err);
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}

module.exports = { startConsumer };
