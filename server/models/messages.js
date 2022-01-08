const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sentBy: { type: "string", required: true },
  sentTo: { type: "string", required: true },
  message: { type: "string", default: "" },
  imageUrl: { type: "string", default: "" },
  imageMediumUrl: { type: "string", default: "" },
  imageThumbUrl: { type: "string", default: "" },
  deleteURL:{ type: "string", default: "" },
  type: { type: "string", required: true },
  sentTime: { type: "number", default: Date.now() },
});

const messageModel = mongoose.model("message", messageSchema);
module.exports = messageModel;
