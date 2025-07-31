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

let prevScore = 0;
let currScore = 0;
let currChoiceLetter = "";
let currCorrectChoice = "";
let currChoiceValue = "";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");

  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");
  const [statusText, setStatusText] = useState("");

  // "join" -> "waiting room" -> repeat("countdown, question, player standings") -> "podium"
  const [page, setPage] = useState("join");

  const [countdown, setCountdown] = useState(0);

  const [currAnswerChoices, setCurrAnswerChoices] = useState<Array<string>>([]);

  const [currRanking, setCurrRanking] = useState(0);
  // const [currScore, setCurrScore] = useState(0);

  // const [currChoiceValue, setCurrChoiceValue] = useState("N/A");

  // const [currCorrectChoice, setCurrCorrectChoice] = useState("");

  // const [prevScore, setPrevScore] = useState(0);

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

    function onPlayerJoined() {
      setPage("waiting room");
    }

    function onPlayerJoinedFailed(usernameMismatch: boolean) {
      if (usernameMismatch) {
        setStatusText("That username has been taken already!");
      } else {
        setStatusText("Room code is incorrect");
      }
    }

    function onCountdown(count: number) {
      setPage("countdown");
      setCountdown(count);
    }

    function onQuestion(
      question_data: QuestionData,
      currNumQuestion: number,
      totalNumQuestions: number
    ) {
      currChoiceValue = "N/A";
      currChoiceLetter = "N/A";
      setCurrAnswerChoices([
        question_data["A"],
        question_data["B"],
        question_data["C"],
        question_data["D"],
      ]);
      prevScore = currScore;
      setPage("question");
    }

    function onPlayerAnswered() {
      setPage("waiting");
    }

    function onShowStandings(
      answerDistribution: AnswerDistribution,
      sortedNames: string[],
      sortedScores: number[],
      correctLetter: string,
      correctAnswer: string,
      originalQuestion: string
    ) {
      const player_index = sortedNames.indexOf(username.trim());
      setCurrRanking(player_index + 1);
      currScore = sortedScores[player_index];
      currCorrectChoice = correctLetter;
      setPage("player standings");
    }

    socket.on("player-joined-failed", onPlayerJoinedFailed);
    socket.on("player-joined", onPlayerJoined);
    socket.on("countdown", onCountdown);
    socket.on("question", onQuestion);
    socket.on("player-answered", onPlayerAnswered);
    socket.on("show-standings", onShowStandings);
    socket.on("show-end-page", () => setPage("end page"));

    // runs when connected/disconnected to server.js
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [username]);

  function joinGame() {
    if (username.trim().length < 3) {
      setStatusText("Username needs to be at least 3 characters");
      return;
    }
    socket.emit("join-game", roomCode, username.trim());
  }

  return page === "join" ? (
    <div>
      <div className={isConnected ? "text-green-500" : "text-red-500"}>
        <p>
          Status:{" "}
          {isConnected && transport === "websocket"
            ? "connected"
            : "disconnected"}
        </p>
      </div>
      <div className="text-center">
        <h1 className="text-2xl">Join a QuizHoot!</h1>
        <br></br>
        <input
          placeholder="enter code"
          maxLength={4}
          onChange={(e) => setRoomCode(e.target.value)}
          className="text-xl border-1 rounded-md p-2 mb-4"
          // single source of truth
          value={roomCode}
        ></input>
        <br></br>
        <input
          placeholder="enter your name"
          maxLength={20}
          onChange={(e) => setUsername(e.target.value)}
          value={username}
          className="text-xl border-1 rounded-md p-2"
        ></input>
        <div className="text-red-500">{statusText}</div>
        <button
          onClick={joinGame}
          className="text-lg mt-4  p-3 rounded-md border-1 hover:opacity-75"
        >
          Join Game!
        </button>
      </div>
    </div>
  ) : page === "waiting room" ? (
    <div className="text-xl mt-10 text-center">
      <h1>
        Hello <span className="font-bold text-2xl">{username.trim()}</span>!
      </h1>
      <h1>
        You have joined game{" "}
        <span className="font-bold text-2xl">{roomCode}</span>
      </h1>

      <h1>Waiting for the game to start...</h1>
    </div>
  ) : page === "countdown" ? (
    <div className="text-center text-3xl mt-20">...{countdown}...</div>
  ) : page === "question" ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto h-full mt-4">
      {currAnswerChoices.map((answerChoice, index) => (
        <button
          key={ANSWER_CHOICES[index]}
          className="flex items-center justify-center md:py-20 py-4
                rounded-md
                text-4xl border-1 hover:bg-blue-500
                "
          onClick={() => {
            currChoiceLetter = ANSWER_CHOICES[index];
            currChoiceValue = answerChoice;

            // emits "player-answer" with room code, username, and choice
            socket.emit(
              "player-answer",
              roomCode,
              username.trim(),
              ANSWER_CHOICES[index]
            );
          }}
        >
          {ANSWER_CHOICES[index]}: {answerChoice}
        </button>
      ))}
    </div>
  ) : page === "player standings" ? (
    <div className="text-xl mt-10 text-center">
      {currChoiceLetter === currCorrectChoice ? (
        <div>
          <h1 className="text-2xl text-green-500">Correct!</h1>
          <h2 className="text-3xl text-green-500">
            +{currScore - prevScore} points
          </h2>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl text-red-500">Incorrect!</h1>
          <h2 className="text-3xl text-red-500">+0 points</h2>
        </div>
      )}
      <h2 className="text-2xl">You selected: </h2>
      <h3>
        {currChoiceLetter}: {currChoiceValue}
      </h3>
      <h1 className="text-lg">
        Your ranking is:{" "}
        <span className="font-bold text-2xl">#{currRanking}</span>
      </h1>
      <h2 className="text-lg">
        With a score of <span className="font-bold text-2xl">{currScore}</span>
      </h2>
    </div>
  ) : page === "waiting" ? (
    <div className="text-2xl mt-10 text-center">
      <h1 className="text-3xl">Waiting...</h1>
      <h2>You selected: </h2>
      <h3>
        {currChoiceLetter}: {currChoiceValue}
      </h3>
    </div>
  ) : page === "end page" ? (
    <div className="text-xl mt-10 text-center">
      <h1 className="text-2xl">
        Your final ranking is: <span className="font-bold">#{currRanking}</span>
      </h1>
      <h2>
        With a score of: <span className="font-bold">{currScore}</span>
      </h2>
    </div>
  ) : (
    <div>Error!</div>
  );
}
