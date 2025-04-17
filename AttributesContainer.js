import Attribute from "./Attribute.js";

/**
 * @class AttributeContainer - a handler for synchronizing attributes
 * Manages element indices
 */

export default class AttributeContainer {
	/**
	 * Map containing all attributes managed by this container keyed by name
	 * @private
	 * @type {Map}
	 */
	#attributes = new Map;

	/**
	 * Index of the next element to create
	 * @private
	 * @type {number}
	 */
	#nextIndex = 0;

	/**
	 * Set of unallocated element indices
	 * @private
	 * @type {Set}
	 */
	#unallocatedIndices = new Set();

	/**
	 * Attribute containing the number of references to each element
	 * @private
	 * @type {Attribute}
	 */
	#refs;

	/**
	 * Currently allocated size for attributes
	 * @private
	 * @type {number}
	 */
	#capacity = 100;

	/**
	 * Creates a new empty attribute container
	 */
	constructor () {
		this.#initialize()
	}

	/**
	 * Sets all attribute container members to default initial values
	 * @private
	 */
	#initialize () {
		this.#refs = this.addAttribute("<refs>");
	}

	/**
	 * Creates a new attribute and prevent duplicate names 
	 * @param {string} attributeName - name of the attribute to create 
	 * @returns {Attribute}
	 */
	addAttribute ( attributeName ) {
		let name = `${attributeName}`;
        let count = 0;
		while( this.#attributes.has(name) ) {
			name = `${attributeName}_${count++}`;
		}

		const attribute = new Attribute(name, this.#capacity);
		this.#attributes.set(name, attribute);
		
		return attribute;
	}

	/**
	 * Gets the named attribute from the attribute map
	 * @param {string} attributeName - attribute to search
	 * @returns {?Attribute}
	 */
	getAttribute ( attributeName ) {
		return this.#attributes.get(attributeName);
	}

	/**
	 * Gets the attribute from container or creates it
	 * @param {string} attributeName - attribute to search or create
	 * @returns {Attribute}
	 */
	getOrAddAttribute ( attributeName ) {
		return this.getAttribute(attributeName) ?? this.addAttribute(attributeName);
	}

	/**
	 * Removes the given attribute from the container and deletes it
	 * @param {Attribute} attribute 
	 */
	removeAttribute ( attribute ) {
		this.#attributes.delete(attribute.name);
		attribute.delete();
	}

	/**
	 * @generator
	 * @yields {Attribute} the next attribute in the container
	 */
	*attributes ( ) {
		yield* this.#attributes.values();
	}

	/**
	 * @return {number} number of attributes in container
	 */
	get nbAttributes ( ) {
		return this.#attributes.size;
	}

	/**
	 * @returns {number|undefined} next empty index
	 */
	#nextUnallocatedIndex ( ) {
        if( this.#unallocatedIndices.size === 0 ) 
            return undefined;

		const index = this.#unallocatedIndices.values().next().value;
		this.#unallocatedIndices.delete(index);
		return index;
	}

	/**
	 * Creates a new element and resizes containers if necessary
	 * @returns {number} id of new initialized element
	 */
	newElement ( ) {
		let id = this.#nextUnallocatedIndex() ?? this.#nextIndex++;
		this.#refs[id] = 0;

		if( this.#nextIndex == this.#capacity )
			this.#resize();

		return id;
	}

	/**
	 * Removes given element from containers
	 * @param {number} index 
	 */
	deleteElement ( index ) {
		this.#refs[index] = -1;
		
		if( index == this.#nextIndex - 1 ) {
			--this.#nextIndex;
            while( this.#unallocatedIndices.has(this.#nextIndex - 1)) {
                this.#unallocatedIndices.delete(this.#nextIndex - 1);
                --this.#nextIndex;
            }
		} else {
			this.#unallocatedIndices.add(index);
		}
	}

	/**
	 * @return {number} number of allocated elements
	 */
	get nbElements ( ) {
		return this.#nextIndex - this.#unallocatedIndices.size;
	}

	/**
	 * Reallocate larger memory for the containers
	 */
	#resize ( ) {
		const capacityIncrease = 100;
		this.#capacity += capacityIncrease;
		for( const attribute of this.attributes() ) {
			attribute.resize(this.#capacity);
		}
	}

	/**
	 * Increases the reference count to given element index
	 * @param {number} index
	 */
	ref ( index ) {
		++this.#refs[index];
	}

	/**
	 * Decreases the reference count to given element index and deletes it if unreferenced
	 * @param {number} index 
	 */
	unref ( index ) {
		if( --this.#refs[index] == 0 )
			this.deleteElement(index);
	}

	/**
	 * Resets the attribute container to initiale values
	 */
	clear ( ) {
        for ( const attributeName of [...this.#attributes.keys()] ) {
            this.removeAttribute(this.#attributes.get(name));
        }

		this.#initialize();
	}

	/**
	 * yields all allocated elements
	 * @generator
	 * @yields {number} next element
	 */
	*elements ( ) {
		for ( let index = 0; index < this.#nextIndex; ++index ) {
			if ( this.#refs[index] >= 0 )
				yield index;
		}
	}

	/**
	 * Applies given lambda to all allocated elements of the container
	 * Breaks if lambda returns true
	 * @param {function} func lambda to apply to all elements
	 * @returns {boolean}
	 */
	forEach ( func ) {
		for ( let index = 0; index < this.#nextIndex; ++index ) {
			if ( this.#refs[index] >= 0 && func(index) )
                return true;
		}
	}
}