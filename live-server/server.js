const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("user connected");

  socket.on("join_match", (id) => {
    socket.join(id);
  });
});

setInterval(() => {
  io.to("match_1").emit("match_event", {
    type: "goal",
    team: "Brazil",
    minute: Math.floor(Math.random() * 90),
  });
}, 5000);

server.listen(3001, () => console.log("server running"));
