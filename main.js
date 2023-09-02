const { WebSocketServer } = require("ws");
const { randomUUID } = require("crypto");
const { Room } = require("./room");
const { HttpServer } = require("./server");

const port = process.env.PORT || 3000;
const server = new HttpServer(port);

// Below objects will store state of the server
// Every object's key is client's id

// Stores the connection made with each client
let connections = {};

// Stores the rooms created (room id is room's host's id)
let rooms = {};

// Stores usernames of each client
let usernames = {};

// Stores the room id that a client is in
let enteredRoomId = {};

const ws = new WebSocketServer({server: server.server});

ws.on("connection", (conn) => {

    console.log("new client connected");

    // Generate a id for connection
    const clientId = randomUUID();
    connections[clientId] = conn;
    logData();

    conn.send(JSON.stringify({
        type: "connection",
        id: clientId,
    }))

    conn.on("message", (message) => {
        message = message.toString();
        const data = JSON.parse(message);
        console.log(`Message from ${clientId}`, data);

        switch (data.type) {

        // Client requested to record their name
        case "nameRecordRequest":
            if (!data.username) {
                console.error("Invalid name record request, no name!");
                conn.send(JSON.stringify({
                    type: "nameRecordResponse",
                    success: false,
                }));
            }
            usernames[clientId] = data.username;
            conn.send(JSON.stringify({
                type: "nameRecordResponse",
                success: true,
            }));
            break;

        // Client requests for creating a new room, roomId is same as hostId
        // and hostId is the clientId of client that creates the room initially.
        case "createRequest":
            const hostId = clientId;
            console.log(`${usernames[hostId]} is creating a room..`);
            // TODO: use different ids for rooms
            rooms[hostId] = new Room(hostId);
            enteredRoomId[clientId] = hostId;
            conn.send(JSON.stringify({
                type: "createResponse",
                success: true,
                roomId: hostId,
                hostname: usernames[hostId],
                roomMembers: [usernames[hostId]],
            }))
            break;

        // Client wants to join existing room by providing roomID
        case "joinRequest":
            const room = rooms[data.roomId];
            // Join unsuccessful
            if (!room) {
                console.error(`${usernames[clientId]} wants to join room which doesnot exist`)
                conn.send(JSON.stringify({
                    type: "joinResponse",
                    success: false
                }))
                return;
            }
            // Join successful
            room.add(clientId);
            enteredRoomId[clientId] = data.roomId;
            console.log(`${usernames[clientId]} joins ${usernames[room.host]}'s room`);
            conn.send(JSON.stringify({
                type: "joinResponse",
                success: true,
                roomId: data.roomId,
                hostname: usernames[room.host],
                roomMembers: room.members.map(memId => usernames[memId]),
            }))

            // Notify room members that new member has joined
            for (const id of room.members) {
                if (id === clientId) continue;
                connections[id].send(JSON.stringify({
                    type: "newMemberJoin",
                    username: usernames[clientId],
                }))
            }
            break;

        // Broadcast message to room members when somebody sends a message
        case "chatMessageRequest":
            for (const id of rooms[enteredRoomId[clientId]].members) {
                console.log(id);
                if (id === clientId) continue;
                connections[id].send(JSON.stringify({
                    type: "chatMessageResponse",
                    message: data.message,
                    sender: usernames[clientId],
                }))
            }
            // Notify sender that message was sent
            conn.send(JSON.stringify({
                type: "messageSentStatus",
                success: true,
            }))
            break;

        default:
            console.error("Message type unknown");
        }

        logData();
    })


    conn.on("error", console.error);

    conn.on("close", () => {
        // Delete clients username and connection
        const clientName = usernames[clientId];
        console.log(`${clientName} left!`);
        delete usernames[clientId];
        delete connections[clientId];

        const insideRoom = enteredRoomId[clientId] !== undefined;
        if (!insideRoom) {
            logData();
            return;
        }

        // Remove client from room's member list and notify other users
        const enteredRoom = rooms[enteredRoomId[clientId]];
        delete enteredRoomId[clientId];
        enteredRoom.members = enteredRoom.members.filter(memId => memId !== clientId);
        for (const id of enteredRoom.members) {
            connections[id].send(JSON.stringify({
                type: "memberLeave",
                username: clientName,
            }));
        }

        // Check if leaving client is the room's host
        if (clientId !== enteredRoom.host) {
            logData();
            return;
        }

        // If yes, delete the room if no members left in room, else assign a new host
        if (enteredRoom.members.length === 0) {
            delete rooms[enteredRoom.host];
            logData();
            return;
        }

        const newHostId = enteredRoom.members[0];
        enteredRoom.host = newHostId;
        for (const id of enteredRoom.members) {
            connections[id].send(JSON.stringify({
                type: "hostChange",
                newHost: usernames[newHostId],
            }));
        }

        logData();
    })

})

function logData() {
    console.log("-------------");
    console.log("Clients:", Object.keys(connections));
    console.log("Rooms");
    console.log(rooms);
    console.log("Usernames");
    console.log(usernames);
    console.log("-------------");
}

server.start();
