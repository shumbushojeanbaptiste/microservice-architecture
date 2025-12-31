const express = require("express");
const router = express.Router();

const {
  createCollection,
  updateCollection,
  deleteCollection
} = require("../controllers/collectionController");

router.post("/collect", createCollection);
router.put("/collect/:event_id", updateCollection);     // UPDATE
router.delete("/collect/:event_id", deleteCollection);  // DELETE (soft or logical)

module.exports = router;
