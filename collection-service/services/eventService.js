const redis = require("./redis");
const pool = require("../models/collectionModel");

async function publishEvent(eventType, eventId, payload) {

  // 1️⃣ Save to outbox (same event_id always)
  await pool.query(
    `INSERT INTO outbox_events (event_id, event_type, payload)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), sent = FALSE`,
    [eventId, eventType, JSON.stringify(payload)]
  );

  try {
    // 2️⃣ Push to Redis Stream
    await redis.xAdd("coffee.events", "*", {
      event_id: eventId,
      event_type: eventType,
      payload: JSON.stringify(payload)
    });

    // 3️⃣ Mark sent
    await pool.query(
      "UPDATE outbox_events SET sent = TRUE WHERE event_id = ?",
      [eventId]
    );

  } catch (err) {
    console.error("Redis publish failed, event saved to outbox", err);
  }
}

module.exports = { publishEvent };
