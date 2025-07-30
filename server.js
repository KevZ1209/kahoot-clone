import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

let gamesStates = {

}

let countdown1_interval;

let countdown2_interval;


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

    socket.on("next-question", (room) => {
      let countdown_seconds = 3
      countdown1_interval = setInterval(() => {
        if (countdown_seconds > 0) {
          io.to(room).emit("countdown", countdown_seconds);
          countdown_seconds--;
        } else {
          clearInterval(countdown1_interval);
          const curr_question_num = gamesStates[room]["question_number"]
          const curr_question_data = gamesStates[room]["questions"][curr_question_num]

          // TODO: obfuscate so the correct answer doesn't show in the HTML
          io.to(room).emit("question", curr_question_data)

          let countdown2_seconds = 20;
          countdown2_interval = setInterval(() => {
            if (countdown2_seconds > 0) {
              io.to(room).emit("question-countdown", countdown2_seconds)
              countdown2_seconds--;
            }
            else {
              clearInterval(countdown2_interval);
              io.to(room).emit("player standings")
              gamesStates[room]["question_number"] += 1
            }

          }, 1000)
        }
      }, 1000)
    })

    socket.on("player-answer", (roomCode, username, correct) => {
      if (correct) {
        console.log(username + " got it correct!")
        gamesStates[roomCode]["players"][username]["score"] += 1000;
        gamesStates[roomCode]["players"][username]["numCorrect"] += 1;
      }
      else {
        console.log(username + " got it wrong!")
      }
      console.log(gamesStates);
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
