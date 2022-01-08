const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: "string", required: true },
  email: { type: "string", required: true },
  password: { type: "string", default: "" },
  tokenID: { type: "string", required: true },
  googleID: { type: "string", default: "" },
  imageUrl: {
    type: "string",
    default:
      "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png",
  },
  friends: {
    type: "array",
    default: [
      {
        name: "Mad Child",
        image:
          "https://lh3.googleusercontent.com/a/AATXAJx7Py6nxuH6z8_ToFOFImi3cBUkbKQScrB4cZrs=s96-c",
        id: "60e941d87de6d92afc1a6e97",
      },
    ],
  },
  createdAt: { type: "number", default: Date.now() },
});

const userModel = mongoose.model("userinfo", userSchema);
module.exports = userModel;
