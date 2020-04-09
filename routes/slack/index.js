const express = require("express");
const router = express.Router();

router.use("/install", require("./install"));
router.use("/events", require("./events"));

module.exports = router;
