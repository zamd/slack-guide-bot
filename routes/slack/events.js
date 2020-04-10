const express = require("express");
const router = express.Router();

const { createEventAdapter } = require("@slack/events-api");
const { WebClient } = require("@slack/web-api");
const createIssue = require("../../jira");
const util = require("util");
const startMessagePump = require("./conversations");

const debug = require("debug")("tfl-guide:events");

const blockit = require("./blockit");

// Initialize
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const web = new WebClient(process.env.SLACK_TOKEN);

router.use("/", slackEvents.requestListener());

const Replies = {
  Help:
    "*Adds topic idea to TFL guidance backlog* \n\n @guide <topic>, [description]",
  BacklogAdded: `:white_check_mark: Created issue *%s*\n\n%s`,
  ExportInitiated: `Export initiated`,
  Failure: `:warning: Error adding to backlog...`,
};

async function postReply(event, text, blocks) {
  try {
    if (!web.token) web.token = process.env.SLACK_TOKEN;
    await web.chat.postMessage({
      channel: event.channel,
      text,
      blocks,
      thread_ts: event.ts,
    });
  } catch (err) {
    debug("postMessage failed: %o", err);
  }
}

async function processTaskCommand(event) {
  const { team, channel, ts } = event;
  const [userTopic, description] = event.text.split(",");
  const [, topic] = userTopic.split("> ");

  debug(
    "add to backlog: team:%s channel:%s topic:%s description:%s",
    team,
    channel,
    topic,
    description
  );

  const slackLink = `https://app.slack.com/client/${team}/${channel}/thread/${channel}-${ts}`;

  try {
    const { key, self } = await createIssue(topic, description, slackLink);
    const browseLink = process.env.JIRA_DOMAIN + `/browse/${key}`;
    return util.format(Replies.BacklogAdded, key, browseLink);
  } catch (err) {
    debug("Command failed: %O", err);
    return Replies.Failure;
  }
}

async function handleResult(result, event) {
  debug("Export completed with stats: %o", result);
  //TODO: details message
  await postReply(
    event,
    `:white_check_mark: *Exported*: ${result.exported}, *Duration*: ${result.duration}`
  );
}

async function handleError(err, event) {
  debug("Export error: %o", err);
  await postReply(event, `:exclamation: ${err}`);
}

async function initiateExport(event) {
  const digits = /[0-9]+(\.[0-9]+)?$/g;
  const [days] = event.text.match(digits);

  debug("New export request. duration: %d days", days);

  const channel = event.channel;
  startMessagePump(channel, days)
    .then((res) => handleResult(res, event))
    .catch((err) => handleError(err, event));
  await postReply(event, Replies.ExportInitiated);
}

slackEvents.on("app_mention", async (event) => {
  const helpCommand = /(<@[A-Z])\w+>\W+help$/g;
  const exportCommand = /<@\w+>\s+export\s+[0-9]+(\.[0-9]+)?$/g; //<@U011BQZP8DD> export 0.5
  if (helpCommand.test(event.text)) {
    return await postReply(event, "", blockit.help.blocks);
  }

  if (exportCommand.test(event.text)) {
    return await initiateExport(event);
  }

  const replyMessage = await processTaskCommand(event);
  await postReply(event, replyMessage);
});

slackEvents.on("error", (error) => {
  console.error(error);
});

module.exports = router;
