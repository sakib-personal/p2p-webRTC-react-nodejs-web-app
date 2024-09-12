const express = require("express");
const dotenv = require("dotenv").config();
const { emailToSocketIdMap, socketIdToEmailMap } = require("./chatDetails");

const app = express();

const port = process.env.PORT || 5000;

app.get("/demo", (req, res) => {
  res.status(200).json({ message: "Demo API Response." });
});

app.listen(port, () => {
  console.log(`Backend started on port ${port}!!!`);
});

const { Server } = require("socket.io");

const io = new Server(process.env.SOCKET_PORT, {
  cors: true,
});

io.on("connection", (socket) => {
  console.log(`Socket connected to ${socket.id}!!!`);
  socket.on("room:join", (data) => {
    const { email, room } = data;
    console.log("Email: ", email);
    console.log("Room: ", room);

    emailToSocketIdMap.set(email, socket.id);
    socketIdToEmailMap.set(socket.id, email);

    io.to(room).emit("room:joined", { email, id: socket.id });
    socket.join(room);

    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accept", ({ to, answer }) => {
    io.to(to).emit("call:accepted", { from: socket.id, answer });
  });

  socket.on("p2p:nego-needed", ({ to, offer }) => {
    io.to(to).emit("p2p:nego-needed1", { from: socket.id, offer });
  });

  socket.on("p2p:nego-answer", ({ to, answer }) => {
    io.to(to).emit("p2p:nego-complete", { from: socket.id, answer });
  });

  socket.on("p2p:stream-request", ({ to }) => {
    io.to(to).emit("p2p:send-stream-request");
  });
});
