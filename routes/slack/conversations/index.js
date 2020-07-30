const debug = require("debug")("tfl-guide:message/pump");
const { DateTime } = require("luxon");
const { WebClient } = require("@slack/web-api");
const Bottleneck = require("bottleneck");
const _ = require("lodash");

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
const sanitize = (text) =>
  `"${text.replace(/\n/g, "\\n").replace(/~/g, "U+223C")}"`;

async function transform(messages) {
  debug("Transforming %d messages...", messages.length);
  return messages
    .filter(channelJoinLeaveMessages)
    .filter(conciergeMessage)
    .reverse() //TODO: find better way to handle reverse ts
    .map((message) => ({
      event_type: "message",
      text: sanitize(message.text),
      reply_count: message.reply_count || 0,
      reply_users_count: message.reply_users_count || 0,
      ts: message.ts,
      latest_reply: message.latest_reply || "",
      user: message.user,
    }));
}

async function load(messages) {
  debug("Loading %d messages...", messages.length);
  const data = await pushToKinesis(messages);
  debug("Loaded: %d, failed: %d ", data.Records.length, data.FailedRecordCount);
}
function union(setA, setB) {
  let _union = new Set(setA);
  for (let elem of setB) {
    _union.add(elem);
  }
  return _union;
}

async function pumpProfiles(users) {
  // slack tier 4 limits of 100 RPM
  const limiter = new Bottleneck({
    maxConcurrent: 50,
    reservoir: 100,
    reservoirIncreaseAmount: 100,
    reservoirIncreaseInterval: 60 * 1000, // release 100 every 1 minute
    trackDoneStatus: true,
  });

  const summaryTimer = setInterval(async () => {
    debug("Process summary: %o", await limiter.counts());
  }, 1000);

  const jobs = users.map((user) =>
    limiter.schedule(web.users.profile.get, { user: user, include: false })
  );

  const results = await Promise.allSettled(jobs);
  const profiles = results
    .map((result, index) => ({ ...result, user: users[index] }))
    .filter((result) => result.status === "fulfilled" && result.value.ok)
    .map((result) => ({
      ...result.value.profile,
      user: result.user,
    }))
    .map((profile) => ({
      event_type: "profile",
      user: profile.user,
      display_name: profile.display_name,
      department:
        profile.fields &&
        profile.fields["XfDW01AH2Q"] &&
        profile.fields["XfDW01AH2Q"].value,
      division:
        profile.fields &&
        profile.fields["XfDW01AH0U"] &&
        profile.fields["XfDW01AH0U"].value,
      city:
        profile.fields &&
        profile.fields["XfDXHH1LF8"] &&
        profile.fields["XfDXHH1LF8"].value,
      first_name: profile.first_name,
      last_name: profile.last_name,
      real_name: profile.real_name,
      title: profile.title,
      phone: profile.phone,
    }));

  clearInterval(summaryTimer);
  for (const chunk of _.chunk(profiles, 50)) await load(chunk);
}

async function pumpReplies(channel, threads) {
  // slack tier 3 limits of 50 RPM
  const limiter = new Bottleneck({
    maxConcurrent: 25,
    reservoir: 50,
    reservoirIncreaseAmount: 50,
    reservoirIncreaseInterval: 60 * 1000, // release 50 every 1 minute
    trackDoneStatus: true,
  });

  const summaryTimer = setInterval(async () => {
    debug("Process summary: %o", await limiter.counts());
  }, 1000);

  const jobs = threads.map((ts) =>
    limiter.schedule(web.conversations.replies, {
      channel: channel,
      ts: ts,
      limit: 200,
    })
  );

  const results = await Promise.allSettled(jobs);
  clearInterval(summaryTimer);

  const rejected = results.filter((result) => result.status === "rejected");
  if (rejected.length > 0)
    debug("%s profile lookup rejected.", rejected.length);

  const replyMessages = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value.messages)
    .filter((message) => !message.reply_count) // filter out first message for replies
    .map((message) => ({
      event_type: "reply",
      text: sanitize(message.text),
      thread_ts: message.thread_ts,
      user: message.user,
    }));

  for (const chunk of _.chunk(replyMessages, 50)) await load(chunk);
}

async function messagePump(channel, days) {
  debug("Starting pump on %s for %s", channel, days);
  const startTime = DateTime.utc();
  const timestamp = startTime.minus({ days }).toSeconds();
  let participants = new Set();
  let threads = [];
  let cursor = "";
  let exported = 0;
  do {
    const { messages, response_metadata } = await extract(
      channel,
      cursor,
      timestamp
    );

    const replyUsers = messages.flatMap((m) =>
      m.reply_count && m.reply_count > 0 ? m.reply_users.concat(m.user) : m.user
    );
    threads = _.concat(
      threads,
      messages
        .filter((m) => m.reply_count && m.reply_count > 0)
        .map((m) => m.thread_ts)
    );

    participants = union(participants, new Set(replyUsers));

    const messageList = await transform(messages);
    exported += messageList.length;
    if (messageList.length > 0) await load(messageList);

    cursor = (response_metadata && response_metadata.next_cursor) || "";
  } while (cursor);

  const uniqueParticipants = [...participants];
  debug(
    "Extracting and loading profile of %s users",
    uniqueParticipants.length
  );
  await pumpProfiles(uniqueParticipants);

  debug("Processing replies for %s threads", threads.length);
  await pumpReplies(channel, threads);

  debug(
    "Stopping message pump. Running time: %s",
    startTime.diffNow().toString()
  );

  return { exported, duration: startTime.diffNow().toString() };
}

module.exports = messagePump;
