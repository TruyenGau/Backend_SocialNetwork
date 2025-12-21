const { io } = require('socket.io-client');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0b2tlbiBsb2dpbiIsImlzcyI6ImZyb20gc2VydmVyIiwiX2lkIjoiNjkwYzE2OTA3ZGQyYTllOGU2Y2IxZDg4IiwibmFtZSI6IkltIGFkbWluIiwiZW1haWwiOiJhZG1pbkBnbWFpbC5jb20iLCJyb2xlIjp7Il9pZCI6IjY5MGMxNjkwN2RkMmE5ZThlNmNiMWQ4MiIsIm5hbWUiOiJTVVBFUl9BRE1JTiJ9LCJpYXQiOjE3NjMwNDM1MjEsImV4cCI6MTc2MzEwMzUyMX0.YejjUu5zWsf4GdFhUiMjhAeMm3vEIE4f338dEdMcDAI'; // Thay bằng JWT của User1
const ROOM_ID = '6915eb63d39f3869de975e53'; // Thay bằng roomId nhóm

const socket = io('http://localhost:6969/chat', {
  auth: { token: `Bearer ${TOKEN}` },
});

socket.on('connect', () => {
  console.log('✅ User1 connected');

  // Join group
  socket.emit('join_group', { roomId: ROOM_ID });

  // Gửi tin nhắn sau 2s
  setTimeout(() => {
    socket.emit('send_group_message', { roomId: ROOM_ID, content: 'Hello từ User1!' });
  }, 2000);
});

// Nhận tin nhắn
socket.on('receive_group_message', (msg) => {
  console.log('💬 Received message:', msg);
});

// Notification khi user khác join
socket.on('user_joined_group', (data) => {
  console.log('👥 User joined group:', data);
});

// Notification tin nhắn mới
socket.on('new_group_message_notification', (data) => {
  console.log('🔔 New group message notification:', data);
});
