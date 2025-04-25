import AttributesContainer from "./AttributesContainer.js";
import * as THREE from './three/three.module.js';

export default class SceneDescriptor {
    // #nodeManager = new NodesManager();
    #nodeMap = new Map();
    #nodes = new AttributesContainer();
    #nodeName = this.#nodes.addAttribute("name");
    #nodeMatrix = this.#nodes.addAttribute("matrix");
    #nodeChildren = this.#nodes.addAttribute("children");
    #nodeParent = this.#nodes.addAttribute("parent");
    #nodeType = this.#nodes.addAttribute("type");
    #nodeData = this.#nodes.addAttribute("data");
    #roots = new Set();
    /// 0 -> unlocked
    /// 1 -> locked or parent locked
    /// x < 0 -> x children locked
    #locked = this.#nodes.addAttribute("locked");

    constructor ( ) {
		console.log("SceneDescriptor - constructor");

    }

    loadGLTF ( gltf ) {
		console.log("SceneDescriptor - loadGLTF");

        for( const nodeData of gltf.nodes ) {
			const node = this.#addNode(nodeData);
		}

        this.#nodes.forEach(node => {
            this.#setParentage(node);
        });

        this.#unlockAllNodes();

        // this.#nodes.forEach(node => {
        //     console.log(
        //         node,
        //         this.#nodeName[node],
        //         this.#nodeChildren[node], 
        //         this.#nodeParent[node], 
        //         this.#nodeType[node], 
        //         this.#nodeData[node],
        //         this.#nodeMatrix[node],
        //         this.#locked[node],
        //     );
        // });
    }

    #addNode ( nodeData ) {
		// console.log("SceneDescriptor - #addNode");
        
        const node = this.#nodes.newElement();
        this.#nodes.ref(node); 
        this.#nodeName[node] = nodeData.name || `node${node}`;
        this.#nodeMap.set(this.#nodeName[node], node);
        
        this.#nodeMatrix[node] = new THREE.Matrix4();
        if( nodeData.matrix )
            this.#nodeMatrix[node].fromArray(nodeData.matrix);

        this.#nodeChildren[node] = new Set();
        if( nodeData.children ) {
            for( const child of nodeData.children )
                this.#nodeChildren[node].add(child);
        }

        this.#nodeParent[node] = -1;
        this.#roots.add(node);

        this.#nodeData[node] = {};
        if( nodeData.extensions?.KHR_lights_punctual ) {
			this.#nodeType[node] = "light";
			this.#nodeData[node]["light"] = nodeData.extensions?.KHR_lights_punctual.light;
		} else if( nodeData.mesh !== undefined ) {
			this.#nodeType[node] = "mesh";
			this.#nodeData[node]["mesh"] = nodeData.mesh;
		} else {
			this.#nodeType[node] = "empty";
        }

        return node;
    }

    #deleteNode ( node ) {
		console.log("SceneDescriptor - #deleteNode");
        
        this.#nodeMatrix[node].identity();

        for( const childNode of this.#nodeChildren[node] ) {
            this.#nodeParent[childNode] = -1;
            this.#roots.add(childNode); 
        }
        this.#nodeChildren[node].clear();

        const parent = this.#nodeParent[node];
        if( parent != -1 )
            this.#nodeChildren[parent].delete(node); 
        else 
            this.#roots.delete(node);
        this.#nodeParent[node] = -1;

        this.#nodeMap.delete(this.#nodeName[node]);
        this.#nodes.unref(node); 

    }

    #setParentage ( node ) {
        for( const childNode of this.#nodeChildren[node] ) {
            this.#nodeParent[childNode] = node;
            this.#roots.delete(childNode); 
        }
    }

    getNode ( name ) {
        return this.#nodeMap.get(name);
    }

	getNodeName ( node ) {
		return this.#nodeName[node];
	}

	get nodeMap ( ) {
		return new Map(this.#nodeMap);
	}

    setMatrix ( node, matrix ) {
        this.#nodeMatrix[node].copy(matrix);
    }

    getMatrix ( node ) {
        return this.#nodeMatrix[node].clone();
    }

    getWorldMatrix ( node ) {
        const matrix = this.getMatrix(node);
        this.#forAllParents(node, parent => {
            matrix.premultiply(this.getMatrix(parent));
        });
        return matrix;
    }

    getTranslation ( node ) {
        const translation = new THREE.Matrix4();
        return translation.copyPosition(this.#nodeMatrix[node]);
    }

    #removeParent ( node ) {
        const parent = this.#nodeParent[node];
        if( parent != -1 ) {
            this.#nodeChildren[parent].delete(node); 
            this.#nodeParent[node] = -1;
            this.#roots.add(node);
        }
    }

    setParent ( child, parent ) {
        this.#setParent(child, parent);
    }

    #setParent ( child, parent ) {
        if( this.#nodeParent[node] != -1 )
            this.#removeParent(child);
        
        if( parent != -1 ) {
            this.#roots.delete(child); 
            this.#nodeParent[child] = parent;
            this.#nodeChildren[parent].add(child);
        } 
    }

    #forAllParents ( node, func ) {
        let parent = this.#nodeParent[node];
        while( parent != -1 ) {
            func(parent);
            parent = this.#nodeParent[parent];
        }
    }

    #forAllChildren ( node, func ) {
        const children = [...this.#nodeChildren[node]];
        for( let i = 0; i < children.length; ++i ) {
            const child = children[i];
            func(child);
            children.push(...this.#nodeChildren[child])
        }
    }

    #lockBranch ( node ) {
        this.#locked[node] = 1;
        
        this.#forAllParents(node, parent => {
            this.#locked[parent] -= 1; 
        });

        this.#forAllChildren(node, child => {
            this.#locked[child] = 1; 
        });
    }

    #unlockBranch ( node ) {
        this.#locked[node] = 0;
        
        this.#forAllParents(node, parent => {
            this.#locked[parent] += 1; 
        });

        this.#forAllChildren(node, child => {
            this.#locked[child] = 0; 
        });
    }
    
    #unlockAllNodes ( ) {
        this.#nodes.forEach(node => {
            this.#locked[node] = 0;
        });
    }

    selectNode ( node ) {
        console.log(`SceneDescriptor - selectNode - ${node}`);
        if ( this.#locked[node] != 0 )
            return false;

        this.#lockBranch(node);
        console.log(this.#locked)
        return true;
    }

    deselectNode ( node ) {
        console.log(`SceneDescriptor - deselectNode - ${node}`);
        this.#unlockBranch(node);
    }

	*#nodesIterator ( ) {
		for( const node of this.#nodes.elements() ) {
			yield node;
		}
	}

	get nodes ( ) {
		return [...this.#nodesIterator()];
	}

	*#nodesDataIterator ( ) {
		for( const node of this.#nodes.elements() ) {
			yield {
				node: node,
				name: this.#nodeName[node],
				matrix: this.#nodeMatrix[node],
				// parent: this.#nodeParent[node],
			};
		}
	}

	get nodesData ( ) {
		return [...this.#nodesDataIterator()];
	}
}