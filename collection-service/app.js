const express = require("express");
const bodyParser = require("body-parser");
const collectionRoutes = require("./routes/collectionRoutes");

const app = express();
app.use(bodyParser.json());

app.use("/api", collectionRoutes);

app.listen(3000, () => console.log("Collection Service running on 3000"));
