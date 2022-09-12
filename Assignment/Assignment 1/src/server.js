import http from "http";
import WebSocket from "ws";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
// Put all your backend code here.
const sockets = []; // 임시 데이터베이스용 array 생성

wss.on("connection", (socket) => {
  sockets.push(socket);
  socket["nickname"] = "Anon"; // 닉네임이 없을때에는 익명으로 처리
  console.log("Connected to Browser ✅");
  socket.on("close", () => console.log("Disconnected from the Browser ❌")); // 이렇게 익명 함수를 쓰기 싫으면, 직접 function을 작성해도 된다.
  socket.on("message", (msg) => {
    const translatedMessageData = msg.toString("utf8"); // 자꾸 버퍼값이 출력되어서 추가한 코드, 버전이 올라가면서 자동 디코딩이 안돼서 그렇단다.
    const message = JSON.parse(translatedMessageData); // string을 다시 Object로 변경
    switch (message.type) {
      case "new_message":
        sockets.forEach((aSocket) =>
          aSocket.send(`${socket.nickname}: ${message.payload}`)
        ); // 각 브라우저가 연결되면 위의 array에 추가하고, 모든 소켓을 거쳐서 전송. 그래서 중복되는 문제점이 있고, 추후 수정 예정
        break;
      case "nickname":
        socket["nickname"] = message.payload; // 소켓에 즉시 닉네임을 줌
        break;
      default:
    }
  });
}); // backend의 addEventListener와 같은 역할을 하는 함수
server.listen(process.env.PORT, handleListen);
