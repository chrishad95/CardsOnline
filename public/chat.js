
$(function(){
   	//make connection
	var socket = io.connect('http://localhost:5000')
	var uuid = "";

	//buttons and inputs
	var message = $("#message")
	var username = $("#username")
	var send_message = $("#send_message")
	var chatroom = $("#chatroom")
	var feedback = $("#feedback")

	//Emit message
	send_message.click(function(){
		socket.emit('new_message', {message : message.val()})
	})

	socket.on('connect', () => {
		console.log("Connected...");

		///if (uuid == "" || uuid == 'undefined') {
		///	// client has no uuid, request uuid from server.
		///	socket.emit("request_uuid");
		///} else {
		///	console.log("Send my uuid: " + uuid);
		///	socket.emit('uuid', {"uuid": uuid});
		///}

	});
	socket.on('disconnect', () => {
		console.log ("We have been disconnected...");
	});
	socket.on('passed_cards', (data) => {
		chatroom.append("<p class='message'>You are passing cards: " + data.passed_cards + "</p>")
		$("#chatroom").scrollTop($("#chatroom")[0].scrollHeight);
	});		
	//Listen on new_message
	socket.on("new_message", (data) => {
		feedback.html('');
		message.val('');
		chatroom.append("<p class='message'>" + data.username + ": " + data.message + "</p>")
		$("#chatroom").scrollTop($("#chatroom")[0].scrollHeight);
	})


	//Emit typing
	message.bind("keypress", () => {
		socket.emit('typing')
	})

	//Listen on typing
	socket.on('typing', (data) => {
		feedback.html("<p><i>" + data.username + " is typing a message..." + "</i></p>")
	})
	
	$("#message").keydown(function(e) {
		// enter keydown
		if (e.which == 13 ){
			var t = this.value;
			if (t.substr(0,5) == '/nick') {
				socket.emit('change_username', {username : t.substr(6)})
			} else if (t.startsWith('/shuffle')) {
				socket.emit('shuffle');
			} else if (t.startsWith('/new_hand')) {
				socket.emit('new_hand');
			} else if (t.startsWith('/cards')) {
				socket.emit('cards');
			} else if (t.startsWith('/deal_cards')) {
				socket.emit('deal_cards');
			} else if (t.substr(0,6) == '/login') {
				socket.emit('login', t.substr(7));
			} else if (t.substr(0,4) == '/msg') {
				socket.emit('private message', t.substr(5) );
			} else if (t.startsWith('/list')) {
				socket.emit('list_users');
			} else if (t.startsWith('/players')) {
				socket.emit('list_players');
			} else if (t.startsWith('/join_game')) {
				socket.emit('join_game');
			} else if (t.startsWith('/leave_game')) {
				socket.emit('leave_game');
			} else if (t.startsWith('/new_game')) {
				socket.emit('new_game');
			} else if (t.startsWith('/status')) {
				socket.emit('game_status');
			} else if (t.startsWith('/pass')) {
				var pass_cards =  t.split(" ");
				pass_cards.shift(); // take off /pass in the front
				for(c in pass_cards) {
					socket.emit('pass', {card: pass_cards[c] });
				}
			} else if (t.startsWith('/random_seats')) {
				socket.emit('random_seats', {value: t.split(" ").pop()});
			} else if (t.startsWith('/admin ')) {
				socket.emit('admin', {"command": t} );
			} else if (t.startsWith('/clear')) {
    				$("#chatroom").value="";
			} else
			{
				socket.emit('new_message', {message: this.value});
			}
			this.value = '';
		}

	});

	socket.on("uuid", (data) => {
		//if (uuid == "") {
		//	uuid = data.uuid;
		//} else {
		//	// the server sent a uuid, but we have one already.
		//	socket.emit('uuid', {"uuid": uuid});
		//}
		//$("#chat_url").attr("href", 'http://localhost:5000/?uuid=' + uuid);
		//$("#chat_url").innerHTML = 'http://localhost:5000/?uuid=' + uuid;
		//console.log("uuid=" + uuid);
	});

});


