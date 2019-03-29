var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(1337)
var express = require("express");
var path = require("path");
app.use(express.static(path.join(__dirname, "./static")));
var Masterdeck = require('./static/img/deck.json');

var players = {};
var deck;
var whosTurn;
var discardCard = {id: -1, name: "False"};

function Queue() {
    this.data = [];
}
Queue.prototype.add = function (record) {
    this.data.unshift(record);
}
Queue.prototype.remove = function () {
    return this.data.pop();
}
Queue.prototype.size = function () {
    return this.data.length;
}
Queue.prototype.first = function () {
    return this.data[0];
}
Queue.prototype.delete = function (playerid) {
    for (var i in this.data) {
        if (playerid.id === this.data[i].id) {
            this.data.splice(i, 1)
        }
    }
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

function getHandFromDeck() {
    let hand = [{id: 100, name: 'Defuse', rules: 'Negate Bomb', url: "./img/samuraiGreen.png"}];
    for (let i = 0; i < 7; i++) {
        hand.push(deck.pop())
    }
    return hand.sort( () => Math.random() - 0.5);
}

function turnManager(whosTurn){
    //update server players
    for (i in players) {
        if (players[i].id === whosTurn.id) {
            players[i].isTurn = true;
        } else {
            players[i].isTurn = false;
        }
    }
    io.emit('turnUpdate', whosTurn);
    io.emit('updatePlayers', players);
    io.emit("updateddiscard", discardCard);
}

io.on('connection', function (socket) {

    socket.on('playerJoined', function(playerNewName){
        player = {
            id: socket.id,
            name: playerNewName,
            hand: [],
            isTurn: false,
            isDead: false
        }
        players[socket.id] = player;
        turns.add(player)
        socket.broadcast.emit('joinedLobby', players)
        socket.emit('joinedLobby', players)
        socket.emit('playerInfo', player)
    })

    socket.on('disconnect', function(){
        turns.delete(players[socket.id])
        delete players[socket.id]
        io.emit('deletedPlayer', socket.id)
    });

    socket.on('startGame', function(data){
        for (var i in players) {
            players[i].hand = []
        }
        deck = [];
        for (i in Masterdeck) {
            deck.push(Masterdeck[i])
        }
        shuffle(deck)
        for (var i in players) {
            players[i].hand = getHandFromDeck()
        }
        var explodingNinja = {"id": 200, "name": "Exploding Ninja","rules": "Reveal Card","url": ""}
        // var playersMinus1 = turns.size()-1
        var playersMinus1 = 4
        for (var i = 0; i < playersMinus1; i++) {
            deck.push(explodingNinja)
        }
        console.log("before shuffle", deck)
        shuffle(deck)
        console.log("after shuffle", deck)

        whosTurn = turns.first();
        turnManager(whosTurn)
        gameBoardStart = {
            players: players,
            deck: deck
        }
        io.emit('serverStartingGame', gameBoardStart )
    });
        
    socket.on('updateDeck', function(data) {
        io.emit('sendDeckTotal', data);
    })
    
    socket.on('playerDead', function(data) {
        io.emit("announceDead", players[data])
        turns.delete(players[data])
        delete players[socket.id]
        console.log("turns")
        console.log(turns)
    })
    socket.on('updatePlayerWhoDrew', function(data) {
        if(players[data.player])
        {
            players[data.player].hand.push(data.card)
            io.emit('updatePlayers', players);
        }
    })

    socket.on('turnEnded', function(data){
        if(turns.size() === 1) {
            console.log('someone has won')
            io.emit('someoneWon', turns.first())       
            return
        }
        turns.add(turns.remove())
        whosTurn = turns.first()
        turnManager(whosTurn)
    })
    ////
    socket.on('newLocationForExplode',function(howManyDown){
        io.emit('addExplosion',howManyDown);
        socket.emit('addExplosion',howManyDown);
    })
    
    socket.on('playersGotChanged', function(newPlayers){
        players = newPlayers
        io.emit('updatePlayers', newPlayers);
    })

    socket.on('playerLosingCard', function(userCard){
        io.emit('TakePlayerCard', userCard)
    })

    socket.on("discard", discard => {
        discardCard = discard[0];
        io.emit('updateDiscard', discardCard);
        //update server players
        if(typeof players[discard[1]] !== "undefined") {
            for(var i in players[discard[1]].hand) {
                if(players[discard[1]].hand[i].id === discard[0].id) {
                    players[discard[1]].hand.splice(i,1)
                }
            }
        }
        //Discard logic goes below
        console.log("test discard name")
        console.log(discardCard.name)
        if (discardCard.name === "Skip") {
            turns.add(turns.remove())
            whosTurn = turns.first()
            turnManager(whosTurn)
        }
        else if(discardCard.name === "Attack")
        {
            turns.add(turns.remove())
            whosTurn = turns.first()
            turnManager(whosTurn)
        }
        io.emit('updatePlayers', players);
    })
});

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

app.get('/', function (req, res) {
    res.render("index");
})
