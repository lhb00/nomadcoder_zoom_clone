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

function handleMessageSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#msg input"); // msgform 안에 있는 input만 가져옴
    const value = input.value; // 그냥 input.value 값을 쓰고 비워주면 메시지가 나타나지 않는 오류가 발생하기 때문에 따로 value라는 변수 지정
    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`You: ${value}`);
    });
    input.value = "";
} // Backend로 메시지 보내기, 마지막 argument는 Backend에서 실행시킬 수 있는 함수
// roomName 변수가 없으면 어떤 방에 보내는지 알 수 없으므로 필히 추가해주어야함!

function handleNicknameSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#name input"); // nameform 안에 있는 input만 가져옴
    socket.emit("nickname", input.value);
}

function showRoom() {
    welcome.hidden = true;
    room.hidden = false;
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName}`;
    const msgForm = room.querySelector("#msg");
    const nameForm = room.querySelector("#name");
    msgForm.addEventListener("submit", handleMessageSubmit);
    nameForm.addEventListener("submit", handleNicknameSubmit);
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

socket.on("welcome", (user, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`; // title을 변경(숫자가 계속 바뀌어야하니까) 해주기 위해 여기에 추가함.
    // 마지막엔 title을 변경해주는 함수를 구현해볼거임.
    addMessage(`${user} arrived!`);
}); // 더 이상 addEventListener는 필요 없다. 바닐라 JS 코드 탈출!

socket.on("bye", (left, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${left} left ㅠㅠ`);
});

socket.on("new_message", addMessage); // addMessage를 그냥 호출하는 것은 (msg)=> {addMessage(msg)}라고 적는 것과 같다. 어차피 addMessage만 써도 argument와 함께 function을 호출하기 때문

socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector("ul");
    roomList.innerHTML = "";
    if(rooms.length === 0){
        return;
    } // room이 하나도 없을 때 room이 여전히 잔존하는 문제를 해결하기 위하여 추가한 코드
    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    });
});