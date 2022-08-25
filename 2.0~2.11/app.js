const socket = io(); // 자동으로 backend socket.io와 연결해주는 함수
const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;

let roomName;

function addMessage(message) {
    const ul = room.querySelector("ul")
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

function showRoom() {
    welcome.hidden = true;
    room.hidden = false;
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName}`;
} // 그런데, SocketIO는 여기 frontend에서 작성한 함수를,

function handleRoomSubmit(event) {
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit("enter_room", input.value, showRoom); // emit은 socket.send와 다르게 event를 emit 해줄 수 있음. 이름은 중요치 않음. 물론 socket.on과 socket.emit에서 당연히 같은 이름을 사용해야 한다.
    // 또한, argument를 보낼 수 있음. 그리고 argument는 object라고 볼 수 있음!
    // WebSocket을 사용할 당시에 Object를 보내려면 Object를 string으로 바꾸고 다시 Object로 바꿔서 보내야 했지만, 이젠 그럴 필요가 없음!
    // 마지막 argument로 함수를 호출하고, 서버로 전달까지 가능함. 서버가 함수를 실행하면 이 곳 frontend에서 함수가 실행됨. 주의! 끝날 때 실행되는 함수는 무조건 마지막 argument여야함!
    // 함수는 Backend에서 실행되지 않는다: 보안 문제가 있다. 만약 누가 Database를 삭제하는 함수를 Backend에서 실행해버리면 끝난다. 그래서 여기 frontend에서 실행된다.
    // 이런 것을 Callback: 서버로부터 실행되는 function이라고 한다.
    // 보내는 개수에 제약이 없다.
    roomName = input.value;
    input.value = ""
}
form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", () => {
    addMessage("someone joined!");
}); // 더 이상 addEventListener는 필요 없다. 바닐라 JS 코드 탈출!