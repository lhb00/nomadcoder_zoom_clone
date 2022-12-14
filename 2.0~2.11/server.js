import http from "http";
import {Server} from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views" , __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("home"));
app.get("*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`); 
const httpServer = http.createServer(app); // http 서버와
const wsServer = new Server(httpServer, {
    cors: {
      origin: ["https://admin.socket.io"], // 이 URL에서 localhost:3000에 액세스 할 거임.
      credentials: true
    },
}); // WebSocket 서버를 둘 다 돌릴 수 있음! 

instrument(wsServer, {
    auth: false
});

function publicRooms(){
    const {sockets: {adapter: {sids, rooms}}} = wsServer; // Adapter로 부터 sids와 rooms를 가져옴.
    const publicRooms = [];
    rooms.forEach((_, key) => {
        if(sids.get(key) === undefined){
            publicRooms.push(key);
        } // Rooms의 key들 중 sids에 없는 key, 즉 Socket ID가 아닌 key를 Array에 추가해주고,
    });
    return publicRooms; // Array를 반환
}

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size // roomName을 못찾는 경우도 있으므로 ? 추가
}

wsServer.on("connection", (socket) =>{
    socket["nickname"] = "Anon";
    socket.onAny((event) => {
        console.log(wsServer.sockets.adapter);
        console.log(`Socket Event: ${event}`);
    });
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName); // 방에 들어가기 위해 사용. SocketIO가 기본으로 제공.
        done(); // Backend에서도 실행해주어야 원하는 결과를 얻을 수 있다.
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName)); // 방에 입장하면 본인을 제외한 방에 있는 모든 사람에게 'welcome'이라는 메시지가 전달됨.
        // 하나의 socket에만 메시지가 전달됨.
        wsServer.sockets.emit("room_change", publicRooms()); // 모든 socket에 메시지가 전달됨.
     }); // socket.on 뒤에 우리가 원하는 이벤트를 넣어주기만 하면 된다.
     socket.on("disconnecting", () => { // disconneting event로 방에서 떠났을 때
        socket.rooms.forEach(room => socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)); // socket.rooms로 중복되는 요소가 없는, 각 방의 이름이 담긴 array를 받을 수 있으므로 foreach 사용 가능.
     }); // disconnecting 함수는 연결이 종료되기 직전에 발생하므로 여기에 방을 떠났을 때 방 이름을 보내는 동작을 추가 시 방이 여전히 남아 있는 것으로 나옴. 그래서 -1을 해주는 것.
     socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
     }); // 따라서 종료 후에 실행되는 disconnect 함수를 대신 사용함
     socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
     }); // Backend에서 message 받고, done 함수는 마찬가지로 frontend에서 실행
     socket.on("nickname", (nickname) => (socket["nickname"] = nickname)); // nickname event가 발생하면 nickname을 가져와서 socket에 저장
});// 각각 다른 브라우저에서 접속 시 socket이 다르므로 여러번 실행될 것이다.

// argument로 서버를 전달해 줄 수 있으나, 필수는 아님!
// 마찬가지로 http와 WebSocket 서버를 둘 다 만들지 않아도 됨. 다만 우리는 둘이 같은 포트에 있길 원하므로 이렇게 만드는 것

/*
const wss = new WebSocket.Server({server});
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
}); */ // backend의 addEventListener와 같은 역할을 하는 함수 //WebSockets와 SocketIO 비교를 위하여 주석처리함.
// 설명을 보면 callback으로 socket을 받는다 써있다. socket은 연결된 사람을 의미, 즉, 브라우저와의 연결망을 의미하고, 저장을 하는 것이 필수적이다. 최소 console.log라도 해야한다.
// 소켓에 있는 메소드를 이용해 브라우저에 메시지를 보내보자. 서버에 있는 메소드가 아님에 주의.
httpServer.listen(3000, handleListen); 
//별 다른건 없지만 서버는 http, WebSocket 2개 모두를 이해할 수 있게 되었다.