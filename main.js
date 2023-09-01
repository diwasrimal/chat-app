const { WebSocketServer } = require("ws");
const { randomUUID } = require("crypto");
const { Room } = require("./room");
const { HttpServer } = require("./server");

const port = process.env.PORT || 3000;
const server = new HttpServer(port);

let connections = {};
let rooms = {};
let usernames = {};

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

        // Client requests for creating a new room, client will be room host
        case "createRequest":
            const hostId = clientId;
            console.log(`${usernames[hostId]} is creating a room..`);
            // TODO: handle multiple room creations with multiple button clicks from client
            rooms[hostId] = new Room(hostId);
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

        default:
            console.error("Message type unknown");
        }

        logData();
    })


    conn.on("error", console.error);

    conn.on("close", () => {
        console.log(`${usernames[clientId]} left!`);
        delete connections[clientId];
        delete usernames[clientId];
        delete rooms[clientId];
        // TODO: remove client from memberlist of his/her room
        // TODO: notify room members that client has left
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
