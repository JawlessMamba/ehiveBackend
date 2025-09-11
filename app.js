const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const assetRoutes = require("./routes/assetRoutes");
const { getConnectionFromPool } = require("./config/connection");
const categoryRoutes = require("./routes/categoryRoutes");
const assetTransferRoutes = require('./routes/assetTransferRoutes');
const userRoutes = require('./routes/userRoutes'); // Import user routes
const app = express();

app.use(cookieParser());
app.use(bodyParser.json());
app.use(cors({ credentials: true, origin: "*" }));

app.use((req, res, next) => {
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World IMS Backend!");
});

getConnectionFromPool()
  .then(() => console.log("Database pool initialized"))
  .catch((err) => {
    console.error("DB pool initialization failed:", err);
    process.exit(1); // Exit if DB connection fails
  });

app.use("/asset", assetRoutes);
app.use('/categories', categoryRoutes);
app.use('/asset-transfers', assetTransferRoutes);
app.use("/user", userRoutes); // User routes


const PORT = 2300;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
