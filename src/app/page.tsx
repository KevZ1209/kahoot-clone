"use client";

import { useEffect, useState } from "react";
import { socket } from "../socket";

interface QuestionData {
  question: string;
  A: string;
  B: string;
  C: string;
  D: string;
}

interface AnswerDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
}

const ANSWER_CHOICES = ["A", "B", "C", "D"];

function shuffleArray(array: number[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Pick a random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");

  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");

  // "join" -> "waiting room" -> repeat("countdown, question, player standings") -> "podium"
  const [page, setPage] = useState("join");

  const [countdown, setCountdown] = useState(0);

  const [currAnswerChoices, setCurrAnswerChoices] = useState<Array<string>>([]);

  const [currRanking, setCurrRanking] = useState(0);
  const [currScore, setCurrScore] = useState(0);

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

    function onCountdown(count: number) {
      setPage("countdown");
      setCountdown(count);
    }

    function onQuestion(question_data: QuestionData) {
      setCurrAnswerChoices([
        question_data["A"],
        question_data["B"],
        question_data["C"],
        question_data["D"],
      ]);

      setPage("question");
    }

    function onShowStandings(
      answerDistribution: AnswerDistribution,
      sortedNames: string[],
      sortedScores: number[]
    ) {
      const player_index = sortedNames.indexOf(username);
      setCurrRanking(player_index + 1);
      setCurrScore(sortedScores[player_index]);
      setPage("player standings");
    }

    socket.on("player-joined-failed", onPlayerJoinedFailed);
    socket.on("player-joined", onPlayerJoined);
    socket.on("countdown", onCountdown);
    socket.on("question", onQuestion);
    socket.on("player-answered", () => setPage("waiting"));
    socket.on("show-standings", onShowStandings);

    // runs when connected/disconnected to server.js
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [username]);

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
    <div>...{countdown}...</div>
  ) : page === "question" ? (
    <div>
      {currAnswerChoices.map((answerChoice, index) => (
        <button
          key={ANSWER_CHOICES[index]}
          onClick={() => {
            // emits "player-answer" with room code, username, and choice
            socket.emit(
              "player-answer",
              roomCode,
              username.trim(),
              ANSWER_CHOICES[index]
            );
          }}
        >
          {answerChoice}
        </button>
      ))}
    </div>
  ) : page === "player standings" ? (
    <div>
      <h1>Your ranking is: #{currRanking}</h1>
      <h2>With a score of {currScore}</h2>
    </div>
  ) : page === "waiting" ? (
    <div>Waiting...</div>
  ) : (
    <div>Error!</div>
  );
}
