const { Kinesis } = require("aws-sdk");

const debug = require("debug")("tfl-guide:integration");

const stream = new Kinesis({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

async function pushToKinesis(messages) {
  const recs = messages.map((m) => ({
    Data: m + "\n",
    PartitionKey: "#field-team-questions",
  }));

  return new Promise((resolve, reject) => {
    stream.putRecords(
      {
        Records: recs,
        StreamName: process.env.AWS_KENISES_STREAM,
      },
      (err, data) => {
        err ? reject(err) : resolve(data);
      }
    );
  });
}

module.exports = pushToKinesis;
