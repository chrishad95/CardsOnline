
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
game.connection_count = 0;
game.players = {};
game.number_of_players = 0;
game.deck = []; 

const io = require("socket.io")(server);

io.on('connection', (socket) => {
	game.connection_count++;
	console.log('New user connected...');
	socket.username = 'Anonymous' + game.connection_count;
	socket.uuid = uuid.v4();
	if (game.number_of_players < 5) {
		game.players[socket.uuid] = socket;
		game.number_of_players++;
	}

	socket.on('change_username', (data) => {
		if (data.username.indexOf("chatbot") < 0) {
			var old_username = socket.username;
			socket.username = data.username;
			io.sockets.emit('new_message', {message: "" + old_username + " is now known as " + socket.username, username: "chatbot"});
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

	socket.on('shuffle', () => {
	});

	socket.on('new_hand', () => {
		create_deck();
		io.sockets.emit('new_message', {message: "The deck was shuffled, a new hand is ready to deal", username: "chatbot"});

	});
	socket.on('cards', () => {
		socket.emit('new_message', {message: "Your cards: " + game.players[socket.uuid].cards , username: "chatbot"});

	});

	socket.on('deal_cards', () => {
		deal_cards();
	});


});


function create_deck () {
	// create an empty deck
	game.deck = []; 

	// take all cards out of player hands
	for (p in game.players){
		game.players[p].cards = [];
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
	for (p in game.players){
		game.players[p].cards = [];
	}
	for (p in game.players){
		// this just deals 2 cards come back to this later
		game.players[p].cards.push(game.deck.shift());
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

