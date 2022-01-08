// mongodb user password = 8EYzaNYtw98wqYIJ
// mongodb uri = mongodb+srv://BimalPandey:8EYzaNYtw98wqYIJ@cluster0.i5cc4.mongodb.net/users?retryWrites=true&w=majority

// const Helmet = require("helmet");
// const Express = require("express");
// const cors = require("cors");
// const httpServer = require("http");

// const socketio = require("socket.io");

// const app = Express();
// app.use(cors());
// app.use(Helmet());

// const PORT = 4000;

// // app.use("/api/test", (req, res) => {
// //   res.send("The server is working fine");
// // });// "type": "module",

// const http = httpServer.createServer(app);
// let io = socketio(httpServer);
// io.on("connection", (socket) => {
//   console.log(socket.id);

//   socket.on("msg", (data) => {
//     console.log(data);
//   });

//   socket.on("disconnect", () => {
//     console.log(`User disconnected ${socket.id}`);
//   });
// });

// http.listen(PORT, () => console.log(`Server listening at port : ${PORT}`));
//* //*
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const socketio = require("socket.io");
require("dotenv").config();

const fs = require("fs");
const imgbbUploader = require("imgbb-uploader");

const mongoose = require("mongoose");
const userModel = require("./models/users.js");
const messageModel = require("./models/messages.js");
const getIP = require("./models/getip.js");

const SERVER_PORT = process.env.PORT || 4000;
const URI =
  "mongodb+srv://BimalPandey:8EYzaNYtw98wqYIJ@cluster0.i5cc4.mongodb.net/users?retryWrites=true&w=majority";
