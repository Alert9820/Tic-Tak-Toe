const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public")); // Serve static frontend files from 'public' folder

let players = {};     // roomId => [socketId, socketId]
let gameState = {};   // roomId => [null, null, ..., null]

io.on("connection", (socket) => {
  console.log("✅ New connection:", socket.id);

  // When a player joins a room
  socket.on("joinGame", (roomId) => {
    socket.join(roomId);
    if (!players[roomId]) players[roomId] = [];

    // Prevent same player joining twice
    if (!players[roomId].includes(socket.id) && players[roomId].length < 2) {
      players[roomId].push(socket.id);

      const symbol = players[roomId].length === 1 ? "X" : "O";
      socket.emit("joined", { symbol });

      // Start game when 2 players are in room
      if (players[roomId].length === 2) {
        gameState[roomId] = Array(9).fill(null); // Reset board
        io.to(roomId).emit("startGame");
      }
    } else {
      socket.emit("roomFull");
    }
  });

  // Handle move
  socket.on("move", ({ index, roomId, symbol }) => {
    if (gameState[roomId] && gameState[roomId][index] === null) {
      gameState[roomId][index] = symbol;
      io.to(roomId).emit("moveMade", { index, symbol });

      const winner = checkWinner(gameState[roomId]);
      if (winner || !gameState[roomId].includes(null)) {
        io.to(roomId).emit("gameOver", {
          winner: winner || null,
          draw: !winner,
        });
      }
    }
  });

  // Optional: Handle restart
  socket.on("restart", (roomId) => {
    if (players[roomId] && players[roomId].length === 2) {
      gameState[roomId] = Array(9).fill(null);
      io.to(roomId).emit("startGame");
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    for (let roomId in players) {
      players[roomId] = players[roomId].filter(id => id !== socket.id);
      if (players[roomId].length === 0) {
        delete players[roomId];
        delete gameState[roomId];
      }
    }
    console.log("❌ Disconnected:", socket.id);
  });
});

// Winner check helper
function checkWinner(b) {
  const patterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  for (let [a, b1, c] of patterns) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  }
  return null;
}

server.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
