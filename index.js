
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
game.pass_round = "left"; // left, right, across, none
game.status = "game_over"; //game_over, new_game, new_hand, deal_cards, pass_cards, play_round, resolve_round, calculate_score, check_end_game
game.player_turn = "";
game.player_order = [];

game.type = "hearts";
game.random_seats = "off";
game.auto_join = "on";


game.started = false;

const io = require("socket.io")(server);

io.on('connection', (socket) => {
	game.connection_count++;

	socket.username = 'Anonymous' + game.connection_count;
	socket.uuid = uuid.v4();
	
	console.log('New user connected...' + socket.username);
	chatbotMessageAll("" + socket.username + " has joined the chat.");
	if (game.auto_join == "on") {
		if (game.number_of_players < 5 && !game.started) {
			game.players[socket.uuid] = socket;
			game.number_of_players++;
			console.log(socket.username + " has joined the game.");	
			chatbotMessageAll(socket.username + " has joined the game.");	
		}
	}


	socket.on('disconnect',  () => {
		console.log("" + socket.username + " has disconnected.");
		chatbotMessageAll("" + socket.username + " has left the chat.");
	});

	socket.on('commands', (data) => {
		// tell the user what commands they have available
		socket.emit('new_message', {message: "Available Commands:", username: "chatbot"});
		socket.emit('new_message', {message: "/commands list available commands", username: "chatbot"});
		socket.emit('new_message', {message: "/nick [nickname] change nickname", username: "chatbot"});
		socket.emit('new_message', {message: "/new_game create a new game", username: "chatbot"});
		socket.emit('new_message', {message: "/new_hand start a new hand", username: "chatbot"});
		socket.emit('new_message', {message: "/shuffle shuffle cards", username: "chatbot"});
		socket.emit('new_message', {message: "/cards list cards in your hand", username: "chatbot"});
		socket.emit('new_message', {message: "/deal_cards deal cards to players", username: "chatbot"});
		socket.emit('new_message', {message: "/pass pass cards to player", username: "chatbot"});
		socket.emit('new_message', {message: "/status show game status", username: "chatbot"});
		
	});

	socket.on('new_game', () => {
		if (game.started) {
		} else {
			if (socket.uuid in game.players) {
				if (game.number_of_players >= 3) {
					game.status = "setting up game";
					game.started = true;
					game.pass_round = "left";
					for (p in game.players) {
						game.players[p].score = 0;
						game.player_order.push(game.players[p].uuid);
					}
					if (game.random_seats == "on") {
						game.player_order.sort(function() {return 0.5 - Math.random()});
					}
					game.status = "new_hand";
				} else {
				chatbotMessage("Not enough players. 3 players needed. [" + game.number_of_players + "/3]", socket);
				}
			}
		}
	});

	socket.on('new_hand', () => {
		if (game.status == "new_hand") {
			game.status = "creating deck";
			create_deck();
			chatbotMessageAll("The deck was shuffled, a new hand is ready to deal");
			game.status = "deal_cards";
		}
	});

	socket.on('deal_cards', () => {
		if (game.status == "deal_cards") {
			game.status = "dealing the cards";
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
			if (game.pass_round == "none") {
				game.status = "play_round";
				game.pass_round = "left";
			} else {
				game.status = "pass_cards";
			}
		}
	});

	socket.on('pass', (data) => {
		if (game.status == "pass_cards") {
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
			var pass_cards_complete = true;
			for (p in game.players) {
				if (game.players[p].passed_cards.length < 3) {
					pass_cards_complete = false;
				}
			}
			if (pass_cards_complete) {
				game.updateStatus("Passing cards");

				// pass the cards

				if (game.pass_round == "left") {
					// pass the cards left
					console.log("player order: " + game.player_order);
					if (game.number_of_players == 3) {
						// player 1 gets cards from player 3
						game.players[game.player_order[0]].cards.push(game.players[game.player_order[2]].passed_cards);

						// player 2 gets cards from player 1
						game.players[game.player_order[1]].cards.push(game.players[game.player_order[0]].passed_cards);
						
						// player 3 gets cards from player 2
						game.players[game.player_order[2]].cards.push(game.players[game.player_order[1]].passed_cards);
					}

					if (game.number_of_players == 4) {
						// player 1 gets cards from player 4
						game.players[game.player_order[0]].cards.push(game.players[game.player_order[3]].passed_cards);

						// player 2 gets cards from player 1
						game.players[game.player_order[1]].cards.push(game.players[game.player_order[0]].passed_cards);
						
						// player 3 gets cards from player 2
						game.players[game.player_order[2]].cards.push(game.players[game.player_order[1]].passed_cards);

						// player 4 gets cards from player 3
						game.players[game.player_order[3]].cards.push(game.players[game.player_order[2]].passed_cards);

					}
					if (game.number_of_players == 5) {
						// player 1 gets cards from player 5
						game.players[game.player_order[0]].cards.push(game.players[game.player_order[4]].passed_cards);

						// player 2 gets cards from player 1
						game.players[game.player_order[1]].cards.push(game.players[game.player_order[0]].passed_cards);
						
						// player 3 gets cards from player 2
						game.players[game.player_order[2]].cards.push(game.players[game.player_order[1]].passed_cards);

						// player 4 gets cards from player 3
						game.players[game.player_order[3]].cards.push(game.players[game.player_order[2]].passed_cards);

						// player 5 gets cards from player 4
						game.players[game.player_order[2]].cards.push(game.players[game.player_order[3]].passed_cards);
					}

					game.pass_round = "right";

				} else if (game.pass_round == "right") {
					// pass the cards right

					if (game.number_of_players == 3) {
						// player 1 gets cards from player 2
						game.players[game.player_order[0]].cards.push(game.players[game.player_order[1]].passed_cards);

						// player 2 gets cards from player 3
						game.players[game.player_order[1]].cards.push(game.players[game.player_order[2]].passed_cards);

						// player 3 gets cards from player 1
						game.players[game.player_order[2]].cards.push(game.players[game.player_order[0]].passed_cards);
					}
					
					if (game.number_of_players == 4) {
						// player 1 gets cards from player 2
						game.players[game.player_order[0]].cards.push(game.players[game.player_order[1]].passed_cards);

						// player 2 gets cards from player 3
						game.players[game.player_order[1]].cards.push(game.players[game.player_order[2]].passed_cards);

						// player 3 gets cards from player 4
						game.players[game.player_order[2]].cards.push(game.players[game.player_order[3]].passed_cards);

						// player 4 gets cards from player 1
						game.players[game.player_order[3]].cards.push(game.players[game.player_order[0]].passed_cards);
					}
					if (game.number_of_players == 5) {
						// player 1 gets cards from player 2
						game.players[game.player_order[0]].cards.push(game.players[game.player_order[1]].passed_cards);

						// player 2 gets cards from player 3
						game.players[game.player_order[1]].cards.push(game.players[game.player_order[2]].passed_cards);

						// player 3 gets cards from player 4
						game.players[game.player_order[2]].cards.push(game.players[game.player_order[3]].passed_cards);

						// player 4 gets cards from player 5
						game.players[game.player_order[3]].cards.push(game.players[game.player_order[4]].passed_cards);

						// player 5 gets cards from player 1
						game.players[game.player_order[4]].cards.push(game.players[game.player_order[0]].passed_cards);
					}

					game.pass_round = "across";

				} else if (game.pass_round == "across") {
					// pass the cards across

					if (game.number_of_players == 3) {
						// player 1 gets cards from player 2
						game.players[game.player_order[0]].cards.push(game.players[game.player_order[1]].passed_cards);

						// player 2 gets cards from player 3
						game.players[game.player_order[1]].cards.push(game.players[game.player_order[2]].passed_cards);

						// player 3 gets cards from player 1
						game.players[game.player_order[2]].cards.push(game.players[game.player_order[0]].passed_cards);
					}
					
					if (game.number_of_players == 4) {
						// player 1 gets cards from player 2
						game.players[game.player_order[0]].cards.push(game.players[game.player_order[2]].passed_cards);

						// player 2 gets cards from player 3
						game.players[game.player_order[1]].cards.push(game.players[game.player_order[3]].passed_cards);

						// player 3 gets cards from player 4
						game.players[game.player_order[2]].cards.push(game.players[game.player_order[0]].passed_cards);

						// player 4 gets cards from player 1
						game.players[game.player_order[3]].cards.push(game.players[game.player_order[1]].passed_cards);
					}
					if (game.number_of_players == 5) {
						// player 1 gets cards from player 2
						game.players[game.player_order[0]].cards.push(game.players[game.player_order[3]].passed_cards);

						// player 2 gets cards from player 3
						game.players[game.player_order[1]].cards.push(game.players[game.player_order[4]].passed_cards);

						// player 3 gets cards from player 4
						game.players[game.player_order[2]].cards.push(game.players[game.player_order[0]].passed_cards);

						// player 4 gets cards from player 5
						game.players[game.player_order[3]].cards.push(game.players[game.player_order[1]].passed_cards);

						// player 5 gets cards from player 1
						game.players[game.player_order[4]].cards.push(game.players[game.player_order[2]].passed_cards);
					}

					game.pass_round = "none";
				}

				for (p in game.players) {
					if (game.players[p].cards.indexOf("2C") >= 0) {
						game.player_turn = p;
						console.log("Player " + game.players[game.player_turn].username + " has the 2C. It is their turn to play that card.");
					}
					game.players[p].passed_cards=[];

				}
				chatbotMessageAll("It is " + game.players[game.player_turn].username + "'s turn to play.");
				game.updateStatus("play_round");
			}
		}

	});

	socket.on('play_card', (data) => {
		// is it this player's turn?
		// also make sure the player cannot take two turns

		if (socket.uuid == game.player_turn) {
			if (socket.uuid in game.cards_played) {
				// this player has already played a card for this round
			} else {
				// does this player have the two of clubs?
				if (game.players[socket.uuid].cards.indexOf("2C") >=0) {
					if (data.card == "2C") {
						// take this card out of the players hand and add it to cards_played
						game.cards_played[socket.uuid] = game.players[socket.uuid].cards.splice(game.players[socket.uuid].cards.indexOf(data.card) , 1);
						if (game.next_player() in game.cards_played) {
						} else {
							game.player_turn = game.next_player();
						}
					} else {
						socket.emit("new_message", {message: "You must play the 2C.  /play_card 2C", username: "chatbot"});
					}
				} else {
					if (game.players[socket.uuid].cards.indexOf(data.card) >= 0) {
						// take this card out of the players hand and it to cards_played
						game.cards_played[socket.uuid] = game.players[socket.uuid].cards.splice(game.players[socket.uuid].cards.indexOf(data.card) , 1);
						if (game.next_player() in game.cards_played) {
						} else {
							game.player_turn = game.next_player();
						}
					} else {
						socket.emit("new_message", {message: "You must play a card in your hand.", username: "chatbot"});
					}
				}
			}
		}
	});

	socket.on('game_status', () => {
		socket.emit('new_message', {message: "Game Status: " + game.status, username: "chatbot"});
		console.log("Next player => " + game.next_player());

	});

	socket.on('join_game', () => {
		if (socket.uuid in game.players) {
		} else {
			if (game.number_of_players < 5 && !game.started) {
				game.players[socket.uuid] = socket;
				game.number_of_players++;
				console.log(socket.username + " has joined the game.");	
				chatbotMessageAll(socket.username + " has joined the game.");	
			}
		}
	});

	socket.on('leave_game', () => {
		// check to see if the game has started?

		if (socket.uuid in game.players) {
			delete game.players[socket.uuid];
			game.number_of_players--;
			console.log(socket.username + " has left the game.");	
			chatbotMessageAll(socket.username + " has left the game.");	
		}


	});

	socket.on('change_username', (data) => {
		if (data.username.indexOf("chatbot") < 0) {
			var old_username = socket.username;
			socket.username = data.username;
			chatbotMessageAll("" + old_username + " is now known as " + socket.username);
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


	socket.on('cards', () => {
		socket.emit('new_message', {message: "Your cards: " + game.players[socket.uuid].cards , username: "chatbot"});

	});



	socket.on('random_seats', (data) => {
		if (data.value == "on") {
			game.random_seats = "on";
		}
		if (data.value == "off") {
			game.random_seats = "off";
		}
		chatbotMessageAll("Random seats is turned " + game.random_seats);

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
			chatbotMessageAll( old_username + " is now known as " + socket.username);
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

game.updateStatus = (s) => {
	game.status = s;
	io.sockets.emit('status', {"status": game.status});
}
game.next_player = () => {
	return game.player_order[(1 + game.player_order.indexOf(game.player_turn)) % game.number_of_players];
}

function chatbotMessageAll(m) {
	io.sockets.emit('new_message', {message: m, username: "chatbot"});
}

function chatbotMessage(m, s) {
		s.emit('new_message', {message: m , username: "chatbot"});
}



