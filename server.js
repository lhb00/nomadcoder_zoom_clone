import http from "http";
import WebSocket from "ws";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views" , __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("home"));
app.get("*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`); 
const server = http.createServer(app); // http 서버와
const wss = new WebSocket.Server({server}); // WebSocket 서버를 둘 다 돌릴 수 있음!
// argument로 서버를 전달해 줄 수 있으나, 필수는 아님!
// 마찬가지로 http와 WebSocket 서버를 둘 다 만들지 않아도 됨. 다만 우리는 둘이 같은 포트에 있길 원하므로 이렇게 만드는 것
// 다만, 너무 바닐라 JS 식의 코드이므로 추후 변경 예정이다.

const sockets = []; // 임시 데이터베이스용 array 생성

wss.on("connection", (socket) => {
    sockets.push(socket);
    socket["nickname"] = "Anon"; // 닉네임이 없을때에는 익명으로 처리
    console.log("Connected to Browser ✅");
    socket.on("close", () => console.log("Disconnected from the Browser ❌")) // 이렇게 익명 함수를 쓰기 싫으면, 직접 function을 작성해도 된다.
    socket.on("message", (msg) => {
        const translatedMessageData = msg.toString('utf8'); // 자꾸 버퍼값이 출력되어서 추가한 코드, 버전이 올라가면서 자동 디코딩이 안돼서 그렇단다.
        const message = JSON.parse(translatedMessageData); // string을 다시 Object로 변경
        switch(message.type) {
            case "new_message":
                sockets.forEach(aSocket => aSocket.send(`${socket.nickname}: ${message.payload}`)); // 각 브라우저가 연결되면 위의 array에 추가하고, 모든 소켓을 거쳐서 전송. 그래서 중복되는 문제점이 있고, 추후 수정 예정
                break
            case "nickname":
                socket["nickname"] = message.payload; // 소켓에 즉시 닉네임을 줌
                break
        }
    });
}); // backend의 addEventListener와 같은 역할을 하는 함수
// 설명을 보면 callback으로 socket을 받는다 써있다. socket은 연결된 사람을 의미, 즉, 브라우저와의 연결망을 의미하고, 저장을 하는 것이 필수적이다. 최소 console.log라도 해야한다.
// 소켓에 있는 메소드를 이용해 브라우저에 메시지를 보내보자. 서버에 있는 메소드가 아님에 주의.
server.listen(3000, handleListen);
//별 다른건 없지만 서버는 http, WebSocket 2개 모두를 이해할 수 있게 되었다.