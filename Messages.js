import Commands from "./Commands.js";

function createMessage ( senderId, command, data = {} ) {
    const message = {
        senderId,
        command,
        ...data,
    }

    return JSON.stringify(message);
}

export function select ( userId, nodes ) {
    return createMessage(userId, Commands.SELECT, {nodes});
}

export function deselect ( userId, nodes ) {
    return createMessage(userId, Commands.DESELECT, {nodes});
}

export function newUser ( userId ) {
    return createMessage(Commands.SERVER_ID, Commands.NEW_USER, {userId});
}

export function setUser ( userId ) {
    return createMessage(Commands.SERVER_ID, Commands.SET_USER, {userId});
}

export function removeUser ( userId ) {
    return createMessage(Commands.SERVER_ID, Commands.REMOVE_USER, {userId});
}

export function startPointer ( userId ) {
    return createMessage(userId, Commands.START_POINTER);
}

export function endPointer ( userId ) {
    return createMessage(userId, Commands.END_POINTER);
}

export function updatePointer ( userId, pointer ) {
    return createMessage(userId, Commands.UPDATE_POINTER, {pointer});
}

export function updateCamera ( userId, viewMatrix ) {
    return createMessage(userId, Commands.UPDATE_CAMERA, {viewMatrix});
}

export function addMarker ( userId, marker ) {
    return createMessage(userId, Commands.ADD_MARKER, {marker});
}

export function deleteMarker ( userId, marker ) {
    return createMessage(userId, Commands.DELETE_MARKER, {marker});
}

export function updateTransform ( userId, nodes ) {
    return createMessage(userId, Commands.UPDATE_TRANSFORM, {nodes});
}

export function startTransform ( userId, nodes ) {
    return createMessage(userId, Commands.START_TRANSFORM, {nodes});
}

export function endTransform ( userId, nodes ) {
    return createMessage(userId, Commands.END_TRANSFORM, {nodes});
}
