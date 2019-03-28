$(document).ready(function () {

    var socket = io(); //1

    var localPlayers;
    var localPlayer;
    var deck;
    var localDiscard;
    var isAttacked = false;
    var attackCount = 0;
    var seeFuture = "";

    $('#resetGame').hide();
    $('#deck').hide();
    $('#discard').hide();
    $('#hand').hide();
    $('#howManyDown').hide()

    $('#joinButton').click(function(){
        playerNewName = $('#nameInput').val();
        socket.emit('playerJoined', playerNewName)
        $('#nameInputLabel').remove()
        $('#nameInput').remove()
        $('#joinButton').remove()
    })

    socket.on('joinedLobby', function(allPlayers){
        $('#playerLobby').empty();
        playersCount = 0
        for (var i in allPlayers) {
            playersCount++
            $('#playerLobby').append('<div id="' + allPlayers[i].name + '"><p>Player joined: ' + allPlayers[i].name + '</p></div>')
        }
        $('#startGame').html(playersCount.toString() + '/2 START GAME')
        if (playersCount === 2) {
            $('#startGame').prop("disabled", false)
        }
    })

    socket.on('playerInfo', function(player){
        localPlayer = player
    })

    $('#startGame').click(function(){
        socket.emit('startGame')
    })

    socket.on('serverStartingGame', function(gameBoardStart){
        $('#playerLobby').remove();
        $('#startGame').remove();
        $('#resetGame').show();
        $('#deck').show();
        $('#discard').show();
        $('#discard').empty();
        $('#hand').show();
        $('#hand').empty();
        deck = gameBoardStart.deck
        localPlayers = gameBoardStart.players
        // console.log("game start deck", deck)
        // console.log("game start players", localPlayers)
        $('#deckLength').html('cards left ' + deck.length);
        updateLocalPlayer(localPlayers)
        renderHand(localPlayer.hand)
        visualizePlayers(localPlayers)
    })

    $('#resetGame').click(function(){
        socket.emit('startGame')
    })

    function updateLocalPlayer(localPlayers){
        for (var i in localPlayers) {
            if(localPlayers[i].id === localPlayer.id) {
                localPlayer = localPlayers[i]
            }
        }
        $('#myName').html(localPlayer.name)
        $('#isMyTurn').html('turn: ' + localPlayer.isTurn.toString())
    }

    function renderHand(hand) {
        for (var i = 0; i < hand.length; i++) {
            $('#hand').append('<div class="card" style="background-image: url('+ localPlayer.hand[i].url +');" id="'+ localPlayer.hand[i].id +'"><h5>"'+ localPlayer.hand[i].name +'"</h5><img class="animated pulse infinite" src="./img/ninjaLogo2.png" alt="ninjalogo"><p>"'+ localPlayer.hand[i].rules +'"</p></div>');
        }
    }

    socket.on('someoneWon', function(){
        alert("Someone has won")
        socket.emit('startGame')
    })

    socket.on('deletedPlayer', function(data) {
        if(typeof localPlayers !== "undefined" ) {
            delete localPlayers[data]
            $('#' + data).remove();
        }
    })

    function visualizePlayers(players) {
        $('#players').empty();
        for(var i in players) {
            var ids = $('#' + players[i].id )
                .map(function() { return this.id })
                .get();
            if (players[i].id != localPlayer.id && ids.length === 0) {
                $('#players').append('<div class="aplayer" id="' + players[i].id + '"></div>')
                $('#'+players[i].id).append('<p>Name:' + players[i].name + '</p><p>isTurn:' + players[i].isTurn + '</p>')
                $('#'+players[i].id).append('<div class="cardholder"></div>')
                for(var x in players[i].hand) {
                    $('#'+players[i].id + ' .cardholder').append('<div id="' + players[i].hand[x].id + '" class="playerscard"></div>')
                }
            }
        }
    }

    //
    ////
    //

    socket.on('sendDeckTotal', function(data){
        deck = data
        $('#deckLength').html('cards left ' + deck.length);
    })

    socket.on('turnUpdate', function(data){
        // console.log("TURN UPDATE WHOS TURN: ",data)
        if (localPlayer.id === data.id) {
            localPlayer.isTurn = true
            $('#isMyTurn').html('turn: ' + localPlayer.isTurn.toString())
        } else {
            $('#isMyTurn').html('turn: ' + localPlayer.isTurn.toString())
        }
        if(localDiscard != undefined && localDiscard.name === "Attack" && localPlayer.isTurn)
            isAttacked = true;
        else
            isAttacked = false;
        console.log("clients istrue", localPlayer.isTurn)
        console.log("Am i attacked",isAttacked)
    })

    socket.on("updateDiscard", discardCard => {
        localDiscard = discardCard;
        // console.log("discraded card",discard);
        if(localDiscard.name === "Attack1") {
            isAttacked = false;
        }
        console.log("discraded card", localDiscard);
        $('#discard').empty();
        $('#discard').append('<div class="card" style="background-image: url('+ localDiscard.url +')" id="'+ localDiscard.id +'"><h5>"'+ localDiscard.name +'"</h5><img class="animated pulse infinite" src="./img/ninjaLogo2.png" alt="ninjalogo"><p>"'+ localDiscard.rules +'"</p></div>');
    })

    socket.on('addExplosion',function(howManyDown){
        var explodingNinja = {"id": 200, "name": "Exploding Ninja","rules": "Reveal Card","url": ""}
        deck.splice(howManyDown, 0, explodingNinja)
        $('#deckLength').html('cards left ' + deck.length);
    })

    socket.on('updatePlayers', function(players) {
        localPlayers = players
        updateLocalPlayer(localPlayers)
        visualizePlayers(localPlayers)
    })

    $('#subHowManyDown').click(function(){
        var howManyDown = $('#valHowManyDown').val();
        socket.emit('newLocationForExplode',howManyDown)
        $('#howManyDown').hide()
    })

    $('#deck').click(function(){
        if (localPlayer.isTurn) {
            $('.seeFuture').html(seeFuture)
            var cardDrawn = deck.pop()
            if (cardDrawn.id === 200) {
                console.log("drew explode")
                for (var i in localPlayer.hand) {
                    if (localPlayer.hand[i].id === 100) {
                        var usedDiffuse = localPlayer.hand.splice(i,1)
                        socket.emit("discard", [usedDiffuse[0],localPlayer.id]);
                        socket.emit("turnEnded", localPlayer.id)
                        localPlayer.isTurn = false
                        $('#hand').empty()
                        renderHand(localPlayer.hand)
                        $('#howManyDown').show()
                        return
                    } 
                }
                console.log("you dead")
                localPlayer.isTurn = false
                isAttacked = false;
                attackCount = 0;
                socket.emit('playerDead', localPlayer.id)
            }
            if(!isAttacked)
            {
                localPlayer.hand.push(cardDrawn)
                $('#hand').append('<div class="card" style="background-image: url('+ localPlayer.hand[localPlayer.hand.length-1].url +');" id="'+ localPlayer.hand[localPlayer.hand.length-1].id +'"><h5>"'+ localPlayer.hand[localPlayer.hand.length-1].name +'"</h5><img class="animated pulse infinite" src="./img/ninjaLogo2.png" alt="ninjalogo"><p>"'+ localPlayer.hand[localPlayer.hand.length-1].rules +'"</p></div>');
                socket.emit("updatePlayerWhoDrew", {'player': localPlayer.id, 'card': cardDrawn})
                socket.emit("turnEnded", localPlayer.id)
                socket.emit("updateDeck", deck)
                localPlayer.isTurn = false;
                $('#isMyTurn').html('turn: ' + localPlayer.isTurn.toString())
            }
            else
            {   attackCount++;
                localPlayer.hand.push(cardDrawn)
                $('#hand').append('<div class="card" style="background-image: url('+ localPlayer.hand[localPlayer.hand.length-1].url +');" id="'+ localPlayer.hand[localPlayer.hand.length-1].id +'"><h5>"'+ localPlayer.hand[localPlayer.hand.length-1].name +'"</h5><img class="animated pulse infinite" src="./img/ninjaLogo2.png" alt="ninjalogo"><p>"'+ localPlayer.hand[localPlayer.hand.length-1].rules +'"</p></div>');
                socket.emit("updateDeck", deck)
                if(attackCount > 1)
                {
                    socket.emit("turnEnded", localPlayer.id)
                    socket.emit("updateDeck", deck)
                    localPlayer.isTurn = false;
                    isAttacked = false;
                    attackCount = 0;
                    localDiscard = {id: 666, name: "Attack1"}
                    socket.emit("discard", [{id:666, name: "Attack1"},localPlayer.id]);
                    $('#isMyTurn').html('turn: ' + localPlayer.isTurn.toString())
                }
            }
            //

        } else {
            console.log("Not your turn.")
        }
    })
    
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

    $('#hand').on("click", ".card", function(e){
        if (localPlayer.isTurn && !isAttacked) {
            for(let i = 0; i <= localPlayer.hand.length; i++){
                if(localPlayer.hand[i].id === parseInt(e.target.parentElement.id) || localPlayer.hand[i].id === parseInt(e.target.id) ){
                    socket.emit("discard", [localPlayer.hand[i],localPlayer.id]);
                    //Discard logic goes below
                    if (localPlayer.hand[i].name === "Skip") {
                        localPlayer.isTurn = false;
                    } else if(localPlayer.hand[i].name === "Attack") {
                        localPlayer.isTurn = false; 
                    } else if(localPlayer.hand[i].name === "See the future") {
                        seeFuture = deck[deck.length-1].name + ", " 
                        + deck[deck.length-2].name + ", " + deck[deck.length-3].name
                        console.log("Next three cards are: ", seeFuture)
                        $('.seeFuture').html("Next three cards are: "+ seeFuture)
                        seeFuture = ""
                    }
                    else if(localPlayer.hand[i].name === "Shuffle")
                    {
                        shuffle(deck);
                        socket.emit("updateDeck", deck)

                    }
                    localPlayer.hand.splice(i,1);
                    $("#hand").empty();
                    renderHand(localPlayer.hand);
                    break;
                }
            } 
        } else {
            console.log("Calm down not ur turn.");
        }
    })


});
