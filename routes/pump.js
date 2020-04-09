const express = require("express");
const bodyParser = require("body-parser");
const router = express.Router();
const startMessagePump = require("./slack/conversations");
const debug = require("debug")("tfl-guide:message/pump");

router.use(bodyParser.json());

//Temp lock down
function ensureSlackToken(req, res, next) {
  const { token } = req.body;
  if (token == process.env.SLACK_TOKEN) next();

  res.status(403).end("Invalid or missing token.");
}

router.post("/", ensureSlackToken, function (req, res, next) {
  debug("New message pumping request received: %o", req.body);
  const { channel, days } = { days: 30, ...req.body }; // default 30 days
  startMessagePump(channel, days).catch((err) => debug("Pump error: %o", err));
  res.json({ queued: true });
});

module.exports = router;
