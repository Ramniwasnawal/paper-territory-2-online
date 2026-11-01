const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const rooms = new Map();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('joinRoom', (data = {}) => {
    const room = String(data.room || 'LOBBY')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'LOBBY';

    const name = String(data.name || 'Player')
      .replace(/[<>]/g, '')
      .slice(0, 16);

    socket.join(room);
    socket.data.room = room;
    socket.data.player = {
      id: socket.id,
      name,
      x: Math.floor(Math.random() * 20),
      y: Math.floor(Math.random() * 15),
      color: '#' + Math.floor(Math.random() * 16777215)
        .toString(16).padStart(6, '0')
    };

    if (!rooms.has(room)) rooms.set(room, {});
    const players = rooms.get(room);
    players[socket.id] = socket.data.player;

    io.to(room).emit('players', Object.values(players));
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (!room || !rooms.has(room)) return;

    const players = rooms.get(room);
    delete players[socket.id];

    io.to(room).emit('players', Object.values(players));

    if (Object.keys(players).length === 0) {
      rooms.delete(room);
    }
  });
});

server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
