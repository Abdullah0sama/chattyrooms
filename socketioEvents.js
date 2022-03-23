const {Server} = require('socket.io');
let io;

const RoomMember    = require('./models/RoomMember');
const Message       = require('./models/Message');
const Room          = require('./models/Room');

function initializeSocketIO (httpServer, session) {

    const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
    
    
    io = new Server(httpServer);
    
    io.use(wrap(session));
    
    io.on('connection', (socket) => {
        const connectedUser = socket.request.session.user;

        if(connectedUser == null) return socket.disconnect();

        console.log(connectedUser);
        socket.join(connectedUser.id);

        socket.on('refresh rooms', async () => {
            
            let joinedRoomsId = await findMyRoomsIds(connectedUser.id);
            let joinedRooms = await Room.find({ '_id': {'$in': joinedRoomsId }}, { 'password': 0 });
            joinedRoomsId.forEach( (roomId => socket.join(roomId)));
            socket.emit('rooms', joinedRooms);
        });
        
        
        socket.emit('whoami', { username: connectedUser.username });
        
        socket.on('disconnect', () => {
            console.log(`User ${connectedUser.username} Disconnected`);
        });
        
        socket.on('chat message', (msg) => {
            if(msg.body == '') return; 
            // Not trusting the user
            msg.user = connectedUser.id;
            msg.time = Date.now();
            
            RoomMember.findOne({ roomID: msg.room.id, userID: msg.user }).then( (foundRelation) => {
                
                // Checking if the user is not joined in the room
                if(foundRelation == null) return socket.emit('error', 'You are not joined in this room.');
    
                // Saving message to the database
                Message.create(msg).catch( (err) => console.log(err) );
                msg.user = connectedUser;
                // Emiting message to all other users in the room
                socket.to(msg.room.id).emit('chat message', msg);
            });
            
        });
        
        console.log(`User ${connectedUser.username} is connected`);
    });
    
}

function findMyRoomsIds (userId) {
    return RoomMember.find({ userID: userId }).then( (joinRequests) => {
        return joinRequests.map( (joinRequest) => joinRequest.roomID);
    });
}

function announceJoiningRoom(userId, roomInfo) {
    io.in(userId).emit('joined new room', roomInfo);

}
function joinRoom(userId, roomId) {
    io.in(userId).socketsJoin(roomId);
}

module.exports = {
    joinRoom,
    announceJoiningRoom,
    initializeSocketIO
}