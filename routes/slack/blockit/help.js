module.exports = {
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "Hey there 👋 I'm GuideBot. I'm here to help you with field guidance in Slack.",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "*1️⃣ Use the `@guide <task>, [description]` command*. This will add a task to TFL JIRA backlog. I'll ask for a due date (if applicable).",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "*2️⃣ Use the `@guide <export> [days]` command*. If you want to export channel messages for keyword/trend analysis. The default export duration is *30 days* and can be changed by using optional _days_ parameter. ",
      },
    },
    {
      type: "divider",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text:
            "❓Get help at any time with `@guide help` or type *help* in a DM with me",
        },
      ],
    },
  ],
};
