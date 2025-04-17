/** 
 * @class Attribute - a named array handled by a container
 * @extends Array
 */
export default class Attribute extends Array {
	/**
	 * Name of the attribute
	 * @private 
	 * @type {string}
	 */
	#name;

	/**
	 * Create a new attribute
	 * @param {string=} name - name of the attribute
	 * @param {number=} length - size of the attribute
	 */
	constructor ( name = "", length = 0 ) {
		super(length);
		this.#name = name;    
	}

	/**
	 * Get the attribute's name
	 * @return {string} name of the attribute 
	 */
	get name () {
		return this.#name;
	}

	// clone () {	}

	// copy ( attribute ) {	}

	/**
	 * Destroys the attribute 
	 */
	delete () {
		this.length = 0;
		this.#name = null;
	}

	/**
	 * Sets the size of the attribute to the given length
	 * @param {number} newLength 
	 */
	resize ( newLength ) {
		this.length = newLength;
	}
}