import { io } from "socket.io-client";

// === Cấu hình token và receiverId ===
const token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0b2tlbiBsb2dpbiIsImlzcyI6ImZyb20gc2VydmVyIiwiX2lkIjoiNjkwYzE2OTA3ZGQyYTllOGU2Y2IxZDg4IiwibmFtZSI6IkltIGFkbWluIiwiZW1haWwiOiJhZG1pbkBnbWFpbC5jb20iLCJyb2xlIjp7Il9pZCI6IjY5MGMxNjkwN2RkMmE5ZThlNmNiMWQ4MiIsIm5hbWUiOiJTVVBFUl9BRE1JTiJ9LCJpYXQiOjE3NjI5NTg5OTksImV4cCI6MTc2MzAxODk5OX0.ZCMI89ziVW8gZUzVtn-fh_D6gpOCW_jcueOlpXHSahg"; // copy token login User1
const receiverId = "690c16907dd2a9e8e6cb1d88"; // ID của User2

// Kết nối Socket.IO
const socket = io("http://localhost:6969/chat", { auth: { token } });

socket.on("connect", () => {
    console.log("✅ User1 connected with socketId:", socket.id);

    // Gửi tin nhắn test trực tiếp bằng receiverId
    setTimeout(() => {
        socket.emit("send_message", {
            receiverId,
            content: "User1 đây"
        });
        console.log("✉ User1 sent a test message");
    }, 1000);
});

// Nhận tin nhắn
socket.on("receive_message", (msg) => {
    console.log("📩 User1 received message:", msg);
});

// Nhận notification khi có tin nhắn mới
socket.on("new_message_notification", (notif) => {
    console.log("🔔 User1 notification:", notif);
});

socket.on("disconnect", reason => console.log("❌ User1 disconnected:", reason));
socket.on("connect_error", err => console.log("⚠ User1 connect error:", err.message));
