import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { useSocket } from "../context/SocketProvider";
import peer from "../service/peer.js";
import { delay } from "../utilities/delay.js";

const ChatRoom = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [remoteUserEmail, setRemoteUserEmail] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteUserStream, setRemoteUserStream] = useState(null);
  const [displayAcceptCallBtn, setDisplayAcceptCallBtn] = useState(false);
  const isSendStreamsOnAcceptCall = useRef(false);
  const incommingCallOffer = useRef(null);
  const isNegotiator = useRef(false);
  const check = useRef(false);

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

    setMyStream(stream);
    isNegotiator.current = true;
    delay(10000);
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [socket, remoteSocketId, setMyStream]);

  const handleIncommingCall = useCallback(
    ({ from, offer }) => {
      console.log("Incomming:call Data: ", from, offer);

      setDisplayAcceptCallBtn(true);

      setRemoteSocketId(from);
      incommingCallOffer.current = offer;
    },
    [setDisplayAcceptCallBtn, setRemoteSocketId]
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
    isSendStreamsOnAcceptCall.current = true;
    delay(10000);
  }, [setMyStream]);

  const handleAcceptCall = useCallback(async () => {
    console.log(
      "Accept call Data: ",
      remoteSocketId,
      incommingCallOffer.current
    );
    isSendStreamsOnAcceptCall.current = false;

    const answer = await peer.getAnswer(incommingCallOffer.current);
    socket.emit("call:accept", { to: remoteSocketId, answer });
    sendStreams();
  }, [socket, remoteSocketId, sendStreams]);

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
    console.log("Negotiation Needed -> ", peer.peer.signalingState);
    if (!isNegotiator.current || peer.peer.signalingState !== "stable") return;
    // if (peer.peer.signalingState !== "stable") return;
    const offer = await peer.getOffer();
    socket.emit("p2p:nego-needed", { offer, to: remoteSocketId });
    console.log("Next to Negotiation Needed -> ", peer.peer.signalingState);
  }, [socket, remoteSocketId]);

  const handleNegotiationNeededIncommingReq = useCallback(
    async ({ from, offer }) => {
      console.log("Negotiation recieve -> ", peer.peer.signalingState);
      // if (peer.peer.signalingState !== "stable") return;
      const answer = await peer.getAnswer(offer);
      console.log("Next to Negotiation recieve -> ", peer.peer.signalingState);
      socket.emit("p2p:nego-answer", { to: from, answer });
    },
    [socket]
  );

  const handleNegotiationComplete = useCallback(
    async ({ from, answer }) => {
      console.log("Negotiation Done -> ", peer.peer.signalingState);
      // if (peer.peer.signalingState !== 'stable') return;
      await peer.setLocalDescription(answer);
      console.log("Next to Negotiation Done -> ", peer.peer.signalingState);
      socket.emit("p2p:stream-request", { to: from });
      if (check.current === false) {
        handleNegotiationNeeded();
        check.current = true;
      }
    },
    [socket, handleNegotiationNeeded]
  );

  const handleSendStreamRequest = useCallback(() => {
    console.log("Send Stream Request -> ", peer.peer.signalingState);
    console.log("Send Stream Request -> ", peer.peer.signalingState);
  }, []);

  useEffect(() => {
    if (myStream && isSendStreamsOnAcceptCall.current) {
      handleAcceptCall();
    }
  }, [handleAcceptCall, myStream]);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      console.log("addEventListener -> track");
      const [remoteUserStream] = ev.streams;
      console.log("remoteUserStream -> ", remoteUserStream);
      setRemoteUserStream(remoteUserStream);
    });
    return () => {
      peer.peer.removeEventListener("track", () => {});
    };
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
    return () => {
      socket.off("room:joined", handleRoomJoined);
    };
  }, [socket, handleRoomJoined]);

  useEffect(() => {
    socket.on("incomming:call", handleIncommingCall);
    return () => {
      socket.off("incomming:call", handleIncommingCall);
    };
  }, [socket, handleIncommingCall]);

  useEffect(() => {
    socket.on("call:accepted", handleCallAccepted);
    return () => {
      socket.off("call:accepted", handleCallAccepted);
    };
  }, [socket, handleCallAccepted]);

  useEffect(() => {
    socket.on("p2p:nego-needed1", handleNegotiationNeededIncommingReq);
    return () => {
      socket.off("p2p:nego-needed", handleNegotiationNeededIncommingReq);
    };
  }, [socket, handleNegotiationNeededIncommingReq]);

  useEffect(() => {
    socket.on("p2p:nego-complete", handleNegotiationComplete);
    return () => {
      socket.off("p2p:nego-complete", handleNegotiationComplete);
    };
  }, [socket, handleNegotiationComplete]);

  useEffect(() => {
    socket.on("p2p:send-stream-request", handleSendStreamRequest);
    return () => {
      socket.off("p2p:send-stream-request", handleSendStreamRequest);
    };
  }, [socket, handleSendStreamRequest]);

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
