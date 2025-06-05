import { WebSocketServer, WebSocket } from "ws";
import ClientsManager from "./ClientsManager.js";
import Commands from "./Commands.js";
import SceneDescriptor from "./SceneDescriptor.js";
import { Matrix4 } from "./three.module.js";
import { Vector3 } from "./three/three.module.js";


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

		this.#handleNewUser(clientId);

		socket.on('message', ( message ) => { this.#handleMessage(clientId, message); });
		socket.on('close', ( ) => { this.#handleClose(clientId); });
	}

	#handleMessage ( clientId , message ) {
        console.log(`ServerManager - #handleMessage ${clientId}`);
		// console.log(message);
		const messageData = JSON.parse(message);
		// console.log(messageData);


		switch ( messageData.command ) {
			case Commands.SELECT:
				this.#handleSelect(messageData.senderId, messageData.nodes);
				break;
			case Commands.DESELECT:
				this.#handleDeselect(messageData.senderId, messageData.nodes);
				break;
			case Commands.START_TRANSFORM:
				this.#handleStartTransform(messageData.senderId, messageData.nodes);
				break;
			case Commands.UPDATE_TRANSFORM:
				this.#handleUpdateTransform(messageData.senderId, messageData.nodes);
				break;
			case Commands.END_TRANSFORM:
				this.#handleEndTransform(messageData.senderId, messageData.nodes);
				break;
			case Commands.UPDATE_CAMERA:
				this.#handleUpdateCamera(messageData.senderId, messageData.viewMatrix);
				break;
			case Commands.START_POINTER:
				this.#handleStartPointer(clientId);
				break;
			case Commands.UPDATE_POINTER:
				this.#handleUpdatePointer(clientId, messageData.pointer);
				break;
			case Commands.END_POINTER:
				this.#handleEndPointer(clientId);
				break;
			case Commands.ADD_MARKER:
				this.#handleAddMarker(messageData.senderId, messageData.marker);
				break;
			case Commands.UPDATE_MARKER:
				console.log(messageData.command);
				break;
			case Commands.DELETE_MARKER:
				this.#handleDeleteMarker(messageData.senderId, messageData.marker);
				break;
			default:
				console.log(messageData.command);
				break;
		}
	}

	#handleNewUser ( clientId ) {
        console.log(`ServerManager - #handleNewUser ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);
		socket.send(this.#messageSetUser(clientId));

		this.#newUserUpdateData(clientId);
		this.#broadcastNewUser(clientId);
	}

	#handleClose( clientId ) {
        console.log(`ServerManager - #handleClose ${clientId}`);

		for ( const nodeId of this.#clientsManager.selectedNodes(clientId) ) {
			console.log(nodeId);
			const node = this.#sceneDescriptor.getNode(nodeId);
			this.#sceneDescriptor.deselectNode(node);
			
			this.#clientsManager.deselectNode(clientId, nodeId);

			/// handling multiselection and deselection will clean this up
			this.#broadcastDeselect(clientId, [{name: nodeId}]);
		}

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
		this.#clientsManager.selectNode(clientId, nodes[0].name);
	}

	#handleDeselect ( clientId, nodes ) {
        console.log(`ServerManager - #handleDeselect ${clientId, nodes[0].name}`);
	
		const node = this.#sceneDescriptor.getNode(nodes[0].name);
		this.#sceneDescriptor.deselectNode(node);

		this.#broadcastDeselect(clientId, nodes);	
		this.#clientsManager.deselectNode(clientId, nodes[0].name);
	}

	#handleUpdateCamera ( clientId, matrix ) {
        console.log(`ServerManager - #handleUpdateCamera ${clientId}`);

		this.#clientsManager.setviewMatrix(clientId, new Matrix4().fromArray(matrix));
		
		this.#broadcastUpdateCamera(clientId);
	}

	#handleStartPointer ( clientId ) {
        console.log(`ServerManager - #handleStartPointer ${clientId}`);

		this.#clientsManager.setPointerStatus(clientId, true);
		this.#broadcastStartPointer(clientId);
	}

	#handleUpdatePointer ( clientId, pointer ) {
        console.log(`ServerManager - #handleUpdatePointer ${clientId}`);
		
		this.#clientsManager.setPointer(clientId, {
			origin: new Vector3().fromArray(pointer.origin),
			end: new Vector3().fromArray(pointer.end),
		});
		this.#broadcastUpdatePointer(clientId);
	}

	#handleEndPointer ( clientId ) {
        console.log(`ServerManager - #handleEndPointer ${clientId}`);

		this.#clientsManager.setPointerStatus(clientId, false);
		this.#broadcastEndPointer(clientId);
	}

	#handleStartTransform ( clientId, nodes ) {
		console.log(`ServerManager - #handleStartTransform ${clientId}`);
		
		/// logic for history

		this.#broadcastStartTransform(clientId, nodes);
	}

	#handleUpdateTransform ( clientId, nodes ) {
		console.log(`ServerManager - #handleUpdateTransform ${clientId}`);
		
		const node = this.#sceneDescriptor.getNode(nodes[0].name);
		const matrix = new Matrix4().fromArray(nodes[0].matrix);
		
		this.#sceneDescriptor.setMatrix(node, matrix);

		this.#broadcastUpdateTransform(clientId, nodes);
	}

	#handleEndTransform ( clientId, nodes ) {
		console.log(`ServerManager - #handleEndTransform ${clientId}`);
		
		/// logic for history

		this.#broadcastEndTransform(clientId, nodes);
	}

	#handleAddMarker ( clientId, markerData ) {
		console.log(`ServerManager - #handleAddMarker ${clientId}`);

		const marker = {
			id: markerData.id,
			origin: new Vector3(...markerData.origin),
			end: new Vector3(...markerData.end),
		}

		this.#clientsManager.addMarker(clientId, marker);

		this.#broadcastAddMarker(clientId, marker);
	}


	#handleDeleteMarker ( clientId, markerData ) {
		console.log(`ServerManager - #handleDeleteMarker ${clientId}`);

		const marker = {
			id: markerData.id,
		}

		this.#clientsManager.deleteMarker(clientId, marker);

		this.#broadcastDeleteMarker(clientId, marker);
	}

	#broadcast ( message = {}, excludedId = undefined ) {
		for ( const {client, socket} of this.#clientsManager.clientsData ) {
			if( excludedId !== undefined && client == excludedId ) 
				continue;

			socket.send(message);
		}
	}

	#broadcastNewUser ( clientId ) {
        console.log(`ServerManager - #broadcastNewUser ${clientId}`);

		const message = this.#messageNewUser(clientId);
		this.#broadcast(message, clientId);
	}

	#broadcastRemoveUser ( clientId ) {
        console.log(`ServerManager - #broadcastRemoveUser ${clientId}`);

		const message = this.#messageRemoveUser(clientId);
		this.#broadcast(message);
	}

	#broadcastSelect ( clientId, nodes ) {
		console.log(`ServerManager - #broadcastSelect ${clientId}`);

		const message = this.#messageSelect(clientId, nodes);
		this.#broadcast(message);
	}

	#broadcastDeselect ( clientId, nodes ) {
		console.log(`ServerManager - #broadcastDeselect ${clientId}`);

		const message = this.#messageDeselect(clientId, nodes);
		this.#broadcast(message);
	}

	#broadcastStartTransform ( clientId, nodes ) {
		console.log(`ServerManager - #broadcastStartTransform ${clientId}`);
		
		const message = this.#messageStartTransform(clientId, nodes);
		this.#broadcast(message, clientId);
	}

	#broadcastUpdateTransform ( clientId, nodes ) {
		console.log(`ServerManager - #broadcastUpdateTransform ${clientId}`);
		
		const message = this.#messageUpdateTransform(clientId, nodes);
		this.#broadcast(message, clientId);
	}

	#broadcastEndTransform ( clientId, nodes ) {
		console.log(`ServerManager - #broadcastEndTransform ${clientId}`);
		
		const message = this.#messageEndTransform(clientId, nodes);
		this.#broadcast(message, clientId);
	}

	#broadcastUpdateCamera ( clientId ) {
		console.log(`ServerManager - #broadcastUpdateCamera ${clientId}`);
		
		const viewMatrix = this.#clientsManager.getviewMatrix(clientId);
		const message = this.#messageUpdateCamera(clientId, viewMatrix.toArray());
		this.#broadcast(message, clientId);
	}

	#broadcastStartPointer ( clientId ) {
		console.log(`ServerManager - #broadcastStartPointer ${clientId}`);

		const message = this.#messageStartPointer(clientId);
		this.#broadcast(message, clientId);
	}

	#broadcastUpdatePointer ( clientId ) {
		console.log(`ServerManager - #broadcastUpdatePointer ${clientId}`);

		const pointer = this.#clientsManager.getPointer(clientId);
		const pointerArrays = {
			origin: pointer.origin.toArray(),
			end: pointer.end.toArray(),
		}

		const message = this.#messageUpdatePointer(clientId, pointerArrays);
		this.#broadcast(message, clientId);
	}

	#broadcastEndPointer ( clientId ) {
		console.log(`ServerManager - #broadcastEndPointer ${clientId}`);

		const message = this.#messageEndPointer(clientId);
		this.#broadcast(message, clientId);
	}

	#broadcastAddMarker ( clientId, marker ) {
		console.log(`ServerManager - #broadcastAddMarker ${clientId}`);
		
		const markerArrays = {
			id: marker.id,
			origin: marker.origin.toArray(),
			end: marker.end.toArray(),
			// annotation: marker.annotation,
			// color: marker.color.toArray()
		}

		const message = this.#messageAddMarker(clientId, markerArrays);
		this.#broadcast(message, clientId);
	}

	#broadcastDeleteMarker ( clientId, marker ) {
		console.log(`ServerManager - #broadcastAddMarker ${clientId}`);
		
		const markerArrays = {
			id: marker.id,
			// annotation: marker.annotation,
			// color: marker.color.toArray()
		}

		const message = this.#messageDeleteMarker(clientId, markerArrays);
		this.#broadcast(message, clientId);
	}

	#newUserUpdateData ( clientId ) {
		this.#newUserUpdateUsers(clientId);
		this.#newUserUpdateCameras(clientId);
		this.#newUserUpdatePointers(clientId);
		this.#newUserUpdateMarkers(clientId);
		this.#newUserUpdateTransforms(clientId);
	}

	#newUserUpdateUsers ( clientId ) {
		const socket = this.#clientsManager.getSocket(clientId);

		for ( const clientId1 in this.#clientsManager.clients ) {
			if( clientId1 == clientId ) 
				continue;

			socket.send(this.#messageNewUser(clientId1));
		}
	}

	#newUserUpdateTransforms ( clientId ) {
		console.log(`ServerManager - #newUserUpdateTransforms ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);

		for ( const {name, matrix} of this.#sceneDescriptor.nodesData ) {
			const nodes = [{name, matrix: matrix.toArray()}];
			const message = this.#messageUpdateTransform(this.#serverId, nodes);
			socket.send(message);
		}
		/// for multi node message, concatenate array before send
	}

	#newUserUpdateCameras ( clientId ) {
		console.log(`ServerManager - #newUserUpdateCameras ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);

		for ( const {client, viewMatrix} of this.#clientsManager.clientsData ) {
			if( client == clientId ) 
				continue;
			
			socket.send(this.#messageUpdateCamera(client, viewMatrix.toArray()));
		}
	}

	#newUserUpdatePointers ( clientId ) {
		console.log(`ServerManager - #newUserUpdatePointers ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);

		for ( const {client, pointer} of this.#clientsManager.clientsData ) {
			if( client == clientId ) 
				continue;

			if( pointer === null )
				continue;

			const pointerArrays = {
				origin: pointer.origin.toArray(),
				end: pointer.end.toArray(),
			}

			socket.send(this.#messageStartPointer(client));
			socket.send(this.#messageUpdatePointer(client, pointerArrays));
		}
	}

	#newUserUpdateMarkers ( clientId ) {
		console.log(`ServerManager - #newUserUpdateMarkers ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);

		for ( const {client, markers} of this.#clientsManager.clientsData ) {
			if( client == clientId ) 
				continue;

			for ( const marker of markers ) {
				console.log(marker);
				const markerArrays = {
					id: marker.id,
					origin: marker.origin.toArray(),
					end: marker.end.toArray(),
				}
				socket.send(this.#messageAddMarker(client, markerArrays));
			}
		}
	}

	#messageUpdateCamera ( clientId, viewMatrix ) {
		console.log(`ServerManager - #messageUpdateCamera ${clientId}`);

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
				origin: marker.origin,
                end: marker.end,
			}
		}
		const message = JSON.stringify(messageData);

		return message;
	}

	#messageDeleteMarker ( clientId, marker ) {
		console.log(`ServerManager - #messageDeleteMarker ${clientId}`);
		
		const messageData = {
			senderId: clientId,
			command: Commands.DELETE_MARKER,
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
