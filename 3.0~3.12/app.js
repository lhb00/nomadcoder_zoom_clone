const socket = io(); // 자동으로 backend를 socket.io와 연결해주는 함수
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection; // getMedia 함수를 불렀을 때와 똑같이 stream을 공유하기 위하여 선언함
let myDataChannel;

async function getCameras() {
    try{
        const devices = await navigator.mediaDevices.enumerateDevices(); 
        // navigator.mediaDevices.enumerateDevices로 유저의 모니터, 키보드, 마우스, 마이크 등 기기 정보를 불러올 수 있음.
        const cameras = devices.filter(device => device.kind === "videoinput"); // 유저의 카메라만 불러올 수 있게 필터 적용
        const currentCamera = myStream.getVideoTracks()[0]; // stream의 현재 카메라를 가져옴.
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label; // paint 할 때의 카메라 option을 가져옴.
            if(currentCamera.label === camera.label) {
                option.selected = true; // 카메라를 선택했을 때 그 화면으로 안보이고 처음에 선택한 카메라로 돌아가야지만 그 화면으로 보이는 문제를 해결
            }
            cameraSelect.appendChild(option);
        })
    }catch(e){
        console.log(e)
    }
}

async function getMedia(deviceId){
    const initialConstraints = {
        audio: true, video: {facingMode: "user"} // 유저가 카메라를 켜면(deviceID가 없을 때 즉, cameras를 만들기 전) 셀카 모드로 켜짐
    };
    const cameraConstraints = {
        audio: true,
        video: {deviceId: { exact: deviceId } }, // 우리는 유저로부터 deviceID를 이미 받았으므로, exact 옵션을 사용하여 디바이스를 찾지 못하면 카메라가 꺼지도록 할 것임.
    }
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId? cameraConstraints : initialConstraints // 드디어 니꼬가 삼항 연산자를 사용하기 시작!
        );
            myFace.srcObject = myStream;
            if(!deviceId) {
                await getCameras();
            } // 카메라를 변경할 때마다 getCameras가 실행되어 똑같은 카메라가 계속 중복되어 카메라가 계속 늘어나는 문제 해결
    } // navigator.mediaDevices,getUserMedia는 유저의 유저미디어 string을 준다. 
    // 우리는 navigator.mediaDevices,getUserMedia에 constraints를 보내야한다.
    //constraints: 기본적으로 우리가 무엇을 얻고 싶은지를 말함.
    catch(e){
        console.log(e); // 에러가 있으면 에러를 console.log 해줌.
    }
} 

function handleMuteClick() {
    myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled)); // Audio track에 접근
    // track.enabled의 현재 값을 얻고, 그 반대 값을 현재의 track.enabled 값에 설정해주는 것! 헷갈리지 말자
    if(!muted) {
        muteBtn.innerText =  "Unmute";
        muted = true;
    }
    else {
        muteBtn.innerText =  "Mute";
        muted = false;
    }
}

function handleCameraClick() {
    myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
    if(cameraOff) {
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = true;
    }
}

async function handleCameraChange() {
    await getMedia(cameraSelect.value);
    if(myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection.getSenders().find(sender => sender.track.kind === "video"); // peer에게 줄 stream을 업데이트함.
        console.log(videoSender);
        videoSender.replaceTrack(videoTrack);
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall(); // WebSocket들의 속도가 media를 가져오는 속도, 연결을 생성하는 속도보다 빠르므로 함수를 먼저 불러오고 emit으로 서버에 전달
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";

}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

socket.on("welcome", async () => {
    myDataChannel = myPeerConnection.createDataChannel("chat"); // offer를 만들기 전에 Data Channel을 만듦.
    myDataChannel.addEventListener("message", (event) => console.log(event.data));
    console.log("made data channel");
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer); // offer로 연결 구성, // 처음 접속한 브라우저(내 경우는 크롬)에만 적용되는 코드임
    console.log("sent the offer");
    socket.emit("offer", offer, roomName); // Peer B(내 경우는 FireFox)로 offer를 보냄
}); // Peer B가 참가하고 그게 서버에 전달되면, 서버가 Peer A에게 알려주고, welcome event를 발생시킴. 그리고 Peer A는 offer를 전달하고,

socket.on("offer", async (offer) => {
    myPeerConnection.addEventListener("datachannel", (event) => {
        myDataChannel = event.channel;
        myDataChannel.addEventListener("message", (event) => console.log(event.data));
    }); // 다른 peer에선 당연히 Data Channel을 만들 필요가 없음! 그래서 Data Channel을 받을거임.
    // 새로운 Data Channel이 있을 때 eventListener를 추가하고, Data Channel을 저장하고, 그 Data Channel에 eventlistener 추가
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer); // Peer B는 offer를 받음, 그런데 아직 myPeerConnection이 존재하지 않음. 왜냐면 이 일이 너무 빨리 일어나기 때문.
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName); // Peer B가 answer로 응답하는 것이므로 Answer를 서버로 보내야함.
    console.log("sent the answer");
    // 그래서 handleWelcomeSubmit 함수의 순서를 약간 변경함. 이제 myPeerConnection은 존재함.
}) // Peer B(내 경우는 FireFox)에서 실행되는 함수

socket.on("answer",answer => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer); // answer를 받아서 Description을 remote함
}); // Peer A에서 실행되는 코드

socket.on("ice", ice => {
    console.log("received the candidate");
    myPeerConnection.addIceCandidate(ice);
})

// RTC Code
// 실제 연결을 만드는 함수

function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
              urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun3.l.google.com:19302",
                "stun:stun4.l.google.com:19302",
              ],
            },
          ], // 비디오를 주 받기 위해서 STUN 서버를 활용하는게 아니라, 공용주소를 알아내기 위해서 STUN 서버를 활용하는 것이다.
          // 테스트용으로 구글에서 무료로 제공하는 서버를 이용해보았다. 당연히 내가 직접 개발하는 앱에선 STUN 서버를 직접 구축해야한다. 그럴말한 실력을 갖추고 싶다 ㅠㅠ
    }); // peer-to-peer connection 생성
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream.getTracks().forEach(track => myPeerConnection.addTrack(track, myStream)); // 카메라, 마이크 데이터 stream을 연결 안에 집어넣음
    // Peer-to-Peer 커넥션을 만들 때 peer 연결에 track도 추가하므로,
}

function handleIce(data) {
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomName);
} // Peer A와 Peer B가 candidate를 주고 받음.

function handleAddStream(data) {
    const peerFace = document.getElementById("peerFace")
    console.log("Peer's Stream", data.stream);
    peerFace.srcObject = data.stream;
} // Peer B의 stream을 받아 화면에 출력함.
// Peer A에서 화면을 끄면, Peer B에서 표시되는 Peer A의 화면도 꺼짐: remote stream이므로