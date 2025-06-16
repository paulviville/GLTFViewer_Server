import { WebSocketServer, WebSocket } from "ws";
import Commands from "./Commands.js";
import ClientsManager from "./ClientsManager.js";
import ServerManager from "./ServerManager.js";

import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";


/// node server.js <port>
const port = process.env.PORT || 8080;

console.log(`port: ${port}`);
const serverManager = new ServerManager(port);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const gltfPath = join(__dirname, 'files/glTF/ABeautifulGame.gltf');
const gltf = await fs.readFile(gltfPath, 'utf-8');
await serverManager.loadFile(gltf);



