import { WebSocketServer, WebSocket } from "ws";
import ClientsManager from "./ClientsManager.js";
import Commands from "./Commands.js";
import SceneDescriptor from "./SceneDescriptor.js";
import { Matrix4, Vector3, Color } from "./three/three.module.js";
import * as Messages from "./Messages.js";

export default class ServerManager {
	#server;
	#serverId = Commands.SERVER_ID;
	#clientsManager = new ClientsManager();
	#sceneDescriptor = new SceneDescriptor();

	#commandsHandlers = {
		[Commands.SELECT]:
			( userId, data ) => this.#handleSelect(userId, data.nodes),
		[Commands.DESELECT]:
			( userId, data ) => this.#handleDeselect(userId, data.nodes),
		[Commands.START_TRANSFORM]:
			( userId, data ) => this.#handleStartTransform(userId, data.nodes),
		[Commands.UPDATE_TRANSFORM]:
			( userId, data ) => this.#handleUpdateTransform(userId, data.nodes),
		[Commands.END_TRANSFORM]:
			( userId, data ) => this.#handleEndTransform(userId, data.nodes),
		[Commands.UPDATE_CAMERA]:
			( userId, data ) => this.#handleUpdateCamera(userId, data.viewMatrix),
		[Commands.START_POINTER]:
			( userId, data ) => this.#handleStartPointer(userId),
		[Commands.UPDATE_POINTER]:
			( userId, data ) => this.#handleUpdatePointer(userId, data.pointer),
		[Commands.END_POINTER]:
			( userId, data ) => this.#handleEndPointer(userId),
		[Commands.ADD_MARKER]:
			( userId, data ) => this.#handleAddMarker(userId, data.marker),
		// [Commands.UPDATE_MARKER]:
		// 	console.log(data.command),
		[Commands.DELETE_MARKER]:
			( userId, data ) => this.#handleDeleteMarker(userId, data.marker),
		[Commands.ADD_PRIMITIVE]:
			( userId, data ) => this.#handleAddPrimitive(userId, data.primitive),
		[Commands.LAMBDA]:
			( userId, data ) => this.#handleLambda(userId, data),
		
	}

	#log = {
		primitives: new Map( ),
	}

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

	#handleMessage ( clientId, message ) {
        console.log(`ServerManager - #handleMessage ${clientId}`);

		const messageData = JSON.parse(message);

		const handlerFunction = this.#commandsHandlers[messageData.command];
		if ( handlerFunction ) {
			handlerFunction(clientId, messageData);
		}
		else {
			console.log(`Unknown command ${clientId} ${messageData.command}`);
		}
	}

	#handleNewUser ( clientId ) {
        console.log(`ServerManager - #handleNewUser ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);
		socket.send(Messages.setUser(clientId));

		this.#newUserUpdateData(clientId);

		const message = Messages.newUser(clientId);
		this.#broadcast(message, clientId);
		// this.#broadcastNewUser(clientId);
	}

	#handleClose( clientId ) {
        console.log(`ServerManager - #handleClose ${clientId}`);

		for ( const nodeId of this.#clientsManager.selectedNodes(clientId) ) {
			console.log(nodeId);
			// const node = this.#sceneDescriptor.getNode(nodeId);
			this.#sceneDescriptor.deselectNode(nodeId);
			
			this.#clientsManager.deselectNode(clientId, nodeId);

			/// handling multiselection and deselection will clean this up
			const message = Messages.deselect(clientId, [{name: nodeId, extras: { nodeId }}]);
			this.#broadcast(message);
		}

		const pointerMessage = Messages.endPointer(clientId);
		this.#broadcast(pointerMessage);

		this.#clientsManager.removeClient(clientId);
		// this.#broadcastRemoveUser(clientId);


		const message = Messages.removeUser(clientId);
		this.#broadcast(message);
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

		const message = Messages.select(clientId, nodes);
		this.#broadcast(message);

		this.#clientsManager.selectNode(clientId, nodes[0].extras.nodeId);
	}

	#handleDeselect ( clientId, nodes ) {
        console.log(`ServerManager - #handleDeselect ${clientId, nodes[0].name}`);
	
		const nodeId = nodes[0].extras.nodeId;
		// const node = this.#sceneDescriptor.getNode(nodes[0].name);
		this.#sceneDescriptor.deselectNode(nodeId);

		const message = Messages.deselect(clientId, nodes);
		this.#broadcast(message);

		this.#clientsManager.deselectNode(clientId, nodeId);
	}

	#handleUpdateCamera ( clientId, matrix ) {
        console.log(`ServerManager - #handleUpdateCamera ${clientId}`);

		this.#clientsManager.setviewMatrix(clientId, new Matrix4().fromArray(matrix));
		
		const message = Messages.updateCamera(clientId, matrix);
		this.#broadcast(message, clientId);
	}

	#handleStartPointer ( clientId ) {
        console.log(`ServerManager - #handleStartPointer ${clientId}`);

		this.#clientsManager.setPointerStatus(clientId, true);

		const message = Messages.startPointer(clientId);
		this.#broadcast(message, clientId);
	}

	#handleUpdatePointer ( clientId, pointer ) {
        console.log(`ServerManager - #handleUpdatePointer ${clientId}`);
		
		this.#clientsManager.setPointer(clientId, {
			origin: new Vector3(...pointer.origin),
			end: new Vector3(...pointer.end),
		});

		const message = Messages.updatePointer(clientId, pointer);
		this.#broadcast(message, clientId);
	}

	#handleEndPointer ( clientId ) {
        console.log(`ServerManager - #handleEndPointer ${clientId}`);

		this.#clientsManager.setPointerStatus(clientId, false);

		const message = Messages.endPointer(clientId);
		this.#broadcast(message, clientId);
	}

	#handleStartTransform ( clientId, nodes ) {
		console.log(`ServerManager - #handleStartTransform ${clientId}`);
		
		/// logic for history

		const message = Messages.startTransform(clientId, nodes);
		this.#broadcast(message, clientId);
	}

	#handleUpdateTransform ( clientId, nodes ) {
		console.log(`ServerManager - #handleUpdateTransform ${clientId}`);
		
		const nodeId = nodes[0].extras.nodeId;
		const matrix = new Matrix4().fromArray(nodes[0].matrix);
		
		this.#sceneDescriptor.setMatrix(nodeId, matrix);

		const message = Messages.updateTransform(clientId, nodes);
		this.#broadcast(message, clientId);
	}

	#handleEndTransform ( clientId, nodes ) {
		console.log(`ServerManager - #handleEndTransform ${clientId}`);
		
		/// logic for history

		const message = Messages.endTransform(clientId, nodes);
		this.#broadcast(message, clientId);
	}

	#handleAddMarker ( clientId, markerData ) {
		console.log(`ServerManager - #handleAddMarker ${clientId}`);

		const marker = {
			id: markerData.id,
			origin: new Vector3(...markerData.origin),
			end: new Vector3(...markerData.end),
			color: new Color(...markerData.color),
		}

		this.#clientsManager.addMarker(clientId, marker);

		const message = Messages.addMarker(clientId, markerData);
		this.#broadcast(message, clientId);
	}

	#handleAddPrimitive ( clientId, primitiveData ) {
		console.log(`ServerManager - #handleAddPrimitive ${clientId}`);
		console.log(primitiveData);
		
		const nodeId = this.#sceneDescriptor.addNode({
			name: primitiveData.name || `Primitive${this.#log.primitives.size}_${primitiveData.type}`,
			matrix: primitiveData.matrix,
		});

		primitiveData.nodeId = nodeId;
		this.#log.primitives.set( nodeId, primitiveData );
		primitiveData.name = this.#sceneDescriptor.getNodeName(nodeId);

		const message = Messages.addPrimitive( clientId, primitiveData );
		this.#broadcast( message );
	}

	#handleLambda ( clientId, data ) {
		console.log(`ServerManager - #handleAddMarker ${clientId}`);

		const message = Messages.lambda( clientId, data );

		this.#broadcast(message, data?.all ? undefined : clientId );
	}

	#handleDeleteMarker ( clientId, markerData ) {
		console.log(`ServerManager - #handleDeleteMarker ${clientId}`);

		const marker = {
			id: markerData.id,
		}

		this.#clientsManager.deleteMarker(clientId, marker);

		const message = Messages.deleteMarker(clientId, markerData);
		this.#broadcast(message, clientId);
	}

	#broadcast ( message = {}, excludedId = undefined ) {
		for ( const {client, socket} of this.#clientsManager.clientsData ) {
			if( excludedId !== undefined && client == excludedId ) 
				continue;

			socket.send(message);
		}
	}

	#newUserUpdateData ( clientId ) {
		this.#newUserUpdateScene(clientId);
		this.#newUserUpdateUsers(clientId);
		this.#newUserUpdateCameras(clientId);
		this.#newUserUpdatePointers(clientId);
		this.#newUserUpdateMarkers(clientId);
		this.#newUserUpdateTransforms(clientId);
		this.#newUserUpdateSelections(clientId);
	}

	#newUserUpdateScene ( clientId ) { /// update added primitives 
		console.log(`ServerManager - #newUserUpdateScene ${clientId}`);
		
		const socket = this.#clientsManager.getSocket(clientId);
		for ( const data of this.#log.primitives ) {
			socket.send(Messages.addPrimitive(this.#serverId, data[1]));
		}
	}

	#newUserUpdateUsers ( clientId ) {
		console.log(`ServerManager - #newUserUpdateUsers ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);

		for ( const clientId1 in this.#clientsManager.clients ) {
			if( clientId1 == clientId ) 
				continue;

			socket.send(Messages.newUser(clientId1));
		}
	}

	#newUserUpdateSelections ( clientId ) {
		console.log(`ServerManager - #newUserUpdateSelections ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);

		for ( const {client} of this.#clientsManager.clientsData ) {
			for ( const nodeId of this.#clientsManager.selectedNodes(client) ) {
				socket.send(Messages.select(client, [{name: nodeId, extras: { nodeId }}]));
			}
		}
	}

	#newUserUpdateTransforms ( clientId ) {
		console.log(`ServerManager - #newUserUpdateTransforms ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);

		for ( const {node, name, matrix} of this.#sceneDescriptor.nodesData ) {
			const nodes = [{name, matrix: matrix.toArray(), extras: { nodeId: node }}];
			socket.send(Messages.updateTransform(this.#serverId, nodes));
		}
		/// for multi node message, concatenate array before send
	}

	#newUserUpdateCameras ( clientId ) {
		console.log(`ServerManager - #newUserUpdateCameras ${clientId}`);

		const socket = this.#clientsManager.getSocket(clientId);

		for ( const {client, viewMatrix} of this.#clientsManager.clientsData ) {
			if( client == clientId ) 
				continue;
			
			socket.send(Messages.updateCamera(client, viewMatrix.toArray()));
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

			socket.send(Messages.startPointer(client));
			socket.send(Messages.updatePointer(client, pointerArrays));
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
					color: marker.color.toArray(),
				}
				socket.send(Messages.addMarker(client, markerArrays));
			}
		}
	}


	async loadFile ( gltf ) {
		const gltfData = JSON.parse(gltf);
		// console.log(gltfData);
		this.#sceneDescriptor.loadGLTF(gltfData);
	}
}
