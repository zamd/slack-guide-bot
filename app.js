require("dotenv").config();
const express = require("express");
const path = require("path");

const slack = require("./routes/slack");
const index = require("./routes/index");
const messagePump = require("./routes/pump");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use("/slack", slack);
app.use("/pump", messagePump);
app.use("/", index);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on post ${port}...`);
});
