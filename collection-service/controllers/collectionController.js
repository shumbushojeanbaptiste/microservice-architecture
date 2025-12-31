const pool = require("../models/collectionModel");
const { publishEvent } = require("../services/eventService");
const { v4: uuidv4 } = require("uuid");

/**
 * CREATE
 */
exports.createCollection = async (req, res) => {
  const eventId = uuidv4();
  const data = req.body;

  await pool.query(
    `INSERT INTO cerise_collections
     (event_id, station_id, farmer_id, weight, price)
     VALUES (?, ?, ?, ?, ?)`,
    [eventId, data.station_id, data.farmer_id, data.weight, data.price]
  );

  await publishEvent("CeriseCollected", eventId, {
    ...data,
    event_id: eventId
  });

  res.json({ message: "Collection created", event_id: eventId });
};

/**
 * UPDATE
 */
exports.updateCollection = async (req, res) => {
  const { event_id } = req.params;
  const data = req.body;

  await pool.query(
    `UPDATE cerise_collections
     SET weight = ?, price = ?
     WHERE event_id = ?`,
    [data.weight, data.price, event_id]
  );

  await publishEvent("CeriseUpdated", event_id, {
    ...data,
    event_id
  });

  res.json({ message: "Collection updated", event_id });
};

/**
 * DELETE (logical delete)
 */
exports.deleteCollection = async (req, res) => {
  const { event_id } = req.params;

  await pool.query(
    "DELETE FROM cerise_collections WHERE event_id = ?",
    [event_id]
  );

  await publishEvent("CeriseDeleted", event_id, {
    event_id
  });

  res.json({ message: "Collection deleted", event_id });
};
