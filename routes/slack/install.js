const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const rp = require("request-promise-native");

const debug = require("debug")("tfl-guide:install");

const STATE_COOKIE = "slstate";

router.use(cookieParser());

//TODO: scheme from req.
const getRedirectUri = (req) =>
  `https://${req.headers.host}${req.baseUrl}/callback`;

router.get("/", (req, res) => {
  const state = crypto.randomBytes(32).toString("hex");
  const redirectUri = getRedirectUri(req);

  const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${process.env.SLACK_SCOPE}&redirect_uri=${redirectUri}&state=${state}`;

  debug("Starting authorization: %s", installUrl);

  res.cookie(STATE_COOKIE, state);
  res.render("install", { title: "TFL Guide", installUrl });
});

router.get("/callback", async (req, res) => {
  debug(
    "Starting callback processing... query:%o cookies:%o",
    req.query,
    req.cookies
  );

  const csrfValid =
    req.query &&
    req.query.state &&
    req.cookies &&
    req.cookies[STATE_COOKIE] == req.query.state;

  if (!csrfValid) {
    return res.render("error", {
      message: "State dont't match,CSRF check failed.",
    });
  }
  if (!req.query.code) {
    return res.render("error", {
      message: req.query.error || "Authorization failed.",
    });
  }
  // clear state cookie
  res.cookie(STATE_COOKIE, "");

  try {
    const payload = await exchangeCode(
      req.query.code,
      process.env.SLACK_CLIENT_ID,
      process.env.SLACK_CLIENT_SECRET,
      getRedirectUri(req)
    );

    debug("code exchange response payload: %o", payload);
    if (!payload.access_token) {
      return res.render("error", {
        message: payload.error || "Code exchange failed.",
      });
    }
    process.env.SLACK_TOKEN = payload.access_token;
    res.redirect("/");
  } catch (err) {
    debug("Error %o", err);
    return res.render("error", { message: "Code exchange failed." });
  }
});

async function exchangeCode(code, clientId, clientSecret, redirectUri) {
  const options = {
    method: "POST",
    uri: "https://slack.com/api/oauth.v2.access",
    form: {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
    },
  };
  debug("slack.com/api/oauth.v2.access: %o", options);
  const json = await rp(options);
  return JSON.parse(json);
}

module.exports = router;
