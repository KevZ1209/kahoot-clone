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



app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  // runs every time a client connects to the socket
  io.on("connection", (socket) => {
    console.log(socket.id)
    socket.on("join-game", (roomCode, username) => {
      console.log(roomCode, username)

      // only join room if it's a room that exists
      if (roomCode in gamesStates) {
        // create new player data and have player join that socketio room
        socket.join(roomCode)
        console.log("Player joined room " + roomCode)
        const newPlayerData = {
          score: 0,
          numCorrect: 0
        }
        gamesStates[roomCode][username] = newPlayerData
        // broadcast to admin that player has joined
        console.log("broadcasting player-joined")
        socket.to(roomCode).emit("player-joined", username)
      }
      else {
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

      // add room to gamesStates
      gamesStates[roomCode] = parsedQuestionData

      console.log(gamesStates)
      socket.emit("game-created", roomCode)

    })

    socket.on("start-game", (room) => {
      // start game from current room
      socket.to(room).emit("start-game")
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
