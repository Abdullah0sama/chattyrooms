const socket = io();
const sendBtn = document.querySelector('#sendBtn');
const inputMessage = document.querySelector('#message');
const chatRooms = document.querySelectorAll('.chat-room');
const roomsGroup = document.querySelector('.rooms');
const messagesGroup  = document.querySelector('.chat-messages');
const roomHeader          = document.querySelector('.room-header');
const joinedRoomsContainer = document.querySelector('.joinedRooms');
const otherRoomsContainer = document.querySelector('.otherRooms');

const selectedRoom = {};
const messages = {};
let me;
let joinedRooms = [];
let otherRooms = [] ;

socket.emit('refresh rooms');

sendBtn.addEventListener('click', () => {
    let msg = {
        room: {
            id: selectedRoom.id
        },
        body: inputMessage.value,
        user: me,
        time: Date.now()
    };
    
    if(msg.body == '') return;
    
    addMessage(msg);
    socket.emit('chat message', msg);
    
    inputMessage.value = '';
});



socket.on('rooms', (joined, other) => {

    otherRoomsContainer.innerHTML = other.map(room => roomNode(room, true)).join('');
    joinedRoomsContainer.innerHTML = joined.map(room => roomNode(room, false)).join('');
    
    joinedRooms = joined;
    joinedRooms.forEach( (joinedRoom) => getOldMessages(joinedRoom._id) );

});


socket.on('chat message', (msg) => {
    addMessage(msg);
});


// Get information about connected client
socket.once('whoami',  (user) => {
    me = user;
    displayUsername(user.username);
});


socket.on('error', (msg) => {
    console.log(msg);
});

socket.onAny( (events, ...args) => {
    console.log(events, args);
});



// Selects room which user chose and displays its messages  
function selectRoom(event) {
    event.stopPropagation();
    if(event.target.id == selectedRoom.id) return ;

    selectedRoom.id = event.target.id;
    if(selectedRoom.node != null) selectedRoom.node.classList.remove('active-chat');

    if(selectedRoom.id != null) {
        selectedRoom.node = event.target;

        selectedRoom.name = selectedRoom.node.getAttribute('name');
        selectedRoom.node.classList.add('active-chat');
        
        roomHeader.innerHTML = selectedRoom.name;
        messagesGroup.innerHTML = '';

        if(messages[selectedRoom.id] != null) {
            messagesGroup.innerHTML = messages[selectedRoom.id].map(createMsgNode).join('');
            messagesGroup.scroll(0, messagesGroup.scrollHeight);
        }
        
    }
}


// Adds message and displays it is in the selected room     
function addMessage(msg) {

    addMessageToStorage(msg);

    if(selectedRoom.id == msg.room.id) {
        messagesGroup.innerHTML += createMsgNode(msg);
        messagesGroup.scrollTo(0, messagesGroup.scrollHeight);
    }

}

// Add message to storage
function addMessageToStorage(msg) {
    if(messages[msg.room.id] == null) {
        messages[msg.room.id] = [];
    }
    messages[msg.room.id].push(msg);
}


// Create html tag for message
function createMsgNode(msg) {
    let meClass = '';
    if(msg.user.username == me.username) meClass = 'me';
    return `<div class="d-flex fs-6 align-items-stretch  ${meClass} message  ">
                <div class="user-name align-middle d-flex align-items-center  text-dark">
                    <span class="text-center w-100">${msg.user.username}</span>
                </div>
                <p class="m-0  text-light text-break">${msg.body}<br>
                <span class="float-end">${new Date(msg.time).toLocaleString()}</span></p>
            </div>
                `;
}


function roomNode(room, notJoined) {
    let attributes = 'onclick=selectRoom(event)';
    if (notJoined) attributes = 'data-bs-toggle="modal" data-bs-target="#joinModal"';

    return `<div type="button" class="chat-room p-3 text-light" data-name= "${room.name}" data-status="${room.status}" 
            name="${room.name}" id="${room._id}" ${attributes} data-id="${room._id}">
                <span>${room.name}</span>
            </div>
        `;
}

const joinModal                 = document.querySelector('#joinModal');
const joinModalButton           = document.querySelector('#joinModal #modal-submit');
const modalRoomName             = document.querySelector('#modal-room-name');
const modalRoomId               = document.querySelector('#modal-room-id');
const modalRoomPassword         = document.querySelector('#modal-room-password');
const modalRoomPasswordInput    = document.querySelector('#modal-room-password input');

joinModal.addEventListener('show.bs.modal', function(event) {
    let button = event.relatedTarget;
    modalRoomName.value = button.dataset.name;
    modalRoomId.value = button.id;
    modalRoomPasswordInput.value = '';
    if (button.dataset.status == 'private') modalRoomPassword.classList.remove('d-none');
    else if (button.dataset.status == 'public') modalRoomPassword.classList.add('d-none');

});

function sendJoinRequest(event) {
    let roomId = modalRoomId.value;
    let roomPassword = modalRoomPasswordInput.value;
    
    fetch(`/room/${roomId}/join`, {
        method: 'POST', 
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'roomPassword='+encodeURIComponent(roomPassword)
    }).then( (res) => {
        
        if (res.status == 200) {
            document.querySelector('#joinModal .btn-close').click();
            document.querySelector(`.otherRooms [data-id='${roomId}']`).remove();
        }
    }).catch( (err) => {
        console.log(err);
    });

    
};

joinModalButton.addEventListener('click', sendJoinRequest);


const modalCreateForm = document.querySelector('#createModalForm');

modalCreateForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new URLSearchParams( new FormData(event.target) );
    if (!data.has('room[status]')) data.set('room[status]', 'public'), data.delete('room[password]');
    fetch('/room', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: data
    }).then( (res) => {
        if (res.status == 200) {
            document.querySelector('#createModal .btn-close').click();
            // socket.emit('refresh rooms');
        }
        return res.json();
    }).then( (json) => {
        console.log(json);
    }).catch ( (err) => {
        console.log(err);
    });
});

function getOldMessages (roomId) {
    
    return fetch(`/room/${roomId}`)
        .then( (response) => response.json())
        .then( (messages) => {
            messages.forEach(message => {
                addMessage(message);
            });
        })
        .catch( (err) => {
            console.log(err);
        });
}

socket.on('new room', (roomData) => {
    
    otherRooms.push(roomData);
    otherRoomsContainer.innerHTML += roomNode(roomData, true);

});

socket.on('joined new room', (roomData) => {

    joinedRooms.push(roomData);
    joinedRoomsContainer.innerHTML += roomNode(roomData, false);
    getOldMessages(roomData._id);
});

function displayUsername (username) {
    document.querySelector('#display-username').innerHTML = username;
}