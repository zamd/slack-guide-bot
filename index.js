const { createEventAdapter } = require('@slack/events-api');
const { WebClient } = require('@slack/web-api');

const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const token = process.env.SLACK_TOKEN;

// Initialize
const slackEvents = createEventAdapter(slackSigningSecret);
const web = new WebClient(token);

// slackEvents.on('message', (event) => {
//     console.log(event);
//     console.log(`Received a message event: user ${event.user} in channel ${event.channel} says ${event.text}`);
//   });

const Replies = {
     Help: "*Adds topic idea to TFL guidance backlog* \n\n @guide <topic>, [description]",

     BacklogAdd: ""
};
const helpCommand = /(<@[A-Z])\w+>\W+help$/g;

async function postReply(event, replyMessage) {
    await web.chat.postMessage({
        channel: event.channel,
        text: replyMessage,
        thread_ts: event.ts
    });
}

async function processCommand(event) {
    return await "Got it, thanks for reporting";
}

slackEvents.on('app_mention', async (event) => {
    console.log(event.text);
    if (helpCommand.test(event.text)) {
        return await postReply(event, Replies.Help);
    }

    const replyMessage = await processCommand(event);
    await postReply(event, replyMessage)
});

slackEvents.on('error', (error) => {
    console.error(error); 
});

const port = process.env.PORT || 3000;

(async () => {
  // Start the built-in server
  const server = await slackEvents.start(port);

  // Log a message when the server is ready
  console.info(`Listening for events on ${server.address().port}`);
})();

