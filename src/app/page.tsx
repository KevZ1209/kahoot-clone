"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { socket } from "../socket";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");

  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");

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
      setIsConnected(false);
      setTransport("N/A");
    }

    // runs when connected/disconnected to server.js
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  function joinGame() {
    // socket.emit("join-game", roomCode, username);
    socket.emit("create-game", [
      {
        question: "What is 2 + 2",
        correctAnswer: "4",
        incorrectAnswers: ["3", "2", "1"],
      },
      {
        question: "Which is a song by Ariana Grande",
        correctAnswer: "Bye",
        incorrectAnswers: ["Hi", "That Girl is Mine", "Gang gang gang"],
      },
    ]);
  }

  return (
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
  );
}
