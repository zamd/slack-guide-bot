const express = require('express');
const bodyParser = require('body-parser');

const { createEventAdapter } = require('@slack/events-api');
const { WebClient } = require('@slack/web-api');
const createIssue = require('./jira');
const util = require('util');

const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const token = process.env.SLACK_TOKEN;

// Initialize
const slackEvents = createEventAdapter(slackSigningSecret);
const web = new WebClient(token);

const app = express();
app.use('/slack', slackEvents.requestListener());

app.use(bodyParser());

app.get('/install/callback', (req,res)=> {
    res.send('OK: Install callback');
});
app.get('*', (req,res)=> {
    res.send('TFL Slack Bot');
});

const Replies = {
     Help: "*Adds topic idea to TFL guidance backlog* \n\n @guide <topic>, [description]",
     BacklogAdded: `:white_check_mark: Created issue *%s*\n\n%s`,
     Failure: `:warning: Error adding to backlog...`
};

async function postReply(event, replyMessage) {
    await web.chat.postMessage({
        channel: event.channel,
        text: replyMessage,
        thread_ts: event.ts
    });
}

async function processCommand(event) {
    const {team, channel, ts} = event;
    const [userTopic, description] = event.text.split(',');
    const [,topic] = userTopic.split('> ');

    const slackLink = `https://app.slack.com/client/${team}/${channel}/thread/${channel}-${ts}`;

    try {
        const {key, self} = await createIssue(topic, description, slackLink);
        return util.format(Replies.BacklogAdded, key, self);
    }
    catch(err){
        return Replies.Failure;
    }
}

slackEvents.on('app_mention', async (event) => {
    const helpCommand = /(<@[A-Z])\w+>\W+help$/g;
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

app.listen(port, () => {
    console.log(`Listening on post ${port}...`);
  });

