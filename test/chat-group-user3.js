const { io } = require('socket.io-client');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0b2tlbiBsb2dpbiIsImlzcyI6ImZyb20gc2VydmVyIiwiX2lkIjoiNjkxNWU3NWY2MjdiZTZlNjdmOTU3YzYyIiwibmFtZSI6InZpbmgiLCJlbWFpbCI6InZpbmhAZ21haWwuY29tIiwicm9sZSI6eyJfaWQiOiI2OTBjMTY5MDdkZDJhOWU4ZTZjYjFkODMiLCJuYW1lIjoiTk9STUFMX1VTRVIifSwiaWF0IjoxNzYzMDQzNTEzLCJleHAiOjE3NjMxMDM1MTN9.2HvCAi4ONX6qOX8pzuhVHrCdIqiHj_MZSrs57h7tLcY';
const ROOM_ID = '6915eb63d39f3869de975e53';

const socket = io('http://localhost:6969/chat', {
  auth: { token: `Bearer ${TOKEN}` },
});

socket.on('connect', () => {
  console.log('✅ User3 connected');
  socket.emit('join_group', { roomId: ROOM_ID });

  // Gửi tin nhắn sau 8s
  setTimeout(() => {
    socket.emit('send_group_message', { roomId: ROOM_ID, content: '\post\images\b-1761292169930.jpg' });
  }, 8000);
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
