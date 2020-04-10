const debug = require("debug")("tfl-guide:message/pump");
const { DateTime } = require("luxon");
const { WebClient } = require("@slack/web-api");
const web = new WebClient(process.env.SLACK_TOKEN);

async function extract(channel, cursor, timestamp) {
  debug("Extracting messages from %s, cursor:%s", channel, cursor);
  return await web.conversations.history({
    channel,
    cursor,
    oldest: timestamp,
  });
}

async function transform(messages) {
  debug("Transforming %d messages...", messages.length);
  return messages.map((m) => m.text);
}

async function load(messages) {
  debug("Loading %d messages...", messages.length);
  // PUSH to Firehose
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
    await load(messageList);

    cursor = (response_metadata && response_metadata.next_cursor) || "";
  } while (cursor);

  debug(
    "Stopping message pump. Running time: %s",
    startTime.diffNow().toString()
  );

  return { exported, duration: startTime.diffNow().toString() };
}

module.exports = messagePump;
