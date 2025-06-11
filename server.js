const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));

let players = {};
let gameState = {};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("joinGame", (roomId) => {
    socket.join(roomId);
    if (!players[roomId]) players[roomId] = [];
    if (players[roomId].length < 2) {
      players[roomId].push(socket.id);
      const symbol = players[roomId].length === 1 ? "X" : "O";
      socket.emit("joined", { symbol });

      if (players[roomId].length === 2) {
        io.to(roomId).emit("startGame");
        gameState[roomId] = Array(9).fill(null);
      }
    } else {
      socket.emit("roomFull");
    }
  });

  socket.on("move", ({ index, roomId, symbol }) => {
    if (gameState[roomId] && gameState[roomId][index] === null) {
      gameState[roomId][index] = symbol;
      io.to(roomId).emit("moveMade", { index, symbol });
    }
  });

  socket.on("disconnect", () => {
    for (let roomId in players) {
      players[roomId] = players[roomId].filter(id => id !== socket.id);
      if (players[roomId].length === 0) {
        delete players[roomId];
        delete gameState[roomId];
      }
    }
  });
});

server.listen(3000, () => console.log("Server on http://localhost:3000"));
