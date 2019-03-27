var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(1337,'127.0.0.1')

var express = require("express");

var path = require("path");
app.use(express.static(path.join(__dirname, "./static")));

var players = {};

var deck = require('./static/img/deck.json');
var whosTurn;
var discardCard;

function Queue() {
    this.data = [];
}
Queue.prototype.add = function(record) {
    this.data.unshift(record);
}
Queue.prototype.remove = function() {
    return this.data.pop();
}
Queue.prototype.size = function() {
    return this.data.length;
}
Queue.prototype.first = function() {
    return this.data[0];
}
const turns = new Queue();

function shuffle(array) {
    var m = array.length, t, i;
    while (m) {
      i = Math.floor(Math.random() * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}

function turnManager(whosTurn){
    io.emit('turnupdate', whosTurn)
}

shuffle(deck)

function getDeck() {
    let hand = [{id: 100, name: 'Defuse', rules: 'Negate Bomb', url: ''}];
    for (let i = 0; i < 7; i++) {
        hand.push(deck.pop())
    }
    return hand
}

io.on('connection', function (socket) { //2

    player = {
        id: socket.id,
        name: 'sam',
        hand: getDeck(),
        isTurn: false,
        isDead: false
    }

    players[socket.id] = player;
    
    socket.emit('new_user',player);
    
    io.emit('senddecktoall', deck);
    
    socket.broadcast.emit('all_players', players)
    socket.emit('all_players', players)
    
    
    socket.on('updatedeck', function(data) {
        io.emit('senddecktoall', data);
    })
    
    socket.on('drewcard', function(data){
        console.log("turns before", turns)
        turns.add(turns.remove())
        console.log("turns after", turns)
        whosTurn = turns.first()
        turnManager(whosTurn)
    })
    
    turns.add(player)
    if(turns.size() === 1) {
        whosTurn = turns.first();
        turnManager(whosTurn)
    }
    socket.on("discard", discard => {
        discardCard = discard;
        console.log("recieved discrad on server", discardCard)
        io.emit("updateddiscard", discardCard);
    })
    console.log("players in lobby", turns.size())

    socket.on('disconnect', function(){
        // console.log("deleted user", players[socket.id])
        delete players[socket.id] 
    })

    // socket.on('moved_player', function(data){
    //     players = data
    //     console.log(players)
    //     io.emit('updated_positions', players)
    // })

});

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render("index");
})

//inet - 192.168.1.165