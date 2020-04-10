# TFL Guide Bot

`@guide` is used in #field-team-questions channel by field team members to get help from TFL. The bot allows field and product to create review/engagement tasks in TFL team's JIRA backlog.

The bot also support `@guide export <days>` command, where it can extract messages from slack channel for last `<n>` days and push them to Kinesis stream. This enables the TFL team to periodically review questions to understand common topics and trends. This information is used to priortize proactive guidance for field teams.

Use `@guide help` command to display help in slack

![Guide help](https://user-images.githubusercontent.com/1377205/79012984-1a45c880-7b81-11ea-93ad-f63da2eca459.png)

# Deployment

The Guide slack app (@guide bot) is running in [Auth0 Heroku account](https://dashboard.heroku.com/apps/tfl-bot) and is manually deployed from this repo.

# Configuration

When running locally, create following config in .env file. For Heroku add these as config vars.

```
SLACK_SIGNING_SECRET=6fa2069990eb365a4a8
SLACK_TOKEN=xoxb-50651575958-keuEOO6x9eEj08S5K5WLwCi2
SLACK_CLIENT_ID=2154.821699204181
SLACK_CLIENT_SECRET=99ff22f000cf1eb62450
SLACK_SCOPE=channels:history,channels:read,chat:write,app_mentions:read
JIRA_USERNAME=user@auth0.com
JIRA_API_TOKEN=q2VHUuBEOIE15C
JIRA_DOMAIN=https://jira-9bx7aw55av0w.runkit.sh
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AICO6HXV
AWS_SECRET_ACCESS_KEY=UBco/s70oubB
AWS_KENISES_STREAM=field-team-questions
```
