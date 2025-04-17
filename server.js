import { WebSocketServer, WebSocket } from "ws";
import { Matrix4 } from "./three.module.js";
import Commands from "./Commands.js";
import ClientsManager from "./ClientsManager.js";

/// node server.js <port>
const port = process.env.PORT || 8080;

console.log(`port: ${port}`);

const server = new WebSocketServer({ port: port });

const clientsManager = new ClientsManager();
const serverId = clientsManager.createClient();



server.on('connection', ( socket ) => {
    console.log("new socket connected")


    const clientId = clientsManager.createClient();
    console.log(`new client ${clientId}`);
    clientsManager.setSocket(clientId, socket);

    const setUserMessageData = {
        senderId: serverId,
        commad: Commands.SET_USER,
        userId: clientId
    }

    const setUserMessageString = JSON.stringify(setUserMessageData);
    socket.send(setUserMessageString);


    const newUserMessageData = {
        senderId: serverId,
        commad: Commands.NEW_USER,
        userId: clientId
    }
    const newUserMessageString = JSON.stringify(newUserMessageData);

    const priorUserMessageData = {
        senderId: serverId,
        commad: Commands.NEW_USER,
        userId: 0
    }

    for ( const client in clientsManager.clients ) {
        if ( client == serverId || client == clientId )
            continue;

        const otherSocket = clientsManager.getSocket(client);
        otherSocket.send(newUserMessageString);

        priorUserMessageData.userId = client;
        const priorUserMessageString = JSON.stringify(priorUserMessageData);
        socket.send(priorUserMessageString);
    }

    socket.on('message', ( message ) => {
        console.log(message);
    });

    socket.on('close', ( ) => {
        console.log("closing socket");
        console.log(`client ${clientId} disconnected`);

        const removeUserMessageData = {
            senderId: serverId,
            commad: Commands.REMOVE_USER,
            userId: clientId
        }
        const removeUserMessageString = JSON.stringify(removeUserMessageData);
    
        for ( const client in clientsManager.clients ) {
            if ( client == serverId || client == clientId )
                continue;
    
            const otherSocket = clientsManager.getSocket(client);
            otherSocket.send(removeUserMessageString);
        }

        clientsManager.removeClient(clientId);

    });
});

// function onConnexion ( socket ) {
//     const clientId = ClientsManager.createClient();
//     const set
// }

