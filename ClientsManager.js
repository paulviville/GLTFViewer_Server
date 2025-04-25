import AttributeContainer from "./AttributesContainer.js";
import { Matrix4 } from "./three.module.js";

export default class ClientsManager {
	/// unique id Uint32 max value
	static serverId = 0xFFFFFFFF;

    #clients = new AttributeContainer()
    #socket = this.#clients.addAttribute("socket");
    #viewMatrix = this.#clients.addAttribute("viewMatrix");



    constructor ( ) {
        console.log(`ClientsManager - constructor`);
    }

    createClient ( ) {
        console.log(`ClientsManager - createClient`);

        const client = this.#clients.newElement();
        this.#clients.ref(client);

		this.#viewMatrix = new Matrix4();

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

	*#clientsIterator ( ) {
		for( const client of this.#clients.elements() ) {
			yield client;
		}
	}

	*#clientsDataIterator ( ) {
		for( const client of this.#clients.elements() ) {
			yield {
				client: client,
				socket: this.socket[client],
				viewMatrix: this.#viewMatrix[client],
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