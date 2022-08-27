import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views" , __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("home"));
app.get("*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`); 
const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", socket =>  {
    socket.on("join_room", (roomName,done) => {
        socket.join(roomName);
        done();
        socket.to(roomName).emit("welcome");
    })
})

httpServer.listen(3000, handleListen); 
//별 다른건 없지만 서버는 http, WebSocket 2개 모두를 이해할 수 있게 되었다.