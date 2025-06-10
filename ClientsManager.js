import AttributeContainer from "./AttributesContainer.js";
import { Matrix4, Vector3 } from "./three/three.module.js";

export default class ClientsManager {
    #clients = new AttributeContainer()
    #socket = this.#clients.addAttribute("socket");
    #viewMatrix = this.#clients.addAttribute("viewMatrix");
    #pointer = this.#clients.addAttribute("pointer");
    #markers = this.#clients.addAttribute("markers");
	#selected = this.#clients.addAttribute("selected");


    constructor ( ) {
        console.log(`ClientsManager - constructor`);
    }

    createClient ( ) {
        console.log(`ClientsManager - createClient`);

        const client = this.#clients.newElement();
        this.#clients.ref(client);

		this.#viewMatrix[client] = new Matrix4();
		this.#pointer[client] = {
            origin: new Vector3(),
            end: new Vector3(),
            on: false,
        };
        this.#markers[client] = new Map();
		this.#selected[client] = new Set();

        return client;
    }

    setSocket ( client, socket ) {
        this.#socket[client] = socket;
    }

    getSocket ( client ) {
        return this.#socket[client];
    }

    removeClient ( client ) {
        console.log(`ClientsManager - removeClient (${client})`);

		/// clear data

        this.#clients.unref(client); 
    }

	getviewMatrix ( clientId ) {
        return this.#viewMatrix[clientId].clone();
    }

    setviewMatrix ( clientId, viewMatrix ) {
        this.#viewMatrix[clientId].copy(viewMatrix);
    }

    setPointerStatus ( clientId, status ) {
        this.#pointer[clientId].origin.set(0,0,0);
        this.#pointer[clientId].end.set(0,0,0);
        this.#pointer[clientId].on = status;
    }

    setPointer ( clientId, pointer ) {
        this.#pointer[clientId].origin.copy(pointer.origin);
        this.#pointer[clientId].end.copy(pointer.end);
    }

    getPointer ( clientId ) {
        const pointer = {
            origin: this.#pointer[clientId].origin.clone(),
            end: this.#pointer[clientId].end.clone(),
            on: this.#pointer.on,
        }

        return pointer;
    }

    addMarker ( clientId, marker ) {
        this.#markers[clientId].set(marker.id, marker);
    }

    deleteMarker ( clientId, marker ) {
        this.#markers[clientId].delete(marker.id);
    }

	selectNode ( clientId, nodeId ) {
		console.log(`ClientManager - selectNode ${nodeId}`);

		this.#selected[clientId].add(nodeId);
	}

	deselectNode ( clientId, nodeId ) {
		this.#selected[clientId].delete(nodeId);
	}

	*selectedNodes ( clientId ) {
		for ( const nodeId of this.#selected[clientId] ) {
			yield nodeId;
		}
	}

    *markers ( clientId ) {
        for ( const marker of this.#markers[clientId] ) {
			yield marker;
		}
    }

    *#clientsIterator ( ) {
		for ( const client of this.#clients.elements() ) {
			yield client;
		}
	}

	*#clientsDataIterator ( ) {
		for ( const client of this.#clients.elements() ) {
			yield {
				client: client,
				socket: this.#socket[client],
				viewMatrix: this.getviewMatrix(client),
                pointer: this.getPointer(client),
                markers: [...this.#markers[client].values()],
				selected: [...this.#selected[client]],
			};
            /// create getters with cloning
		}
	}

	get clients ( ) {
		return [...this.#clientsIterator()];
	}

	get clientsData ( ) {
		return [...this.#clientsDataIterator()];
	}
}