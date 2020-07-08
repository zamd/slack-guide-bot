const rp = require("request-promise-native");
const debug = require("debug")("tfl-guide:integration");
const issueTemplate = require("./issueTemplate.json");

module.exports = async function createIssue(summary, description, slackLink) {
  if (!description) description = summary;
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
    json: JSON.parse(json),
  });
};
