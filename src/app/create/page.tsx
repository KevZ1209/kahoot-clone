"use client";

import { useEffect, useState } from "react";
import { socket } from "../../socket";

interface QuestionData {
  question: string;
  A: string;
  B: string;
  C: string;
  D: string;
}

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");

  // example: [{"question":"What is 2 + 2","correctAnswer":"4","incorrectAnswers":["3","2","1"]},{"question":"Which is a song by Ariana Grande","correctAnswer":"Bye","incorrectAnswers":["Hi","gang gang","integem"]}]
  const [gameData, setGameData] = useState("");

  // "create" -> "waiting room" -> {"question", "player standings"} -> "podium"
  const [page, setPage] = useState("create");

  const [roomCode, setRoomCode] = useState("");

  const [playersList, setPlayersList] = useState<Array<string>>([]);

  const [countdown, setCountdown] = useState(0);

  const [currQuestion, setCurrQuestion] = useState("");

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

    function onPlayerLeft(username: string) {
      setPlayersList((prevPlayersList) =>
        prevPlayersList.filter((player) => player !== username)
      );
    }

    function onCountdown(count: number) {
      setPage("countdown");
      setCountdown(count);
    }

    function onQuestion(curr_question_data: QuestionData) {
      setCurrQuestion(curr_question_data["question"]);
      setPage("question");
    }

    socket.on("game-created", onCreateGame);
    socket.on("player-joined", onPlayerJoined);
    socket.on("player-left", onPlayerLeft);
    socket.on("countdown", onCountdown);
    socket.on("question", onQuestion);

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
      <button
        className="border-2"
        onClick={() => socket.emit("next-question", roomCode)}
      >
        Start Game!
      </button>
    </div>
  ) : page === "countdown" ? (
    <div>...{countdown}...</div>
  ) : page === "question" ? (
    <div>
      <h1>The question is...</h1>
      <h2>{currQuestion}</h2>
    </div>
  ) : page === "player standings" ? (
    <div>Player Standings...</div>
  ) : (
    <div>Error!</div>
  );
}
