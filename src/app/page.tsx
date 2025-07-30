"use client";

import { useEffect, useState } from "react";
import { socket } from "../socket";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");

  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");

  // "join" -> "waiting room" -> repeat("countdown, question, standings") -> "podium"
  const [page, setPage] = useState("join");

  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });
    }

    function onDisconnect() {
      // TODO: handle client disconnects
      setIsConnected(false);
      setTransport("N/A");
    }

    function onPlayerJoinedFailed(usernameMismatch: boolean) {
      if (usernameMismatch) {
        alert("That username has been taken already!");
      } else {
        alert("Room code is incorrect");
      }
    }

    function onPlayerJoined() {
      setPage("waiting room");
    }

    function onCountdown() {
      setPage("countdown");
    }

    socket.on("player-joined-failed", onPlayerJoinedFailed);
    socket.on("player-joined", onPlayerJoined);
    socket.on("next-countdown", onCountdown);
    // runs when connected/disconnected to server.js
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  function joinGame() {
    socket.emit("join-game", roomCode, username.trim());
  }

  return page === "join" ? (
    <div>
      <h1 className="text-2xl">Play a Kahoot-ish Game</h1>
      <p>{username}</p>
      <p>{roomCode}</p>
      <div className={isConnected ? "text-green-500" : "text-red-500"}>
        <p>Status: {isConnected ? "connected" : "disconnected"}</p>
        <p>Transport: {transport}</p>
      </div>
      <br></br>
      <input
        placeholder="enter code"
        onChange={(e) => setRoomCode(e.target.value)}
        // single source of truth
        value={roomCode}
      ></input>
      <input
        placeholder="enter your name"
        onChange={(e) => setUsername(e.target.value)}
        value={username}
      ></input>
      <button onClick={joinGame}>Join Game!</button>
    </div>
  ) : page === "waiting room" ? (
    <div>You have joined the game! Please wait for the game to start!</div>
  ) : page === "countdown" ? (
    <div>...Counting down...</div>
  ) : page === "question" ? (
    <div>
      <h1>Question: ...</h1>
      <button>Answer 1</button>
      <button>Answer 2</button>
      <button>Answer 3</button>
      <button>Answer 4</button>
    </div>
  ) : (
    <div>Error!</div>
  );
}
