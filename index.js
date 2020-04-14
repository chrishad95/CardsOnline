
const express = require('express');
const path = require('path');
const uuid = require('uuid');


const app = express();

const PORT = process.env.PORT || 5000;

app.set('view engine', 'ejs');


app.get('/', (req, res) => {
	res.render('index');
});

app.use(express.static(path.join(__dirname, 'public')));

server = app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

var game = {};
game.players = {};
game.users = {};

game.number_of_players = 0;
game.connection_count = 0;
game.deck = []; 
game.board = [];
game.type = "hearts";
game.random_seats = "off";


game.started = false;

const io = require("socket.io")(server);

io.on('connection', (socket) => {
	game.connection_count++;

	socket.username = 'Anonymous' + game.connection_count;
	socket.uuid = uuid.v4();
	
	console.log('New user connected...' + socket.username);
	chatbotMessage("" + socket.username + " has joined the chat.");

	if (game.number_of_players < 5 && !game.started) {
		game.players[socket.uuid] = socket;
		game.number_of_players++;
		console.log(socket.username + " has joined the game.");	
		chatbotMessage(socket.username + " has joined the game.");	
	}


	socket.on('disconnect',  () => {
		console.log("" + socket.username + " has disconnected.");
		chatbotMessage("" + socket.username + " has left the chat.");
	});

	socket.on('join_game', () => {
		if (socket.uuid in game.players) {
		} else {
			if (game.number_of_players < 5 && !game.started) {
				game.players[socket.uuid] = socket;
				game.number_of_players++;
				console.log(socket.username + " has joined the game.");	
				chatbotMessage(socket.username + " has joined the game.");	
			}
		}
	});

	socket.on('leave_game', () => {
		// check to see if the game has started?

		if (socket.uuid in game.players) {
			delete game.players[socket.uuid];
			game.number_of_players--;
			console.log(socket.username + " has left the game.");	
			chatbotMessage(socket.username + " has left the game.");	
		}


	});

	socket.on('change_username', (data) => {
		if (data.username.indexOf("chatbot") < 0) {
			var old_username = socket.username;
			socket.username = data.username;
			chatbotMessage("" + old_username + " is now known as " + socket.username);
		}
	});

	socket.on('new_message', (data) => {
		io.sockets.emit('new_message', {message: data.message, username: socket.username});
	});

	socket.on('list_players', (data) => {
		var player_names = [];
		for (p in game.players) {
			player_names.push( game.players[p].username);
		}
		console.log("Sending player names: " + player_names)
		socket.emit('players_list', {"players": player_names});
		socket.emit('new_message', {message: "Players: " + player_names , username: "chatbot"});
	});
	socket.on('list_users', () => {
		var player_names = [];
		for (p in game.players) {
			player_names.push( game.players[p].username);
		}
		console.log("Sending player names: " + player_names)
		socket.emit('players_list', {"players": player_names});
		socket.emit('new_message', {message: "Players: " + player_names , username: "chatbot"});
	});

	socket.on('shuffle', () => {
	});

	socket.on('new_hand', () => {
		game.started = true;
		create_deck();
		chatbotMessage("The deck was shuffled, a new hand is ready to deal");

	});

	socket.on('cards', () => {
		socket.emit('new_message', {message: "Your cards: " + game.players[socket.uuid].cards , username: "chatbot"});

	});

	socket.on('pass', (data) => {
		if (game.players[socket.uuid].passed_cards.length < 3) {
			card = data.card;
			console.log(socket.username + " is passing " + card);
			if (game.players[socket.uuid].cards.indexOf(card) >= 0) {
				game.players[socket.uuid].passed_cards.push(card);
				game.players[socket.uuid].cards.splice(game.players[socket.uuid].cards.indexOf(card) , 1);
			}
		}
		socket.emit('passed_cards', {passed_cards: game.players[socket.uuid].passed_cards});
		// once the all players have passed 3 cards, pass the cards to the player
		// that gets them

	});

	socket.on('deal_cards', () => {
		if (game.type == "hearts") {
			if (game.number_of_players == 3) {
				// remove the 2D card
				game.deck = game.deck.filter(card => card != '2D');
			}
			if (game.number_of_players == 5) {
				// remove the 2D card and the 2S card
				game.deck = game.deck.filter(card => card != '2D');
				game.deck = game.deck.filter(card => card != '2S');
			}
		}
		deal_cards();
	});


	socket.on('random_seats', (data) => {
		if (data.value == "on") {
			game.random_seats = "on";
		}
		if (data.value == "off") {
			game.random_seats = "off";
		}
		chatbotMessage("Random seats is turned " + game.random_seats);

	});



	// stuff i am not going to use right now.
	socket.on('login', (data) => {
		if (data.username != "" && data.password != "") {
			for (u in game.users) {
				if (game.users[u].username == data.username 
				  && game.users[u].password == data.password) {
					socket.username = data.username;
				}
			}	
		}
	});
	socket.on('set_password', (data) => {
		if (data.username != "" && data.password != "") {
			for (u in game.users) {
				if (game.users[u].username == data.username 
				  && game.users[u].password == data.password) {
					socket.username = data.username;
				}
			}
		}
	});
	socket.on('uuid',  (data) => {
		console.log("Receiving uuid from client: " + data.uuid);
		// find uuid in game.users
		if (data.uuid in game.users) {
			console.log("Found uuid: " + data.uuid + " in game.users.");
			socket.uuid = data.uuid;
			var old_username = socket.username;
			socket.username = game.users[socket.uuid].username;
			chatbotMessage( old_username + " is now known as " + socket.username);
		} else {
			console.log("Could not find uuid: " + data.uuid + " in game.users.");
		}
	});
	socket.on('request_uuid',  (data) => {
		console.log("Client is requesting a uuid.");
		if (socket.uuid == "" || socket.uuid == 'undefined') {
			// uuid is blank, create one
			console.log("Created new uuid for client: " + socket.uuid);
		}
		console.log("Sending uuid to client: " + socket.uuid);
		socket.emit('uuid', {"uuid": socket.uuid});
	});

});


function create_deck () {
	// create an empty deck
	game.deck = []; 

	// take all cards out of player hands
	for (p in game.players){
		game.players[p].cards = [];
		game.players[p].passed_cards = [];
	}

	suits = ['S','H','D','C'];
	ranks = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
	// create the deck
	for (suit in suits) {
		for (rank in ranks){
			game.deck.push(ranks[rank] + suits[suit]);
		}
	}	
	// shuffle the cards
	game.deck.sort(function() {return 0.5 - Math.random()});
}
function deal_cards () {
	while(game.deck.length > 0) {
		for (p in game.players){
			if (game.deck.length > 0) {
				game.players[p].cards.push(game.deck.shift());
			}
		}
	}
	for (p in game.players){
		game.players[p].emit('your hand', {"hand": game.players[p].cards});
		game.players[p].emit('new_message', {message: "Your cards: " + game.players[p].cards , username: "chatbot"});
	}
}

function Player(socket, name){
	this.socket = socket;
	this.name = name;
}

function chatbotMessage(message) {
	io.sockets.emit('new_message', {message: message, username: "chatbot"});
}


