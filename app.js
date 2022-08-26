const messageList = document.querySelector("ul");
const nickForm = document.querySelector("#nick");
const messageForm = document.querySelector("#message");
const socket = new WebSocket(`ws://${window.location.host}`); // http로 하면 다른 프로토콜이므로 당연히 안된다.
// window.location.host로 주소를 직접 입력할 필요 없이 자동으로 가져오게 할 수 있다.

function makeMessage(type, payload){
    const msg = {type, payload};
    return JSON.stringify(msg);
} // string을 보내기 전에 object를 생성 후, string으로 바꿔줌.

socket.addEventListener("open", () => {
    console.log("Connected to Server ✅");
});

socket.addEventListener("message", (message) => {
    const li = document.createElement("li");
    li.innerText = message.data;
    messageList.append(li);
});

socket.addEventListener("close", () => {
    console.log("Disconnected from Server ❌");
});

/* setTimeout(() => {
    socket.send("hello from the browser!");
}, 10000); */ // 오랜만에 보는 Timeout, 바로 실행되지 않기 위해서 설정

function handleSubmit(event) {
    event.preventDefault();
    const input = messageForm.querySelector("input");
    socket.send(makeMessage("new_message", input.value));
    const li = document.createElement("li");
    li.innerText = `You: ${input.value}`;
    messageList.append(li);
    input.value = "";
}

function handleNickSubmit(event) {
    event.preventDefault() ;
    const input = nickForm.querySelector("input");
    socket.send(makeMessage("nickname", input.value));
    input.value = ""

}

messageForm.addEventListener("submit", handleSubmit);
nickForm.addEventListener("submit", handleNickSubmit);