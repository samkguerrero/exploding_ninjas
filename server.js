var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var express = require("express");
var path = require("path");
app.use(express.static(path.join(__dirname, "./static")));
server.listen(1337)

var players = {};
var deck = require('./static/img/deck.json');
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

function turnManager(whosTurn) {
    for (i in players) {
        if (players[i].id === whosTurn.id) {
            players[i].isTurn = true;
        } else {
            players[i].isTurn = false;
        }
    }
    io.emit('turnupdate', whosTurn)
    io.emit("updateddiscard", discardCard);
}

shuffle(deck)

function getDeck() {
    let hand = [{ id: 100, name: 'Defuse', rules: 'Negate Bomb', url: '' }];
    for (let i = 0; i < 7; i++) {
        card = deck.pop()
        if (card.id === 200) {
            temp = card
            card = deck.pop()
            deck.push(temp)
            shuffle(deck)
        }
        hand.push(card)
    }
    return hand
}

io.on('connection', function (socket) { //2
    //PLAYING MAYBE NEEDS TO BE DELETED
    shuffle(deck)

    player = {
        id: socket.id,
        name: 'sam',
        hand: getDeck(),
        isTurn: false,
        isDead: false
    }

    players[socket.id] = player;

    socket.emit('new_user', player);

    io.emit('senddecktoall', deck);

    socket.broadcast.emit('playerjoin', players)
    socket.emit('allplayers', players)

    socket.on('updatedeck', function (data) {
        io.emit('senddecktoall', data);
    })

    socket.on('playerdead', function (data) {
        turns.delete(players[data])
        console.log("turns")
        console.log(turns)
    })

    socket.on('drewcard', function (data) {
        if (turns.size() === 1) {
            console.log('someone has won')
            return
        }
        turns.add(turns.remove())
        whosTurn = turns.first()
        turnManager(whosTurn)
        socket.emit('allplayers', players)
    })

    turns.add(player)
    if (turns.size() === 2) {
        console.log(turns.size());
        whosTurn = turns.first();
        turnManager(whosTurn)
    }
    socket.on("discard", discard => {
        discardCard = discard;
        io.emit("updateddiscard", discardCard);

        //Discard logic goes below
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

        socket.emit('allplayers', players)
    })

    socket.on('disconnect', function () {
        turns.delete(players[socket.id])
        delete players[socket.id]
        socket.broadcast.emit('deletedplayers', players)
    })
});

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

app.get('/', function (req, res) {
    res.render("index");
})
