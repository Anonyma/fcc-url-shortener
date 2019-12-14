"use strict";

const express = require("express");
const dnsPromises = require("dns").promises;
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Mongo init
mongoose.connect(process.env.MONGO_URI);

const urlSchema = new mongoose.Schema({
  original: String,
  new: Number
});
const Url = mongoose.model("Url", urlSchema);

// Endpoints
app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// URL SHORTENER - retrieve previously created URL
app.get("/api/shorturl/:shortenedUrl", async function (req, res) {
  const findUrl = await Url.findOne({ new: req.params.shortenedUrl });

  if (findUrl) {
    const { original: originalUrl } = findUrl;
    const urlWithProtocol = originalUrl.includes("http")
      ? originalUrl
      : "https://" + originalUrl;
    res.status(301).redirect(urlWithProtocol);
  }
  else {
    res.status(404)
  }
});

// URL SHORTENER - create new shortened URL
app.post("/api/shorturl/new", async function (req, res) {
  const { url: oldUrl } = req.body;

  try {
    const urlWithoutProtocol = oldUrl.replace(/^https?:\/\//i, "");
    await dnsPromises.lookup(urlWithoutProtocol);
  } catch (e) {
    res.json({
      error: "invalid URL"
    });
  }

  const lastCreatedUrl = await Url.findOne()
    .sort({ field: "asc", _id: -1 })
    .exec();

  try {
    const newUrl = new Url({
      original: oldUrl,
      new: lastCreatedUrl ? lastCreatedUrl.new + 1 : 1
    });
    const finalUrl = await newUrl.save();

    res.json({
      original_url: finalUrl.original,
      short_url: finalUrl.new
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.listen(port, function () {
  console.log("Node.js listening ...");
});
