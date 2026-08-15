import http from "http";
import fs from "fs";
import { WebSocketServer } from "ws";

const PORT = 3001;

// --- HTTP SERVER (serves index.html and static files) ---
const server = http.createServer((req, res) => {
  let filePath = "./public" + (req.url === "/" ? "/index.html" : req.url);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }

    // Determine MIME type
    let contentType = "text/html";
    if (filePath.endsWith(".js")) contentType = "application/javascript";
    if (filePath.endsWith(".css")) contentType = "text/css";
    if (filePath.endsWith(".json")) contentType = "application/json";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

// --- WEBSOCKET SERVER ---
const wss = new WebSocketServer({ server });

// Broadcast helper
function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(json);
    }
  });
}

// --- CONNECTION HANDLER ---
wss.on("connection", (socket, req) => {
  // UNIVERSAL username parser (FCC + Codespaces)
  const username = new URL("http://localhost" + req.url).searchParams.get("username");

  // Broadcast join message
  broadcast({
    type: "system",
    text: `${username} joined`
  });

  // Chat messages
  socket.on("message", (msg) => {
    const { username, text } = JSON.parse(msg);

    broadcast({
      type: "chat",
      username,
      text
    });
  });

  // Disconnect
  socket.on("close", () => {
    broadcast({
      type: "system",
      text: `${username} left`
    });
  });
});

// --- START SERVER ---
server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
