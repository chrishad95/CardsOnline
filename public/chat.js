
$(function(){
   	//make connection
	var socket = io.connect('http://localhost:5000')

	//buttons and inputs
	var message = $("#message")
	var username = $("#username")
	var send_message = $("#send_message")
	var send_username = $("#send_username")
	var list_players = $("#list_players")
	var chatroom = $("#chatroom")
	var feedback = $("#feedback")

	//Emit message
	send_message.click(function(){
		socket.emit('new_message', {message : message.val()})
	})

	//Emit message
	list_players.click(function(){
		socket.emit('list_players', {})
	})
	//Listen on new_message
	socket.on("new_message", (data) => {
		feedback.html('');
		message.val('');
		chatroom.append("<p class='message'>" + data.username + ": " + data.message + "</p>")
	})

	//Emit a username
	send_username.click(function(){
		socket.emit('change_username', {username : username.val()})
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
				socket.emit('list_players');
			} else if (t.substr(0,6) == '/clear') {

    			$("#chatroom").val("");
			} else
			{
				socket.emit('new_message', {message: this.value});
			}
			this.value = '';
		}

	});

});