//
// * Mongodb
mongoose
  .connect(URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connection successful to MongoDB"))
  .catch((err) => console.log(err));
//
let nextVisitorNumber = 1;
const onlineClients = new Set();
let onlineUsers = {};
let onlineUsersToSendToFrontend = [];
function generateRandomNumber() {
  return Math.floor(Math.random() * 1000).toString();
}

function startServer() {
  function onNewWebsocketConnection(socket) {
    console.info(`Socket ${socket.id} has connected.`);
    onlineClients.add(socket.id);

    socket.on("disconnect", () => {
      onlineClients.delete(socket.id);
      delete onlineUsers[socket.id];
      onlineUsersToSendToFrontend = onlineUsersToSendToFrontend.filter(
        (ele) => ele.socketid !== socket.id
      );
      console.log(onlineUsers);
      console.info(`Socket ${socket.id} has disconnected.`);
      io.emit("OnlineUsers", onlineUsersToSendToFrontend);
      console.log("DISCONNECT");
      console.log(onlineUsersToSendToFrontend);
    });
    socket.on("initialize", (userid) => {
      let key = socket.id;
      onlineUsers[key] = userid;
      onlineUsersToSendToFrontend.push({ socketid: key, userID: userid });
      console.log("INITIALIZE");
      console.log(onlineUsersToSendToFrontend);
      io.emit("OnlineUsers", onlineUsersToSendToFrontend);
    });
    // ! echoes on the terminal every "hello" message this socket sends
    //! in this case "hello" is a event that the client should trigger and send data ie. helloMsg
    // * useEffect(() => {//client side code
    // *  socket = io("http://localhost:4000/");
    // *  socket.emit("hello", "This is a test"); //! this is the client side code where line 3 is the trigger for hello

    //  * socket.on("receivedMessages", (res) => {// this line receives the emit done by server
    // *    console.log(res);
    // *  });
    // *  socket.on("connect_error", (err) => {
    // *    console.log(err);
    // *  });
    //* }, []);
    socket.on("hello", (helloMsg) => {
      console.info(`Socket ${socket.id} says: "${helloMsg}"`);
      io.emit("test", "Hey guys this is working"); //! this is the emit that server does and client should listen on "test"
    });
    socket.on("messagesSent", (data) => {
      // ! this lines gets the data from cient from "messagesSent" trigger

      if (data.type === "Text") {
        messageModel
          .create({
            sentBy: data.sentBy,
            sentTo: data.sentTo,
            message: data.message,
            imageUrl: "",
            imageMediumUrl: "",
            imageThumbUrl: "",
            deleteURL: "",
            sentTime: data.sentDate,
            type: "Text",
          })
          .then((responseFromMongodb) => {
            console.log(responseFromMongodb);
            for (const key in onlineUsers) {
              if (onlineUsers[key] === responseFromMongodb.sentTo) {
                socket.to(key).emit("receivedMessages", responseFromMongodb); //* this emits message to specific client
              } else if (onlineUsers[key] === responseFromMongodb.sentBy) {
                console.log("Message sent");
                console.log(key, onlineUsers[key]);
                io.to(key).emit("sentReceivedMessages", responseFromMongodb); //* this emits message to specific client
              }
            }
          })
          .catch((err) => console.log(err));
      } else if (data.type === "Image") {
        let name = Date.now().toString();
        fs.writeFile(
          `./uploads/${name + "." + data.imageName.split(".")[1]}`,
          data.image,
          (err) => {
            if (err) {
              console.log(err);
            } else {
              const options = {
                apiKey: process.env.IMGBB_API_KEY, // MANDATORY

                imagePath: `./uploads/${
                  name + "." + data.imageName.split(".")[1]
                }`,

                name: `Wabbit${name}`,
              };
              imgbbUploader(options)
                .then((responseFromIMGBB) => {
                  // console.log(responseFromIMGBB);
                  fs.unlink(
                    `./uploads/${name + "." + data.imageName.split(".")[1]}`,
                    (err) => {
                      if (err) {
                        console.log(err);
                      } else {
                        console.log("DONE");
                      }
                    }
                  );
                  messageModel
                    .create({
                      sentBy: data.sentBy,
                      sentTo: data.sentTo,
                      message: "",
                      imageUrl: responseFromIMGBB.image.url,
                      imageMediumUrl:
                        responseFromIMGBB.medium !== undefined
                          ? responseFromIMGBB.medium.url
                          : "",
                      imageThumbUrl:
                        responseFromIMGBB.thumb !== undefined
                          ? responseFromIMGBB.thumb.url
                          : "",
                      deleteURL: responseFromIMGBB.delete_url,
                      type: "Image",
                      sentTime: data.sentDate,
                    })
                    .then((responseFromMongodb) => {
                      console.log(responseFromMongodb);
                      for (const key in onlineUsers) {
                        if (onlineUsers[key] === responseFromMongodb.sentTo) {
                          socket
                            .to(key)
                            .emit("receivedMessages", responseFromMongodb); //* this emits message to specific client
                        } else if (
                          onlineUsers[key] === responseFromMongodb.sentBy
                        ) {
                          io.to(key).emit(
                            "sentReceivedMessages",
                            responseFromMongodb
                          ); //* this emits message to specific client
                        }
                      }
                    })
                    .catch((err) => {
                      console.log(err);
                    });
                })
                .catch((error) => {
                  console.error(error);
                });
            }
          }
        );
      }

      // socket.broadcast.emit("receivedMessages", data); // * this line emits out the data to everyone except the sender
    });
    // ! will send a message only to this socket (different than using `io.emit()`, which would broadcast it)
    socket.emit(
      // * this will emit the message to every body including the sender
      "welcome",
      `Welcome! You are visitor number ${nextVisitorNumber++}`
    );
  }
  // create a new express app
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(cors());
  app.use(helmet());
  // create http server and wrap the express app
  const server = http.createServer(app);
  // bind socket.io to that server
  const io = socketio(server, { cors: { origin: "*" } });

  // example on how to serve a simple API
  app.get("/random", (req, res) => res.send(generateRandomNumber()));

  // * Auth path
  app.post("/api/auth", (req, res) => {
    // console.log(req.body);
    const { name, googleId, email, tokenID, imageUrl } = req.body;
    userModel.findOne({ email: email }).then((resFromMongodb) => {
      if (resFromMongodb === null) {
        userModel
          .create({
            name: name,
            email: email,
            password: "",
            tokenID: tokenID,
            googleID: googleId,
            imageUrl: imageUrl,
          })
          .then((responseFromMongodb) => res.send(responseFromMongodb))
          .catch((errFromMongodb) => res.send(errFromMongodb));
      } else {
        res.send(resFromMongodb);
      }
    });
  });
  app.post("/api/getUser", (req, res) => {
    if (mongoose.isValidObjectId(req.body.id)) {
      userModel.findOne({ _id: req.body.id }).then((responseFromMongodb) => {
        if (responseFromMongodb !== null) {
          res.send(responseFromMongodb);
        } else {
          res.send("NOT_FOUND");
        }
        // console.log(responseFromMongodb);
      });
    } else {
      res.send("NOT_FOUND");
    }
  });
  app.post("/api/getfriends", (req, res) => {
    userModel
      .find({ _id: { $ne: req.body.id } })
      .then((responseFromMongodb) => {
        res.send(responseFromMongodb);
      })
      .catch((err) => {
        console.log(err);
      });
  });
  app.post("/api/getapi", (req, res) => {
    console.log(req.body);
    console.log(typeof req.body);
    getIP.create({
      ip: req.body,
    });
  });
  app.post("/api/getAllMessages", (req, res) => {
    console.log(req.body);
    messageModel
      .find({
        $or: [{ sentBy: req.body.id }, { sentTo: req.body.id }],
      })
      .then((responseFromMongodb) => {
        console.log(responseFromMongodb);
        res.send(responseFromMongodb);
      })
      .catch((err) => console.log(err));
  });

  // example on how to serve static files from a given folder
  app.use(express.static("public"));

  // will fire for every new websocket connection
  io.on("connection", onNewWebsocketConnection);

  // important! must listen from `server`, not `app`, otherwise socket.io won't function correctly
  server.listen(SERVER_PORT, () =>
    console.info(`Listening on port ${SERVER_PORT}.`)
  );

  // will send one message per second to all its clients
  let secondsSinceServerStarted = 0;
  setInterval(() => {
    secondsSinceServerStarted++;
    io.emit("seconds", secondsSinceServerStarted);
    io.emit("online", onlineClients.size);
  }, 1000);
}

startServer();

// const http = require("http");
// const express = require("express");
// const cors = require("cors");
// const helmet = require("helmet");
// const socketio = require("socket.io");
// require("dotenv").config();

// const mongoose = require("mongoose");
// const userModel = require("./models/users.js");
// const messageModel = require("./models/messages.js");

// const SERVER_PORT = process.env.PORT || 4000;
// const URI = "MONGODB__URI";

// mongoose
//   .connect(URI, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useFindAndModify: false,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log("Connection successful to MongoDB"))
//   .catch((err) => console.log(err));
// let onlineUsers = {};
// let onlineUsersToSendToFrontend = [];

// function startServer() {
//   function onNewWebsocketConnection(socket) {
//     socket.on("disconnect", () => {
//       delete onlineUsers[socket.id];
//       onlineUsersToSendToFrontend = onlineUsersToSendToFrontend.filter(
//         (ele) => ele.socketid !== socket.id
//       );
//       io.emit("OnlineUsers", onlineUsersToSendToFrontend);
//     });
//     socket.on("initialize", (userid) => {
//       let key = socket.id;
//       onlineUsers[key] = userid;
//       onlineUsersToSendToFrontend.push({ socketid: key, userID: userid });
//       io.emit("OnlineUsers", onlineUsersToSendToFrontend);
//     });

//     socket.on("hello", (helloMsg) => {
//       console.info(`Socket ${socket.id} says: "${helloMsg}"`);
//       io.emit("test", "Hey guys this is working");
//     });
//     socket.on("messagesSent", (data) => {
//       messageModel
//         .create({
//           sentBy: data.sentBy,
//           sentTo: data.sentTo,
//           message: data.message,
//           imageUrl: "",
//           imageMediumUrl: "",
//           imageThumbUrl: "",
//           deleteURL: "",
//           sentTime: data.sentDate,
//           type: "Text",
//         })
//         .then((responseFromMongodb) => {
//           for (const key in onlineUsers) {
//             if (onlineUsers[key] === responseFromMongodb.sentTo) {
//               socket.to(key).emit("receivedMessages", responseFromMongodb);
//             } else if (onlineUsers[key] === responseFromMongodb.sentBy) {
//               io.to(key).emit("sentReceivedMessages", responseFromMongodb);
//             }
//           }
//         })
//         .catch((err) => console.log(err));
//     });
//   }

//   const app = express();
//   app.use(express.urlencoded({ extended: true }));
//   app.use(express.json());

//   app.use(cors());
//   app.use(helmet());
//   const server = http.createServer(app);
//   const io = socketio(server, { cors: { origin: "*" } });

//   app.post("/api/auth", (req, res) => {
//     const { name, googleId, email, tokenID, imageUrl } = req.body;
//     userModel.findOne({ email: email }).then((resFromMongodb) => {
//       if (resFromMongodb === null) {
//         userModel
//           .create({
//             name: name,
//             email: email,
//             password: "",
//             tokenID: tokenID,
//             googleID: googleId,
//             imageUrl: imageUrl,
//           })
//           .then((responseFromMongodb) => res.send(responseFromMongodb))
//           .catch((errFromMongodb) => res.send(errFromMongodb));
//       } else {
//         res.send(resFromMongodb);
//       }
//     });
//   });
//   app.post("/api/getUser", (req, res) => {
//     if (mongoose.isValidObjectId(req.body.id)) {
//       userModel.findOne({ _id: req.body.id }).then((responseFromMongodb) => {
//         if (responseFromMongodb !== null) {
//           res.send(responseFromMongodb);
//         } else {
//           res.send("NOT_FOUND");
//         }
//       });
//     } else {
//       res.send("NOT_FOUND");
//     }
//   });
//   app.post("/api/getfriends", (req, res) => {
//     userModel
//       .find({ _id: { $ne: req.body.id } })
//       .then((responseFromMongodb) => {
//         res.send(responseFromMongodb);
//       })
//       .catch((err) => {
//         console.log(err);
//       });
//   });

//   app.post("/api/getAllMessages", (req, res) => {
//     console.log(req.body);
//     messageModel
//       .find({
//         $or: [{ sentBy: req.body.id }, { sentTo: req.body.id }],
//       })
//       .then((responseFromMongodb) => {
//         console.log(responseFromMongodb);
//         res.send(responseFromMongodb);
//       })
//       .catch((err) => console.log(err));
//   });
//   app.use(express.static("public"));

//   io.on("connection", onNewWebsocketConnection);

//   server.listen(SERVER_PORT, () =>
//     console.info(`Listening on port ${SERVER_PORT}.`)
//   );

//   let secondsSinceServerStarted = 0;
//   setInterval(() => {
//     secondsSinceServerStarted++;
//     io.emit("seconds", secondsSinceServerStarted);
//     io.emit("online", onlineClients.size);
//   }, 1000);
// }

// startServer();
