const debug = require("debug")("tfl-guide:message/pump");
const { DateTime } = require("luxon");
const { WebClient } = require("@slack/web-api");

const pushToKinesis = require("./../../../kinesis");

const web = new WebClient(process.env.SLACK_TOKEN);

async function extract(channel, cursor, timestamp) {
  debug("Extracting messages from %s, cursor:%s", channel, cursor);
  return await web.conversations.history({
    channel,
    cursor,
    oldest: timestamp,
  });
}

const channelJoinLeaveMessages = (m) =>
  !(
    m.subtype &&
    (m.subtype === "channel_join" || m.subtype === "channel_leave")
  );
const conciergeMessage = (m) => !(m.bot_id && m.bot_id === "B16TDKRNG");

async function transform(messages) {
  debug("Transforming %d messages...", messages.length);

  return messages
    .filter(channelJoinLeaveMessages)
    .filter(conciergeMessage)
    .map((m) => m.text)
    .map((t) => t.split("\n").join("\t")) //replace incline newline with a tab
    .reverse(); //TODO: find better way to handle reverse ts
}

async function load(messages) {
  debug("Loading %d messages...", messages.length);
  const data = await pushToKinesis(messages);
  debug("Loaded: %d, failed: %d ", data.Records.length, data.FailedRecordCount);
}

async function messagePump(channel, days) {
  debug("Starting pump on %s for %s", channel, days);
  const startTime = DateTime.utc();
  const timestamp = startTime.minus({ days }).toSeconds();

  let cursor = "";
  let exported = 0;
  do {
    const { messages, response_metadata } = await extract(
      channel,
      cursor,
      timestamp
    );
    const messageList = await transform(messages);
    exported += messageList.length;
    if (messageList.length > 0) await load(messageList);

    cursor = (response_metadata && response_metadata.next_cursor) || "";
  } while (cursor);

  debug(
    "Stopping message pump. Running time: %s",
    startTime.diffNow().toString()
  );

  return { exported, duration: startTime.diffNow().toString() };
}

module.exports = messagePump;
