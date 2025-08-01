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

interface AnswerDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
}

let gameCodeGlobal = "";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const [gameStarted, setGameStarted] = useState(false);
  const [loadingNextQuestion, setLoadingNextQuestion] = useState(false);

  // example: [{"question":"What is 2 + 2","correctAnswer":"4","incorrectAnswers":["3","2","1"]},{"question":"Which is a song by Ariana Grande","correctAnswer":"Bye","incorrectAnswers":["Hi","gang gang","integem"]}]
  const [gameData, setGameData] = useState("");

  // "create" -> "waiting room" -> {"question", "player standings"} -> "podium"
  const [page, setPage] = useState("create");

  const [roomCode, setRoomCode] = useState("");

  const [playersList, setPlayersList] = useState<Array<string>>([]);

  const [countdown, setCountdown] = useState(0);

  const [questionCountdown, setQuestionCountdown] = useState(0);

  const [currQuestion, setCurrQuestion] = useState("");

  const [answerDistributionData, setAnswerDistributionData] =
    useState<AnswerDistribution>({
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    });

  const [topTenNames, setTopTenNames] = useState<Array<string>>([]);

  const [topTenScores, setTopTenScores] = useState<Array<number>>([]);

  const [originalQuestion, setOriginalQuestion] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");

  const [progress, setProgress] = useState("");

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
      gameCodeGlobal = roomCode;
      setPage("waiting room");
    }

    function onPlayerJoined(username: string) {
      console.log(username + " joined the room!");
      setPlayersList((prevPlayersList) => [...prevPlayersList, username]);
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

    function onQuestion(
      curr_question_data: QuestionData,
      currNumQuestion: number,
      totalNumQuestions: number
    ) {
      setLoadingNextQuestion(false);
      setCurrQuestion(curr_question_data["question"]);
      setProgress(
        "Question " + (currNumQuestion + 1) + " out of " + totalNumQuestions
      );
      setPage("question");
    }

    function onShowStandings(
      answerDistribution: AnswerDistribution,
      sortedNames: string[],
      sortedScores: number[],
      correctLetter: string,
      correctAnswer: string,
      originalQuestion: string
    ) {
      setAnswerDistributionData(answerDistribution);
      setTopTenNames(sortedNames.slice(0, 10));
      setTopTenScores(sortedScores.slice(0, 10));
      setOriginalQuestion(originalQuestion);
      setCorrectAnswer(correctLetter + ": " + correctAnswer);
      setPage("player standings");
    }

    function onShowEndPage() {
      setPage("end page");
      socket.emit("delete-room", gameCodeGlobal);
    }
    socket.on("game-created", onCreateGame);
    socket.on("player-joined", onPlayerJoined);
    socket.on("player-left", onPlayerLeft);
    socket.on("countdown", onCountdown);
    socket.on("question", onQuestion);
    socket.on("show-standings", onShowStandings);
    socket.on("show-end-page", onShowEndPage);
    socket.on("question-countdown", (count) => setQuestionCountdown(count));

    // runs when connected/disconnected to server.js
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  function onStartClicked() {
    setGameStarted(true);
    socket.emit("next-question", roomCode);
  }
  function onNextClicked() {
    setLoadingNextQuestion(true);
    socket.emit("next-question", roomCode);
  }

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
    <div className="text-xl mt-10 text-center">
      <h1 className="text-3xl mb-4">Waiting for Players...</h1>

      <h2 className="text-5xl mb-4">
        Join Code: <span className="font-bold text-6xl">{roomCode}</span>
      </h2>

      <h2 className="text-4xl mb-4">Players</h2>

      <div className="flex flex-wrap gap-4 max-w-2xl justify-center mx-auto mb-4 text-2xl">
        {playersList.length > 0 ? (
          playersList.map((username, index) => (
            <div
              key={index}
              className="border-1 border-gray-500 py-2 rounded-md w-50 overflow-x-clip"
            >
              {username}
            </div>
          ))
        ) : (
          <div>Waiting...</div>
        )}
      </div>

      {gameStarted === false ? (
        <button
          className="text-lg mt-4 p-3 rounded-md border-1 hover:opacity-75"
          onClick={onStartClicked}
        >
          Start Game!
        </button>
      ) : (
        <div className="inline text-lg mt-4 p-3 rounded-md border-1 hover:opacity-75">
          ...Starting game...
        </div>
      )}
    </div>
  ) : page === "countdown" ? (
    <div className="text-center text-3xl mt-20">...{countdown}...</div>
  ) : page === "question" ? (
    <div className="text-xl mt-10 text-center ">
      <h3 className="text-2xl mb-8">{progress}</h3>
      <h1 className="text-2xl">The question is...</h1>
      <h2 className="text-5xl mb-16">{currQuestion}</h2>
      <h3 className="text-3xl">Remaining Time: {questionCountdown}</h3>
    </div>
  ) : page === "player standings" ? (
    <div className="text-2xl mt-10 text-center">
      <h1>
        <span className="font-bold">Question:</span> {originalQuestion}
      </h1>
      <h2 className="font-bold">Answer:</h2>
      <h1> {correctAnswer}</h1>
      <br></br>
      <h1 className="font-bold text-3xl">Answer Distributions...</h1>
      <h2 className="text-2xl">
        <span className="font-bold text-3xl">A:</span>{" "}
        {answerDistributionData["A"]} response(s)
      </h2>
      <h2>
        <span className="font-bold text-3xl">B:</span>{" "}
        {answerDistributionData["B"]} response(s)
      </h2>
      <h2>
        {" "}
        <span className="font-bold text-3xl">C:</span>{" "}
        {answerDistributionData["C"]} response(s)
      </h2>
      <h2>
        {" "}
        <span className="font-bold text-3xl">D:</span>{" "}
        {answerDistributionData["D"]} response(s)
      </h2>

      <h1 className="font-bold text-3xl mt-8">Player Standings (Top 5):</h1>
      {topTenNames.slice(0, 5).map((name, index) => (
        <h3 className="text-2xl" key={index}>
          {index + 1}. {name} ---{" "}
          <span className="font-bold">{topTenScores[index]}</span>
        </h3>
      ))}
      {loadingNextQuestion === false ? (
        <button
          onClick={onNextClicked}
          className="text-lg mt-4 p-3 rounded-md border-1 hover:opacity-75"
        >
          Next!
        </button>
      ) : (
        <div>...Loading...</div>
      )}
    </div>
  ) : page === "end page" ? (
    // TODO: tell server to delete game state!
    <div className="text-4xl mt-10 text-center">
      <h2 className="text-6xl mb-8">
        <span className="font-bold">1st Place: </span>
        {topTenNames.length >= 1 && topTenNames[0]} ---{" "}
        {topTenScores.length >= 1 && topTenScores[0]}
      </h2>
      <h2 className="text-[3.5rem] mb-8">
        <span className="font-bold">2nd Place: </span>
        {topTenNames.length >= 2 && topTenNames[1]} ---{" "}
        {topTenScores.length >= 2 && topTenScores[1]}
      </h2>
      <h2 className="text-5xl mb-8">
        <span className="font-bold">3rd Place: </span>
        {topTenNames.length >= 3 && topTenNames[2]} ---{" "}
        {topTenScores.length >= 3 && topTenScores[2]}
      </h2>
    </div>
  ) : (
    <div>Error!</div>
  );
}
