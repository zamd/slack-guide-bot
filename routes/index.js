const express = require("express");
const router = express.Router();

router.get("/", function (req, res, next) {
  //TODO: validate token: https://slack.com/api/auth.test
  const slackToken = process.env.SLACK_TOKEN;
  res.render("index", {
    title: "TFL Guide Slack App",
    appInstalled: !!slackToken,
  });
});

module.exports = router;
