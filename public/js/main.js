const socket = io();
const sendBtn = document.querySelector('#sendBtn');
const inputMessage = document.querySelector('#message');
const chatRooms = document.querySelectorAll('.chat-room');
const roomsGroup = document.querySelector('.rooms');
const messagesGroup  = document.querySelector('.chat-messages');


const selectedRoom = {};
const messages = {};
let me;

sendBtn.addEventListener('click', () => {
    let msg = {
        room: {
            name: selectedRoom.name,
        },
        body: inputMessage.value,
        user: me,
        time: Date.now()
    };
    if(msg.body == '' || msg.room.name == null) return;
    addMessage(msg);
    socket.emit('chat message', msg);

    inputMessage.value = '';
});



socket.on('chat message', (msg) => {
    addMessage(msg);
});


// Get information about connected client
socket.once('whoami',  (user) => {
    me = user;
});

socket.on('available rooms', (rooms) => {
    rooms.forEach( (room) => {
        roomsGroup.innerHTML +=     `
        <div class="chat-room p-3 text-light" onclick=selectRoom(event) name=${room.name}>
            <span>${room.name}</span>
        </div>
        `;
    });
});

socket.on('error', (msg) => {
    console.log(msg);
});

// socket.onAny( (events, ...args) => {
//     console.log(events, args);
// });



// Selects room which user chose and displays its messages  
function selectRoom(event) {
    event.stopPropagation();
    let nameOfTarget = event.target.getAttribute('name');
    if(selectedRoom.name == nameOfTarget) return ;

    selectedRoom.name = nameOfTarget;

    if(selectedRoom.node != null) selectedRoom.node.classList.remove('active-chat');

    if(selectedRoom.name != null) {

        selectedRoom.node = document.querySelector(`.chat-room[name="${selectedRoom.name}"]`);
        if(selectedRoom.node != null) selectedRoom.node.classList.add('active-chat');

        messagesGroup.innerHTML = '';
        if(messages[selectedRoom.name] != null) {
            let showMessages = '';
            messages[selectedRoom.name].forEach( msg => {
                showMessages += createMsgNode(msg);
            });
            messagesGroup.innerHTML = showMessages;
        }
        
    }
}


// Adds message and displays it if it is sent to the selected room 
function addMessage(msg) {

    addMessageToStorage(msg);

    if(selectedRoom.name == msg.room.name) {
        messagesGroup.innerHTML += createMsgNode(msg);
    }

}

// Add message to storage
function addMessageToStorage(msg) {
    if(messages[msg.room.name] == null) {
        messages[msg.room.name] = [];
    }
    messages[msg.room.name].push(msg);
}


// Create html tag for message
function createMsgNode(msg) {
    let meClass = '';
    if(msg.user.username == me.username) meClass = 'me';
    return `<div class="d-flex fs-6 align-items-stretch  ${meClass} message  ">
                <div class="user-name align-middle d-flex align-items-center  text-dark">
                    <span class="text-center w-100">${msg.user.username}</span>
                </div>
                <p class="m-0 bg-light text-dark">${msg.body}<br>
                <span class="float-end">${new Date(msg.time).toLocaleString()}</span></p>
            </div>
                `;
}

