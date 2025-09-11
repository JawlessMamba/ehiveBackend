const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/userRoutes");
const { getConnectionFromPool } = require("./config/connection");
const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
// app.use(cors());
app.use(cors({ credentials: true, origin: "*" }))

app.use((req, res, next) => {
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");
  next();
});

// app.use("/user", userRoutes);
app.get("/", (req, res) => {
  res.send("Hello World!");
});
getConnectionFromPool();

// Remove the app.listen() block

module.exports = app; // Export the app object

