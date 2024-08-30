import React, { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router-dom";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleFromSubmission = useCallback(
    (e) => {
      e.preventDefault();
      console.log("Submitted!");
      console.log("Email: ", email);
      console.log("Room: ", room);

      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      console.log("Room:Join Data: ", data);
      const { room } = data;
      navigate(`/chat-room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <>
      <h1>Lobby</h1>
      <form onSubmit={handleFromSubmission}>
        <label htmlFor="email">Email</label>&nbsp;
        <input
          type="email"
          id="email"
          placeholder="demo@xyz.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <label htmlFor="room">Room Number</label>&nbsp;
        <input
          type="number"
          id="room"
          placeholder="1"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <br />
        <button>Join</button>
      </form>
    </>
  );
};

export default LobbyScreen;
