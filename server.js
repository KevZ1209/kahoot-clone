import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const QUESTION_TIME = 30
const POINTS_POSSIBLE = 1000

let gamesStates = {

}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Pick a random index from 0 to i
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

function calculateScore(elapsed_milliseconds) {
  const elapsed_seconds = elapsed_milliseconds / 1000
  if (elapsed_milliseconds <= 500) {
    return POINTS_POSSIBLE
  }
  return Math.round((1 - (elapsed_seconds / QUESTION_TIME) / 2) * POINTS_POSSIBLE)
}


app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  // runs every time a client connects to the socket
  io.on("connection", (socket) => {
    console.log(socket.id)

    // after user types game code and enters valid username
    socket.on("join-game", (roomCode, username) => {
      console.log(roomCode, username)

      // only join room if it's a room that exists
      if (roomCode in gamesStates) {
        // check if username is taken
        if (username in gamesStates[roomCode]["players"]) {
          // if username is taken, kick user back to home page
          console.log("Duplicate username error!")
          socket.emit("player-joined-failed", true)
          return
        }

        // create new player data and have player join that socketio room
        socket.join(roomCode)
        console.log("Player joined room " + roomCode)
        const newPlayerData = {
          score: 0,
          numCorrect: 0
        }
        gamesStates[roomCode]["players"][username] = newPlayerData
        // broadcast to admin that player has joined
        console.log("broadcasting player-joined")
        io.to(roomCode).emit("player-joined", username)
        console.log(gamesStates)
      }
      else {
        console.log("Room code incorrect!")
        socket.emit("player-joined-failed", false)
        return
      }
    })

    // admin stuff
    socket.on("create-game", (questionData) => {
      const parsedQuestionData = JSON.parse(questionData)
      // parse questionData to see if it parses

      let randomNumber = Math.floor(Math.random() * (10000));
      let roomCode = String(randomNumber).padStart(4, '0');
      while (roomCode in gamesStates) {
        roomCode = String(Math.floor(Math.random() * (10000)).padStart(4, '0'))
      }

      // join socketio room
      socket.join(roomCode)

      gamesStates[roomCode] = { "players": {}, "questions": null, "question_number": 0 }

      // add room to gamesStates
      gamesStates[roomCode]["questions"] = parsedQuestionData

      console.log(gamesStates)
      socket.emit("game-created", roomCode)

    })

    socket.on("skip-question", (room) => {
      gamesStates[room]["skip"] = true
    })

    socket.on("next-question", (room) => {
      gamesStates[room]["skip"] = false
      const totalNumQuestions = gamesStates[room]["questions"].length
      const currNumQuestion = gamesStates[room]["question_number"]

      if (currNumQuestion >= totalNumQuestions) {
        io.to(room).emit("show-end-page")
        return
      }

      gamesStates[room]["answer_distribution"] = {
        "A": 0,
        "B": 0,
        "C": 0,
        "D": 0
      }
      let countdown_seconds = 3
      gamesStates[room]["countdown1"] = setInterval(() => {
        if (countdown_seconds > 0) {
          io.to(room).emit("countdown", countdown_seconds);
          countdown_seconds--;
        } else {
          clearInterval(gamesStates[room]["countdown1"]);
          const curr_question_num = gamesStates[room]["question_number"]
          const curr_question_data = gamesStates[room]["questions"][curr_question_num]

          // send over something in the format:
          // { A: "Answer 1", B: "Answer 2", C: "Answer 3", D: "Answer 4"}
          const answer_letters = shuffleArray(["A", "B", "C", "D"])
          const question_data = {}
          const incorrect_answers = curr_question_data["incorrectAnswers"]
          const correct_answer = curr_question_data["correctAnswer"]
          const answer_vals = [correct_answer, ...incorrect_answers]

          for (let i = 0; i < 4; i++) {
            if (i === 0) {
              gamesStates[room]["correct_answer_letter"] = answer_letters[i]
            }
            question_data[answer_letters[i]] = answer_vals[i]
          }

          question_data["question"] = curr_question_data["question"]

          io.to(room).emit("question", question_data, currNumQuestion, totalNumQuestions)

          gamesStates[room]["curr_question_start_time"] = Date.now()

          let countdown2_seconds = QUESTION_TIME;
          gamesStates[room]["countdown2"] = setInterval(() => {
            if (countdown2_seconds > 0 && gamesStates[room]["skip"] === false) {
              io.to(room).emit("question-countdown", countdown2_seconds)
              countdown2_seconds--;
            }
            else {
              clearInterval(gamesStates[room]["countdown2"]);

              // 1. Convert the object into an array of player objects
              // Each player object will have 'name', 'score', and 'numCorrect' properties
              const curr_players_info = gamesStates[room]["players"]
              const players = Object.entries(curr_players_info).map(([name, data]) => ({
                name: name,
                score: data.score,
                numCorrect: data.numCorrect // Include numCorrect, even if not used for sorting
              }));

              // 2. Sort the players array by score in decreasing order
              players.sort((a, b) => b.score - a.score);

              // 3. Create the array of names sorted by score
              const sortedNames = players.map(player => player.name);

              // 4. Create the array of scores sorted in increasing order
              const sortedScores = players.map(player => player.score);

              const correctLetter = gamesStates[room]["correct_answer_letter"]
              const answerData = [question_data["A"], question_data["B"], question_data["C"], question_data["D"]]
              const originalQuestion = question_data["question"]
              const answerDistribution = gamesStates[room]["answer_distribution"]
              io.to(room).emit("show-standings", answerDistribution, sortedNames, sortedScores, correctLetter, answerData, originalQuestion)
              gamesStates[room]["question_number"] += 1
            }

          }, 1000)
        }
      }, 1000)
    })

    socket.on("player-answer", (roomCode, username, choice) => {
      io.to(roomCode).emit("player-answered", username)

      gamesStates[roomCode]["answer_distribution"][choice] += 1
      if (choice === gamesStates[roomCode]["correct_answer_letter"]) {
        console.log(username + " got it correct!")
        gamesStates[roomCode]["players"][username]["score"] += calculateScore(Date.now() - gamesStates[roomCode]["curr_question_start_time"]);
        gamesStates[roomCode]["players"][username]["numCorrect"] += 1;
      }
      else {
        console.log(username + " got it wrong!")
      }
      console.log(gamesStates);
    })

    socket.on("delete-room", (roomCode) => {
      console.log("Deleting room with code: " + roomCode)
      clearInterval(gamesStates[roomCode]["countdown1"]);
      clearInterval(gamesStates[roomCode]["countdown2"]);
      delete gamesStates[roomCode]
      console.log(gamesStates)
    })
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
