const EventEmitter = require("events");
const sinon = require("sinon");
const { beforeEach, describe, it } = require("mocha");

const proxyquire = require("proxyquire").noCallThru().noPreserveCache();

class MockEvents extends EventEmitter {
  constructor() {
    super();
  }
  requestListener() {
    return (req, res, next) => next();
  }
}
const mockedEvents = new MockEvents();
let createIssueStub = sinon.stub().resolves({ key: "key1" });
const postMessageStub = sinon.stub().resolves(true);
const eventAdapter = () => mockedEvents;

class WebClient {
  constructor(token) {
    this.token = token;
    return {
      chat: { postMessage: postMessageStub },
    };
  }
}

const eventst = proxyquire("../routes/slack/events", {
  "../../jira": createIssueStub,
  "@slack/web-api": { WebClient: WebClient },
  "@slack/events-api": {
    createEventAdapter: eventAdapter,
  },
});
describe("#Slack events", function () {
  describe("#app_mention", function () {
    it("should create JIRA ticket with title and description", function (done) {
      mockedEvents.on("errror", (err) => {
        done(err);
      });

      const expectedTitle = "Some Title";
      const expectedDescription = "Some Description";
      const event = {
        team: "abc",
        channel: "tfl",
        ts: "12121",
        text: `<@UADSLFSK> ${expectedTitle}, ${expectedDescription}`,
      };
      const expectedLink = `https://app.slack.com/client/${event.team}/${event.channel}/thread/${event.channel}-${event.ts}`;
      mockedEvents.emit("app_mention", event);
      sinon.assert.calledWithExactly(
        createIssueStub,
        expectedTitle,
        expectedDescription,
        expectedLink
      );

      done();
    });

    it("should create JIRA ticket with title only", function (done) {
      mockedEvents.on("errror", (err) => {
        done(err);
      });

      const expectedTitle = "Some Title";
      const event = {
        team: "abc",
        channel: "tfl",
        ts: "12121",
        text: `<@UADSLFSK> ${expectedTitle}`,
      };
      const expectedLink = `https://app.slack.com/client/${event.team}/${event.channel}/thread/${event.channel}-${event.ts}`;
      mockedEvents.emit("app_mention", event);
      sinon.assert.calledWithExactly(
        createIssueStub,
        expectedTitle,
        "",
        expectedLink
      );

      done();
    });
  });
});
