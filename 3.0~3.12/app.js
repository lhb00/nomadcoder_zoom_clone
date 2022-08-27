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
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

function startMedia() {
    welcome.hidden = true;
    call.hidden = false;
    getMedia();
}

function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    socket.emit("join_room", input.value, startMedia);
    roomName = input.value;
    input.value = "";

}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

socket.on("welcome", () => {
    console.log("somebody joined")
})