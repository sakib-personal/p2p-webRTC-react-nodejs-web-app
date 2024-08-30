import React, { useCallback, useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { useSocket } from "../context/SocketProvider";
import peer from "../service/peer.js";

const ChatRoom = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [remoteUserEmail, setRemoteUserEmail] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteUserStream, setRemoteUserStream] = useState(null);

  const handleRoomJoined = useCallback(
    (data) => {
      console.log("Room:Joined Data: ", data);
      const { email, id } = data;
      setRemoteSocketId(id);
      setRemoteUserEmail(email);
    },
    [setRemoteSocketId, setRemoteUserEmail]
  );

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });

    setMyStream(stream);
  }, [socket, remoteSocketId, setMyStream]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      console.log("Incomming:call Data: ", from, offer);

      setRemoteSocketId(from);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      const answer = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, answer });
      setMyStream(stream);
    },
    [socket, setMyStream]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    async ({ from, answer }) => {
      console.log("call:accepted: ", from, answer);
      peer.setLocalDescription(answer);
      console.log("Call Accepted!!!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegotiationNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("p2p:nego-needed", { offer, to: remoteSocketId });
  }, [socket, remoteSocketId]);

  const handleNegotiationNeededIncommingReq = useCallback(
    async ({ from, offer }) => {
      const answer = await peer.getAnswer(offer);
      socket.emit("p2p:nego-answer", { to: from, answer });
    },
    [socket]
  );

  const handleNegotiationComplete = useCallback(async ({ answer }) => {
    await peer.setLocalDescription(answer);
  }, []);

  useEffect(() => {
    socket.on("room:joined", handleRoomJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);

    peer.peer.addEventListener("track", async (ev) => {
      const remoteUserStream = ev.streams;
      setRemoteUserStream(remoteUserStream[0]);
    });

    peer.peer.addEventListener("negotiationneeded", handleNegotiationNeeded);
    socket.on("p2p:nego-needed", handleNegotiationNeededIncommingReq);
    socket.on("p2p:nego-complete", handleNegotiationComplete);

    return () => {
      socket.off("room:joined", handleRoomJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      peer.peer.removeEventListener(
        "negotiationneeded",
        handleNegotiationNeeded
      );
      socket.off("p2p:nego-needed", handleNegotiationNeededIncommingReq);
      socket.off("p2p:nego-complete", handleNegotiationComplete);
    };
  }, [
    socket,
    handleRoomJoined,
    handleIncommingCall,
    handleCallAccepted,
    setRemoteUserStream,
    handleNegotiationNeeded,
    handleNegotiationNeededIncommingReq,
    handleNegotiationComplete,
  ]);

  return (
    <>
      <h1>Chat Room</h1>
      <h4>
        {remoteSocketId ? remoteUserEmail + " Connected" : "No one joined"}
      </h4>
      {remoteSocketId && <button onClick={handleCallUser}>CALL</button>}
      {myStream && <button onClick={sendStreams}>Accept Call</button>}
      {myStream && (
        <>
          <br />
          <br />
          Streams of All Connected Users
          <br />
          <br />
          <br />
          <ReactPlayer
            playing
            muted
            height="240px"
            width="480px"
            url={myStream}
          />
        </>
      )}
      {remoteUserStream && (
        <ReactPlayer
          playing
          muted
          height="80px"
          width="160px"
          url={remoteUserStream}
        />
      )}
    </>
  );
};

export default ChatRoom;
