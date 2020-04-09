const express = require("express");
const router = express.Router();

const { createEventAdapter } = require("@slack/events-api");
const { WebClient } = require("@slack/web-api");
const createIssue = require("../../jira");
const util = require("util");

const debug = require("debug")("tfl-guide:events");

// Initialize
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const web = new WebClient(process.env.SLACK_TOKEN);

router.use("/", slackEvents.requestListener());

const Replies = {
  Help:
    "*Adds topic idea to TFL guidance backlog* \n\n @guide <topic>, [description]",
  BacklogAdded: `:white_check_mark: Created issue *%s*\n\n%s`,
  Failure: `:warning: Error adding to backlog...`,
};

async function postReply(event, replyMessage) {
  try {
    if (!web.token) web.token = process.env.SLACK_TOKEN;
    await web.chat.postMessage({
      channel: event.channel,
      text: replyMessage,
      thread_ts: event.ts,
    });
  } catch (err) {
    debug("postMessage failed: %o", err);
  }
}

async function processCommand(event) {
  const { team, channel, ts } = event;
  const [userTopic, description] = event.text.split(",");
  const [, topic] = userTopic.split("> ");

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

slackEvents.on("app_mention", async (event) => {
  const helpCommand = /(<@[A-Z])\w+>\W+help$/g;
  if (helpCommand.test(event.text)) {
    return await postReply(event, Replies.Help);
  }

  const replyMessage = await processCommand(event);
  await postReply(event, replyMessage);
});

slackEvents.on("error", (error) => {
  console.error(error);
});

module.exports = router;
