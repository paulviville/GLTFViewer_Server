import AttributeContainer from "./AttributesContainer.js";
import { Matrix4, Vector3 } from "./three.module.js";

export default class ClientsManager {
	/// unique id Uint32 max value
	static serverId = 0xFFFFFFFF;

    #clients = new AttributeContainer()
    #socket = this.#clients.addAttribute("socket");
    #viewMatrix = this.#clients.addAttribute("viewMatrix");
    #pointer = this.#clients.addAttribute("pointer");
    #markers = this.#clients.addAttribute("markers");



    constructor ( ) {
        console.log(`ClientsManager - constructor`);
    }

    createClient ( ) {
        console.log(`ClientsManager - createClient`);

        const client = this.#clients.newElement();
        this.#clients.ref(client);

		this.#viewMatrix[client] = new Matrix4();
		this.#pointer[client] = null;
        this.#markers[client] = []; /// change to dynamic allocation markerContainer

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

        this.#clients.unref(client); 
    }

	getviewMatrix ( clientId ) {
        return this.#viewMatrix[clientId].clone();
    }

    setviewMatrix ( clientId, viewMatrix ) {
        this.#viewMatrix[clientId].copy(viewMatrix);
    }

    setPointerStatus ( clientId, status ) {
        if( status ) {
            this.#pointer[clientId] = {
                origin: new Vector3(),
                end: new Vector3(),
            };
        }
        else {
            this.#pointer[clientId] = null;
        }        
    }

    *#clientsIterator ( ) {
		for( const client of this.#clients.elements() ) {
			yield client;
		}
	}

	*#clientsDataIterator ( ) {
		for( const client of this.#clients.elements() ) {
			yield {
				client: client,
				socket: this.#socket[client],
				viewMatrix: this.#viewMatrix[client].clone(),
                pointer: this.#pointer[client], /// add cloning logic with nullish logic
                markers: [...this.#markers[client]],
			};
		}
	}

	get clients ( ) {
		return [...this.#clientsIterator()];
	}

	get clientsData ( ) {
		return [...this.#clientsDataIterator()];
	}
}