"use client";

import { useEffect, useState } from "react";
import { socket } from "../socket";

interface QuestionData {
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
}

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

  // "join" -> "waiting room" -> repeat("countdown, question, standings") -> "podium"
  const [page, setPage] = useState("join");

  const [countdown, setCountdown] = useState(0);

  const [currChoice, setCurrChoice] = useState();

  const [currAnswerChoices, setCurrAnswerChoices] = useState<Array<string>>([]);

  const [answerOrder, setAnswerOrder] = useState<Array<number>>([]);

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

    function onQuestion(curr_question_data: QuestionData) {
      // only show answer choices
      const correctAnswer = curr_question_data["correctAnswer"];
      const incorrectAnswers = curr_question_data["incorrectAnswers"];

      // correct answer is always choice A
      setCurrAnswerChoices([correctAnswer, ...incorrectAnswers]);

      setAnswerOrder(shuffleArray([0, 1, 2, 3]));

      setPage("question");
    }

    socket.on("player-joined-failed", onPlayerJoinedFailed);
    socket.on("player-joined", onPlayerJoined);
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
      {answerOrder.map((answerChoice) => (
        <button
          key={answerChoice}
          onClick={() => {
            // emits "player-answer" with room code, username, and whether the answer was correct or not
            socket.emit(
              "player-answer",
              roomCode,
              username.trim(),
              answerChoice === 0
            );
          }}
        >
          {currAnswerChoices[answerChoice]}
        </button>
      ))}
    </div>
  ) : (
    <div>Error!</div>
  );
}
