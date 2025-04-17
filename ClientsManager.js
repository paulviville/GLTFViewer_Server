import AttributeContainer from "./AttributesContainer.js";
import { Matrix4 } from "./three.module.js";

export default class ClientsManager {
    // #clientsMap = new Map();
    #clients = new AttributeContainer()
    // #clientId = this.#clients.addAttribute("clientId");
    #socket = this.#clients.addAttribute("socket");
    // #clientViewMatrix = this.#clients.addAttribute("clientViewMatrix");

    constructor ( ) {
        console.log(`ClientsManager - constructor`);

    }

    createClient ( ) {
        console.log(`ClientsManager - createClient`);

        const client = this.#clients.newElement();
        this.#clients.ref(client);

        return client;
    }

    setSocket ( client, socket ) {
        this.#socket[client] = socket;
    }

    getSocket ( client ) {
        return this.#socket[client];
    }

    // addClient ( clientId, socket ) {
    //     console.log(`ClientsManager - addClient (${clientId, socket})`);
    //     const client = this.#clients.newElement();
    //     this.#clients.ref(client);
    //     this.#clientId[client] = clientId;
    //     this.#clientSocket[client] = socket;
    //     this.#clientViewMatrix[client] = new Matrix4();

    //     this.#clientsMap.set(this.#clientId[client], client);
    //     console.log(this.#clientsMap)
    //     return client;
    // }

    removeClient ( client ) {
        console.log(`ClientsManager - removeClient (${client})`);

        this.#clients.unref(client); 
    }

    // setClientViewMatrix ( clientId, viewMatrix ) {
    //     const client = this.getClient(clientId);
    //     this.#clientViewMatrix[client].copy(viewMatrix);
    // }

	*#clientsIterator ( ) {
		for( const client of this.#clients.elements() ) {
			yield client;
		}
	}

	// *#clientsDataIterator ( ) {
	// 	for( const client of this.#clients.elements() ) {
	// 		yield {
	// 			clientId: this.#clientId[client],
	// 			socket: this.#clientSocket[client],
	// 		};
	// 	}
	// }


	// get clientIds ( ) {
	// 	return [...this.#clientsIterator()];	
	// }

	get clients ( ) {
		return [...this.#clientsIterator()];
	}

	// getSocket ( clientId ) {
    //     const client = this.getClient(clientId);
	// 	return this.#clientSocket[client]
	// }
}