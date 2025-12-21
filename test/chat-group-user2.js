const { io } = require('socket.io-client');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0b2tlbiBsb2dpbiIsImlzcyI6ImZyb20gc2VydmVyIiwiX2lkIjoiNjkwYzE2OTA3ZGQyYTllOGU2Y2IxZDg5IiwibmFtZSI6IkltIFRydXnhu4FuIiwiZW1haWwiOiJ0cnV5ZW5AZ21haWwuY29tIiwicm9sZSI6eyJfaWQiOiI2OTBjMTY5MDdkZDJhOWU4ZTZjYjFkODMiLCJuYW1lIjoiTk9STUFMX1VTRVIifSwiaWF0IjoxNzYzMDQzNTE4LCJleHAiOjE3NjMxMDM1MTh9.kQ1umsz4ta0WyTEFJ8GsqZYZN137HXvKCzgXvyHd5pU';
const ROOM_ID = '6915eb63d39f3869de975e53';

const socket = io('http://localhost:6969/chat', {
  auth: { token: `Bearer ${TOKEN}` },
});

socket.on('connect', () => {
  console.log('✅ User2 connected');
  socket.emit('join_group', { roomId: ROOM_ID });

  // Gửi tin nhắn sau 5s
  setTimeout(() => {
    socket.emit('send_group_message', { roomId: ROOM_ID, content: 'truyền đây!' });
  }, 5000);
});

socket.on('receive_group_message', (msg) => {
  console.log('💬 Received message:', msg);
});

socket.on('user_joined_group', (data) => {
  console.log('👥 User joined group:', data);
});

socket.on('new_group_message_notification', (data) => {
  console.log('🔔 New group message notification:', data);
});
