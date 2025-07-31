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

  const [answerDistributionData, setAnswerDistributionData] = useState({});

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

    socket.on("game-created", onCreateGame);
    socket.on("player-joined", onPlayerJoined);
    socket.on("player-left", onPlayerLeft);
    socket.on("countdown", onCountdown);
    socket.on("question", onQuestion);
    socket.on("show-standings", onShowStandings);
    socket.on("show-end-page", () => setPage("end page"));
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
    <div>
      <h1 className="text-3xl">Waiting for Players...</h1>
      <h2 className="text-2xl">Join Code: {roomCode}</h2>
      {playersList.map((username, index) => (
        <div key={index}>{username}</div>
      ))}

      {gameStarted === false ? (
        <button className="border-2" onClick={onStartClicked}>
          Start Game!
        </button>
      ) : (
        <div>...Starting game...</div>
      )}
    </div>
  ) : page === "countdown" ? (
    <div>...{countdown}...</div>
  ) : page === "question" ? (
    <div>
      <h3>{progress}</h3>
      <h1>The question is...</h1>
      <h2>{currQuestion}</h2>
      <h3>Remaining Time: {questionCountdown}</h3>
    </div>
  ) : page === "player standings" ? (
    <div>
      <h1>Question: {originalQuestion}</h1>
      <h2>The correct answer was:</h2>
      <h1> {correctAnswer}</h1>
      <h1>Player Standings...</h1>
      <p>{JSON.stringify(answerDistributionData)}</p>
      <p>{topTenNames}</p>
      <p>{topTenScores}</p>

      {loadingNextQuestion === false ? (
        <button onClick={onNextClicked}>Next!</button>
      ) : (
        <div>...Loading...</div>
      )}
    </div>
  ) : page === "end page" ? (
    <div>
      <h1>Congrats to the Top 3!</h1>
      <h2>
        1st Place: {topTenNames.length >= 1 && topTenNames[0]} - - -{" "}
        {topTenScores.length >= 1 && topTenScores[0]}
      </h2>
      <h2>
        2nd Place: {topTenNames.length >= 2 && topTenNames[1]} - - -{" "}
        {topTenScores.length >= 2 && topTenScores[1]}
      </h2>
      <h2>
        3rd Place: {topTenNames.length >= 3 && topTenNames[2]} - - -{" "}
        {topTenScores.length >= 3 && topTenScores[2]}
      </h2>
    </div>
  ) : (
    <div>Error!</div>
  );
}
