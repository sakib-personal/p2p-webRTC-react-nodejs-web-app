const express = require("express");
const dotenv = require("dotenv").config();

const app = express();

const port = process.env.PORT || 5000;

app.get("/api/demo", (req, res) => {
  res.status(200).json({ message: "Demo API Response." });
});

app.listen(port, () => {
  console.log(`Backend started on port ${port}!!!`);
});

const { Server } = require("socket.io");

const io = new Server(process.env.SOCKET_PORT, {
  cors: true,
});

const emailToSocketIdMap = new Map();
const SocketIdToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket connected to ${socket.id}!!!`);
  socket.on("room:join", (data) => {
    const { email, room } = data;
    console.log("Email: ", email);
    console.log("Room: ", room);

    emailToSocketIdMap.set(email, socket.id);
    SocketIdToEmailMap.set(socket.id, email);

    io.to(room).emit("room:joined", { email, id: socket.id });
    socket.join(room);

    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, answer }) => {
    io.to(to).emit("call:accepted", { from: socket.id, answer });
  });

  socket.on("p2p:nego-needed", ({ to, offer }) => {
    io.to(to).emit("p2p:nego-needed", { from: socket.id, offer });
  });

  socket.on("p2p:nego-answer", ({ to, answer }) => {
    io.to(to).emit("p2p:nego-complete", { from: socket.id, answer });
  });
});
