const rp = require("request-promise-native");
const debug = require("debug")("tfl-guide:integration");
const issueTemplate = `
{"summary":"%summary%","issuetype":{"id":"10455"},
"project":{"key":"TFT"},
"description":{"content":[
        {"content":[{"text":"%description%","type":"text"}],"type":"paragraph"},
        {"content":[{"marks":[{"attrs":{"href":"%link%"},"type":"link"}],"text":"Slack thread link","type":"text"}],"type":"paragraph"}
    ],"type":"doc","version":1},
    "labels": [
        "TFL-Slack-Input"
    ]
}`;

module.exports = async function createIssue(summary, description, slackLink) {
  const json = issueTemplate
    .replace("%summary%", summary)
    .replace("%description%", description)
    .replace("%link%", slackLink);

  const issueUri = process.env.JIRA_DOMAIN + "/rest/api/3/issue";
  debug("Create JIRA item, POST %s", issueUri);
  return await rp(issueUri, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    auth: {
      username: process.env.JIRA_USERNAME,
      password: process.env.JIRA_API_TOKEN,
    },
    json: {
      fields: JSON.parse(json),
    },
  });
};
