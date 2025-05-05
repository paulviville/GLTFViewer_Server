import { WebSocketServer, WebSocket } from "ws";
import ClientsManager from "./ClientsManager.js";
import Commands from "./Commands.js";
import SceneDescriptor from "./SceneDescriptor.js";
import { Matrix4 } from "./three.module.js";


export default class ServerManager {
	#server;
	#serverId = ClientsManager.serverId;
	#clientsManager = new ClientsManager();
	#sceneDescriptor = new SceneDescriptor();

	constructor ( port ) {
        console.log(`ServerManager - constructor (${port})`);
		this.#server = new WebSocketServer({ port: port });

		this.#server.on('connection', ( socket ) => {
			this.#handleConnection(socket);
		});

	}

	#handleConnection ( socket ) {
        console.log(`ServerManager - #handleConnection`);

		const clientId = this.#clientsManager.createClient();
		this.#clientsManager.setSocket(clientId, socket);

		this.#broadcastNewUser(clientId);
		this.#newUserUpdateTransforms(clientId);
		this.#newUserUpdateCameras(clientId);

		socket.on('message', ( message ) => { this.#handleMessage(clientId, message); });
		socket.on('close', ( ) => { this.#handleClose(clientId); });
	}

	#handleMessage ( clientId , message ) {
        console.log(`ServerManager - #handleMessage ${clientId}`);
		// console.log(message);
		const messageData = JSON.parse(message);
		// console.log(messageData);


		switch (messageData.command) {
			case Commands.SELECT:
				this.#handleSelect(messageData.senderId, messageData.nodes);
				break;
			case Commands.DESELECT:
				this.#handleDeselect(messageData.senderId, messageData.nodes);
				break;
			case Commands.START_TRANSFORM:
				console.log(messageData.command);
				break;
			case Commands.UPDATE_TRANSFORM:
				this.#handleUpdateTransform(messageData.senderId, messageData.nodes);
				break;
			case Commands.END_TRANSFORM:
				console.log(messageData.command);
				break;
			case Commands.UPDATE_CAMERA:
				console.log(messageData.command);
				break;
			case Commands.START_POINTER:
				console.log(messageData.command);
				break;
			case Commands.UPDATE_POINTER:
				console.log(messageData.command);
				break;
			case Commands.END_POINTER:
				console.log(messageData.command);
				break;
			case Commands.ADD_MARKER:
				console.log(messageData.command);
				break;
			case Commands.UPDATE_MARKER:
				console.log(messageData.command);
				break;
			case Commands.DELETE_MARKER:
				console.log(messageData.command);
				break;
			default:
				console.log(messageData.command);
				break;
		}
	}

	#handleClose( clientId ) {
        console.log(`ServerManager - #handleClose ${clientId}`);

		this.#clientsManager.removeClient(clientId);
		this.#broadcastRemoveUser(clientId);
	}

	#handleSelect ( clientId, nodes ) {
        console.log(`ServerManager - #handleSelect ${clientId, nodes[0].name}`);
		
		/// modify for multi selection later

		const node = this.#sceneDescriptor.getNode(nodes[0].name);
		const accepted = this.#sceneDescriptor.selectNode(node);
		console.log(`selection ${nodes[0].name} ${accepted? 'accepted':'rejected'}`);

		if( !accepted ) return;

		/// if accepted, responded to ALL with selected nodes and selector userId
		/// if multiselection: broadcast accepted nodes only
		this.#broadcastSelect(clientId, nodes);
	}

	#handleDeselect ( clientId, nodes ) {
        console.log(`ServerManager - #handleDeselect ${clientId, nodes[0].name}`);
	
		this.#broadcastDeselect(clientId, nodes);	
	}

	#handleUpdateCamera ( clientId, viewMatrix ) {
		
	}

	#handleUpdatePointer ( clientId, origin, end ) {
		
	}

	#handleUpdateTransform ( clientId, nodes ) {
		console.log(`ServerManager - #handleUpdateTransform ${clientId}`);
		
		const node = this.#sceneDescriptor.getNode(nodes[0].name);
		const matrix = new Matrix4().fromArray(nodes[0].matrix);
		
		this.#sceneDescriptor.setMatrix(node, matrix);

		this.#updateTransformBroadcast(clientId, nodes);
	}

	#newUserUpdateTransforms ( clientId ) {
		console.log(`ServerManager - #newUserUpdateTransforms ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);

		for ( const {name, matrix} of this.#sceneDescriptor.nodesData ) {
			const nodes = [{name, matrix: matrix.toArray()}];
			socket.send(this.#messageUpdateTransform(this.#serverId, nodes));
		}
		/// for multi node message, concatenate array before send
	}


	#broadcastNewUser ( clientId ) {
        console.log(`ServerManager - #broadcastNewUser ${clientId}`);
		const socket = this.#clientsManager.getSocket(clientId);
		socket.send(this.#messageSetUser(clientId));

		for ( const otherCliendId in this.#clientsManager.clients ) {
			if( otherCliendId == clientId ) continue;

			const otherSocket = this.#clientsManager.getSocket(otherCliendId);
			
			socket.send(this.#messageNewUser(otherCliendId));
			otherSocket.send(this.#messageNewUser(clientId));
		}
	}

	#broadcastRemoveUser ( clientId ) {
        console.log(`ServerManager - #broadcastRemoveUser ${clientId}`);
		for ( const clientId1 in this.#clientsManager.clients ) {
			const socket = this.#clientsManager.getSocket(clientId1);
			socket.send(this.#messageRemoveUser(clientId));
		}
	}

	#broadcastSelect ( clientId, nodes ) {
		console.log(`ServerManager - #broadcastSelect ${clientId}`);

		const message = this.#messageSelect(clientId, nodes);

		for ( const client of this.#clientsManager.clients ) {
			console.log(client);
			const socket = this.#clientsManager.getSocket(client);
			socket.send(message);
		}
	}

	#broadcastDeselect ( clientId, nodes ) {
		console.log(`ServerManager - #broadcastDeselect ${clientId}`);
		const message = this.#messageDeselect(clientId, nodes);

		for ( const client of this.#clientsManager.clients ) {
			const socket = this.#clientsManager.getSocket(client);
			socket.send(message);
		}
	}

	#updateTransformBroadcast ( clientId, nodes ) {
		console.log(`ServerManager - #updateTransformBroadcast ${clientId}`);
		
		const message = this.#messageUpdateTransform(clientId, nodes);

		for ( const otherCliendId of this.#clientsManager.clients ) {
			if( otherCliendId == clientId ) continue;

			const socket = this.#clientsManager.getSocket(otherCliendId);
			socket.send(message);
		}
	}

	#updateCameraBroadcast ( clientId ) {

	}

	#newUserUpdateCameras ( clientId ) {
		console.log(`ServerManager - #newUserUpdateCameras ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);

		for ( const {viewMatrix} of this.#clientsManager.clientsData ) {
			// console.log(data)
			socket.send(this.#messageUpdateCamera(this.#serverId, viewMatrix.toArray()));
		}
	}

	#messageUpdateCamera ( clientId, viewMatrix ) {
		console.log(`ServerManager - #messageUpdateCamera ${clientId}`);
		console.log(viewMatrix)
		const messageData = {
			senderId: clientId,
			command: Commands.UPDATE_CAMERA,
			viewMatrix: viewMatrix,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageUpdateTransform ( clientId, nodes ) {
		console.log(`ServerManager - #messageUpdateTransform ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.UPDATE_TRANSFORM,
			nodes: nodes,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageStartTransform ( clientId, nodes ) {
		console.log(`ServerManager - #messageStartTransform ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.START_TRANSFORM,
			nodes: nodes,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageEndTransform ( clientId, nodes ) {
		console.log(`ServerManager - #messageEndTransform ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.END_TRANSFORM,
			nodes: nodes,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageDeselect ( clientId, nodes ) {
		console.log(`ServerManager - #messageDeselect ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.DESELECT,
			nodes: nodes,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageSelect ( clientId, nodes ) {
		console.log(`ServerManager - #messageSelect ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.SELECT,
			nodes: nodes,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageSetUser ( clientId ) {
        console.log(`ServerManager - #messageSetUser ${clientId}`);
		
		const messageData = {
			senderId: this.#serverId,
			command: Commands.SET_USER,
			userId: clientId,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageNewUser ( clientId ) {
        console.log(`ServerManager - #messageNewUser ${clientId}`);

		const messageData = {
			senderId: this.#serverId,
			command: Commands.NEW_USER,
			userId: clientId,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageRemoveUser ( clientId ) {
        console.log(`ServerManager - #messageRemoveUser ${clientId}`);

		const messageData = {
			senderId: this.#serverId,
			command: Commands.REMOVE_USER,
			userId: clientId,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageStartPointer ( clientId ) {
        console.log(`ServerManager - #messageStartPointer ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.START_POINTER,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageEndPointer ( clientId ) {
        console.log(`ServerManager - #messageEndPointer ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.END_POINTER,
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageUpdatePointer ( clientId, pointer ) {
        console.log(`ServerManager - #messageUpdatePointer ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.UPDATE_POINTER,
			pointer: pointer
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageAddMarker ( clientId, marker ) {
		console.log(`ServerManager - #messageAddMarker ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.ADD_MARKER,
			marker: {
				id: marker.id,
				matrix: marker.matrix,
			}
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageDeleteMarker ( clientId, marker ) {
		console.log(`ServerManager - #messageDeleteMarker ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.ADD_MARKER,
			marker: {
				id: marker.id,
			}
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageUpdateMarker ( clientId, marker ) {
		console.log(`ServerManager - #messageDeleteMarker ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.ADD_MARKER,
			marker: {
				id: marker.id,
				matrix: marker.matrix,
			}
		}
		const message = JSON.stringify(messageData);

		return message;
	}






	async loadFile ( gltf ) {
		const gltfData = JSON.parse(gltf);
		// console.log(gltfData);
		this.#sceneDescriptor.loadGLTF(gltfData);
	}
}
