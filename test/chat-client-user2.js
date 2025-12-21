import { io } from "socket.io-client";

// === Cấu hình token và receiverId ===
const token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0b2tlbiBsb2dpbiIsImlzcyI6ImZyb20gc2VydmVyIiwiX2lkIjoiNjkwYzE2OTA3ZGQyYTllOGU2Y2IxZDg5IiwibmFtZSI6IkltIFRydXnhu4FuIiwiZW1haWwiOiJ0cnV5ZW5AZ21haWwuY29tIiwicm9sZSI6eyJfaWQiOiI2OTBjMTY5MDdkZDJhOWU4ZTZjYjFkODMiLCJuYW1lIjoiTk9STUFMX1VTRVIifSwiaWF0IjoxNzYyOTYyMjk3LCJleHAiOjE3NjMwMjIyOTd9.dZx2GnjggshB5N2VJTI2YmF_DMJC8F7SwK8MUq-1VN8";
const receiverId = "690c16907dd2a9e8e6cb1d88"; // ID của User1

// Kết nối Socket.IO
const socket = io("http://localhost:6969/chat", { auth: { token } });

socket.on("connect", () => {
    console.log("✅ User2 connected with socketId:", socket.id);

    // Gửi tin nhắn test trực tiếp bằng receiverId
    setTimeout(() => {
        socket.emit("send_message", {
            receiverId,
            content: "Tôi là 2"
        });
        console.log("✉ User2 sent a test message");
    }, 1000);
});

// Nhận tin nhắn
socket.on("receive_message", (msg) => {
    console.log("📩 User2 received message:", msg);
});

// Nhận notification khi có tin nhắn mới
socket.on("new_message_notification", (notif) => {
    console.log("🔔 User2 notification:", notif);
});

socket.on("disconnect", reason => console.log("❌ User2 disconnected:", reason));
socket.on("connect_error", err => console.log("⚠ User2 connect error:", err.message));
