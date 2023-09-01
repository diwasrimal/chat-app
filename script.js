const nameEntryArea = document.querySelector("#name-entry");
const usernameInput = document.querySelector("#username")
const confirmUsernameButton = document.querySelector("#confirm-username");
const createJoinArea = document.querySelector("#create-join-area")
const createButton = document.querySelector("#create-room")
const joinButton = document.querySelector("#join-room");
const roomIdInput = document.querySelector("#room-id-input")
const roomIdDisplay = document.querySelector("#room-id-display")
const chatPage = document.querySelector("#chat-page");
const roomMemberList = document.querySelector("#room-member-list");
const roomHostNameSpan = document.querySelector("#room-hostname");
const chatMessageInput = document.querySelector("#chat-message");
const sendMessagButton = document.querySelector("#send-message");
const messageStatusSpan = document.querySelector("#message-status")
const chatList = document.querySelector("#chat-list")
const spinner = document.querySelector(".spinning-animation");

const socketProtocol = location.protocol === "https:" ? "wss:" : "ws:";
const socketUrl = `${socketProtocol}//${location.host}`
console.log("Socketurl", socketUrl);

const socket = new WebSocket(socketUrl);
let clientId;
let userNameRecorded = false;

socket.onopen = () => console.log("Connection opened");
socket.onclose = () => console.log("Connection closed");

socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    console.log(data);

    switch (data.type) {
    case "connection":
        // clientId = data.id;
        break;

    case "nameRecordResponse":
        userNameRecorded = data.success;
        if (data.success) {
            hide(nameEntryArea, spinner, chatPage);
            show(createJoinArea);
        }
        else {
            show(nameEntryArea);
            hide(createJoinArea, spinner, chatPage);
        }
        break;

    // Response of creating a new room or joining
    case "createResponse":
    case "joinResponse":
        // TODO: update ui and show room ID
        if (!data.success) {
            console.error("Could not enter room!");
            hide(spinner, nameEntryArea);
            show(createJoinArea);
            return;
        }
        roomIdDisplay.innerHTML = data.roomId;
        roomHostNameSpan.innerHTML = data.hostname;
        for (const member of data.roomMembers.reverse()) {
            const el = document.createElement("li");
            el.innerHTML = member;
            roomMemberList.appendChild(el);
        }
        hide(spinner, createJoinArea, nameEntryArea);
        show(chatPage);
        break;

    // New member joins the room
    case "newMemberJoin":
        const newMem = document.createElement("li");
        newMem.innerHTML = data.username;
        roomMemberList.insertBefore(newMem, roomMemberList.firstChild);
        break;

    // Somebody sends a message to the group
    case "chatMessageResponse":
        const msg = document.createElement("li");
        msg.innerHTML = `${data.sender}: &nbsp &nbsp ${data.message}`;
        chatList.appendChild(msg);
        break;

    // Status of last sent message
    case "messageSentStatus":
        messageStatusSpan.innerHTML = data.success ? "Sent" : "Failed"
        break;

    // Response of trying to join an existing room
    default:
        console.log("Unrecognized message type");
    }
}

function show(...elems) {
    for (const e of elems)
        e.classList.remove("hidden");
}

function hide(...elems) {
    for (const e of elems)
        e.classList.add("hidden");
}

// Record username in server
confirmUsernameButton.onclick = (e) => {
    const name = usernameInput.value.trim();
    if (!name) {
        alert("Enter name");
        return;
    }
    socket.send(JSON.stringify({
        type: "nameRecordRequest",
        username: name,
    }));
    show(spinner);
}

createButton.onclick = (e) => {
    if (!userNameRecorded) return;
    console.log("Creating a room");
    socket.send(JSON.stringify({type: "createRequest"}))
    hide(createJoinArea, nameEntryArea);
    show(spinner);
}

joinButton.onclick = (e) => {
    if (!userNameRecorded) return;
    const id = roomIdInput.value.trim();
    if (!id) {
        alert("Enter room id");
        return;
    }
    socket.send(JSON.stringify({
        type: "joinRequest",
        roomId: id,
    }))
    hide(createJoinArea, nameEntryArea);
    show(spinner);
}

sendMessagButton.onclick = (e) => {
    const message = chatMessageInput.value.trim();
    if (!message) return;
    socket.send(JSON.stringify({
        type: "chatMessageRequest",
        message: message,
    }))
    const el = document.createElement("li");
    el.innerHTML = `You: &nbsp &nbsp ${message}`;
    chatList.appendChild(el);
    messageStatusSpan.innerHTML = "Sending...";
}
