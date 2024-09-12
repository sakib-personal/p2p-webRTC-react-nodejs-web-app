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
  const [displayAcceptCallBtn, setDisplayAcceptCallBtn] = useState(false);
  const [isSendStreamsOnAcceptCall, setIsSendStreamsOnAcceptCall] =
    useState(false);
  const [incommingCallOffer, setIncommingCallOffer] = useState(null);
  const [isNegotiator, setIsNegotiator] = useState(false);

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
    setIsNegotiator(true);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });

    setMyStream(stream);
  }, [setIsNegotiator, socket, remoteSocketId, setMyStream]);

  const handleIncommingCall = useCallback(
    ({ from, offer }) => {
      console.log("Incomming:call Data: ", from, offer);

      setDisplayAcceptCallBtn(true);

      setRemoteSocketId(from);
      setIncommingCallOffer(offer);//to do
    },
    [setDisplayAcceptCallBtn, setIncommingCallOffer, setRemoteSocketId]
  );

  const sendStreams = useCallback(() => {
    console.log("Accepted: ", myStream);
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleBrowserPermission = useCallback(async () => {
    console.log("Browser permission check");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    setIsSendStreamsOnAcceptCall(true);
  }, [setMyStream, setIsSendStreamsOnAcceptCall]);

  const handleAcceptCall = useCallback(async () => {
    console.log("Accept call Data: ", remoteSocketId, incommingCallOffer);
    setIsSendStreamsOnAcceptCall(false);

    const answer = await peer.getAnswer(incommingCallOffer);
    socket.emit("call:accept", { to: remoteSocketId, answer });
    sendStreams();
  }, [socket, incommingCallOffer, sendStreams, remoteSocketId]);

  const handleCallAccepted = useCallback(
    async ({ from, answer }) => {
      console.log("call:accepted: ", from, answer, myStream, answer);
      peer.setLocalDescription(answer);
      console.log("Call Accepted!!!");
      sendStreams();
    },
    [sendStreams, myStream]
  );

  const handleNegotiationNeeded = useCallback(async () => {
    console.log("Negotiation Needed -> ", peer.peer.signalingState);
    if (!isNegotiator || peer.peer.signalingState !== "stable") return;
    //if (peer.peer.signalingState !== "stable") return;
    const offer = await peer.getOffer();
    socket.emit("p2p:nego-needed", { offer, to: remoteSocketId });
    console.log("Next to Negotiation Needed -> ", peer.peer.signalingState);
  }, [isNegotiator, socket, remoteSocketId]);

  const handleNegotiationNeededIncommingReq = useCallback(
    async ({ from, offer }) => {
      console.log("Negotiation recieve -> ", peer.peer.signalingState);
      //if (peer.peer.signalingState !== "have-local-offer") return;
      const answer = await peer.getAnswer(offer);
      console.log("Next to Negotiation recieve -> ", peer.peer.signalingState);
      socket.emit("p2p:nego-answer", { to: from, answer });
    },
    [socket]
  );

  const handleNegotiationComplete = useCallback(async ({ answer }) => {
    console.log("Negotiation Done -> ", peer.peer.signalingState);
    //if (peer.peer.signalingState !== 'have-remote-offer') return;
    await peer.setLocalDescription(answer);
    console.log("Next to Negotiation Done -> ", peer.peer.signalingState);
  }, []);

  useEffect(() => {
    if (myStream && isSendStreamsOnAcceptCall) {
      handleAcceptCall();
    }
  }, [isSendStreamsOnAcceptCall, handleAcceptCall, myStream]);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteUserStream = ev.streams;
      setRemoteUserStream(remoteUserStream[0]);
    });
    return () => {};
  }, [setRemoteUserStream]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegotiationNeeded);
    return () => {
      peer.peer.removeEventListener(
        "negotiationneeded",
        handleNegotiationNeeded
      );
    };
  }, [handleNegotiationNeeded]);

  useEffect(() => {
    socket.on("room:joined", handleRoomJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("p2p:nego-needed1", handleNegotiationNeededIncommingReq);
    socket.on("p2p:nego-complete", handleNegotiationComplete);
    return () => {
      socket.off("room:joined", handleRoomJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("p2p:nego-needed", handleNegotiationNeededIncommingReq);
      socket.off("p2p:nego-complete", handleNegotiationComplete);
    };
  }, [
    socket,
    handleRoomJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegotiationNeededIncommingReq,
    handleNegotiationComplete,
  ]);

  return (
    <>
      <h1>Chat Room</h1>
      <h4>
        {remoteSocketId ? remoteUserEmail + " Connected" : "No one joined"}
      </h4>
      {remoteSocketId && !displayAcceptCallBtn && (
        <button onClick={handleCallUser}>CALL</button>
      )}
      {remoteSocketId && displayAcceptCallBtn && (
        <button onClick={handleBrowserPermission}>Accept Call</button>
      )}
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
