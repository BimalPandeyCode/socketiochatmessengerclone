const mongoose = require("mongoose");

const ipAdress = new mongoose.Schema({
  ip: { type: Object, required: true },
});

const getIP = mongoose.model("ip", ipAdress);
module.exports = getIP;
