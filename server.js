"use strict";

var express = require("express");
var dns = require("dns");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var cors = require("cors");
var app = express();
var port = process.env.PORT || 3000;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI);

var urlSchema = new mongoose.Schema({
  original: String,
  new: Number
});
var Url = mongoose.model("Url", urlSchema);

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.get("/api/shorturl/:shortenedUrl", async function(req, res) {
  const findUrl = await Url.findOne({ new: req.params.shortenedUrl });
  if (findUrl) {
    const originalUrl = findUrl.original;
    const urlWithProtocol = originalUrl.includes("http")
      ? originalUrl
      : "https://" + originalUrl;
    res.status(301).redirect(urlWithProtocol);
  }
  else {
    res.status(404)
  }
});

app.post("/api/shorturl/new", async function(req, res) {
  const oldUrl = req.body.url;
  try {
    const dnsPromises = dns.promises;
    const REPLACE_REGEX = /^https?:\/\//i;

    const cleanOldUrl = oldUrl.replace(REPLACE_REGEX, "");
    let data = await dnsPromises.lookup(cleanOldUrl);
  } catch (e) {
    res.json({
      error: "invalid URL"
    });
  }

  const lastCreatedUrl = await Url.findOne()
    .sort({ field: "asc", _id: -1 })
    .exec();
  console.log(lastCreatedUrl);
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
    res.status(500).send("errrr" + err);
  }
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
