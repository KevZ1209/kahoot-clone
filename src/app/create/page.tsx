"use client";

import { useEffect, useState } from "react";
import { socket } from "../../socket";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");

  // example: [{"question":"What is 2 + 2","correctAnswer":"4","incorrectAnswers":["3","2","1"]},{"question":"Which is a song by Ariana Grande","correctAnswer":"Bye","incorrectAnswers":["Hi","gang gang","integem"]}]
  const [gameData, setGameData] = useState("");

  // "create" -> "waiting room" -> {"question", "player standings"} -> "podium"
  const [page, setPage] = useState("create");

  const [roomCode, setRoomCode] = useState("");

  const [playersList, setPlayersList] = useState<Array<string>>([]);

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

    function onCreateGame(roomCode: string) {
      setRoomCode(roomCode);
      setPage("waiting room");
    }

    function onPlayerJoined(username: string) {
      console.log(username + " joined the room!");
      setPlayersList((prevPlayersList) => [...prevPlayersList, username]);
    }

    function onStartGame() {
      setPage("game loop");
    }

    socket.on("game-created", onCreateGame);
    socket.on("player-joined", onPlayerJoined);

    // runs when connected/disconnected to server.js
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return page === "create" ? (
    <div>
      <div className={isConnected ? "text-green-500" : "text-red-500"}>
        <p>Status: {isConnected ? "connected" : "disconnected"}</p>
        <p>Transport: {transport}</p>
      </div>

      <textarea
        placeholder="enter game data"
        onChange={(e) => setGameData(e.target.value)}
        value={gameData}
      ></textarea>
      <br></br>
      <button onClick={() => socket.emit("create-game", gameData)}>
        Create Game!
      </button>
    </div>
  ) : page === "waiting room" ? (
    <div>
      <h1 className="text-3xl">Waiting for Players...</h1>
      <h2 className="text-2xl">Join Code: {roomCode}</h2>
      {playersList.map((username, index) => (
        <div key={index}>{username}</div>
      ))}
      <button className="border-2">Start Game!</button>
    </div>
  ) : (
    <div>Error!</div>
  );
}
