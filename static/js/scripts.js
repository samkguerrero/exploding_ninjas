$(document).ready(function () {

    var socket = io(); //1

    var localPlayers;
    var localPlayer;
    var deck;
    var localDiscard = {name: ""};
    var isAttacked = false;
    var pickingRandom = false;
    var attackCount = 0;
    var seeFuture = "";
    var usedCards = [];

    $('#resetGame').hide();
    $('#deck').hide();
    $('#discard').hide();
    $('#hand').hide();
    $('#howManyDown').hide();
    $('#action').hide();

    $('#joinButton').click(function () {
        playerNewName = $('#nameInput').val();
        socket.emit('playerJoined', playerNewName);
        $('#nameInputLabel').remove();
        $('#nameInput').remove();
        $('#joinButton').remove();
    })

    $("#close").click(() => {
        $('#action').hide();
        $(".blur").css("filter", "blur(0px)");
    })

    socket.on('joinedLobby', function (allPlayers) {
        $('#playerLobby').empty();
        playersCount = 0
        for (var i in allPlayers) {
            playersCount++
            $('#playerLobby').append('<div id="' + allPlayers[i].name + '"><p>Player joined: ' + allPlayers[i].name + '</p></div>')
        }
        $('#startGame').html(playersCount.toString() + '/3 START GAME')
        if (playersCount === 3) {
            $('#startGame').prop("disabled", false)
        }
    })

    socket.on('playerInfo', function (player) {
        localPlayer = player
    })

    $('#startGame').click(function () {
        socket.emit('startGame')
        $('#loginWrapper').remove();
    })

    socket.on('serverStartingGame', function (gameBoardStart) {
        $('#aboutUs').remove();
        $('#playerLobby').remove();
        $('#loginWrapper').remove();        
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

    $('#resetGame').click(function () {
        socket.emit('startGame')
    })

    function updateLocalPlayer(localPlayers) {
        for (var i in localPlayers) {
            if (localPlayers[i].id === localPlayer.id) {
                localPlayer = localPlayers[i]
            }
        }
        $('#myName').html("Name: " + localPlayer.name)
        $('#isMyTurn').html(' - Turn: ' + localPlayer.isTurn.toString())
    }

    function renderHand(hand) {
        for (var i = 0; i < hand.length; i++) {
            $('#hand').append('<div class="card" style="background-image: url('+ localPlayer.hand[i].url +');" id="'+ localPlayer.hand[i].id +'"><h5>"'+ localPlayer.hand[i].name +'"</h5><p>"'+ localPlayer.hand[i].rules +'"</p></div>');
            // $('#hand').append('<div class="card" style="background-image: url('+ localPlayer.hand[i].url +');" id="'+ localPlayer.hand[i].id +'"><h5>"'+ localPlayer.hand[i].name +'"</h5><img class="animated pulse infinite" src="./img/ninjaLogo2.png" alt="ninjalogo"><p>"'+ localPlayer.hand[i].rules +'"</p></div>');
        }
    }

    socket.on('someoneWon', function (winnerPlayer) {
        $(".blur").css("filter", "blur(4.5px)");
        $('#action').show()
        $('.winner').html(winnerPlayer.name + " is new Prescott 2.0 -- WINNER!!!")
        socket.emit('startGame')
    })

    socket.on('announceDead', function(deadPlayer){
        $(".blur").css("filter", "blur(4.5px)");
        $('#action').show()
        $('.loser').html(deadPlayer.name + " has been EXPLODED!!!")
    })

    socket.on('deletedPlayer', function (data) {
        if (typeof localPlayers !== "undefined") {
            delete localPlayers[data]
            $('#' + data).remove();
        }
    })

    function visualizePlayers(players) {
        $('#players').empty();
        for (var i in players) {
            var ids = $('#' + players[i].id)
                .map(function () { return this.id })
                .get();
            if (players[i].id != localPlayer.id && ids.length === 0) {
                $('#players').append('<div class="aplayer" id="' + players[i].id + '"></div>')
                $('#'+players[i].id).append('<p>Name: ' + players[i].name + '</p><p>- isTurn: ' + players[i].isTurn + '</p>')
                $('#'+players[i].id).append('<div class="cardholder"></div>')
                for(var x in players[i].hand) {
                    $('#'+players[i].id + ' .cardholder').append('<div id="' + players[i].hand[x].id + '" class="playerscard"></div>')
                }
            }
        }
        if(pickingRandom) {
            $('.playerscard').css('border','6px solid green')
        }
    }

    //
    ////
    //

    socket.on('sendDeckTotal', function (data) {
        deck = data
        $('#deckLength').html('cards left ' + deck.length);
    })

    socket.on('turnUpdate', function (data) {
        // console.log("TURN UPDATE WHOS TURN: ",data)
        if (localPlayer.id === data.id) {
            localPlayer.isTurn = true
            $('#isMyTurn').html('turn: ' + localPlayer.isTurn.toString())
        } else {
            $('#isMyTurn').html('turn: ' + localPlayer.isTurn.toString())
        }
        if (localDiscard != undefined && localDiscard.name === "Attack" && localPlayer.isTurn)
            isAttacked = true;
        else
            isAttacked = false;

        if (localDiscard.name === "Attack" && localPlayer.isTurn) {
            $(".blur").css("filter", "blur(4.5px)");
            $('#action').show()
            $('.turnStatus').html("You have been attacked! Draw two cards")
        }
        console.log("clients istrue", localPlayer.isTurn)
        console.log("Am i attacked", isAttacked)
    })

    socket.on("updateDiscard", discardCard => {
        localDiscard = discardCard;
        // console.log("discraded card",discard);
        if (localDiscard.name === "Attack ") {
            isAttacked = false;
        }
        console.log("discraded card", localDiscard);
        $('#discard').empty();
        $('#discard').append('<div class="card" style="background-image: url('+ localDiscard.url +')" id="'+ localDiscard.id +'"><h5>"'+ localDiscard.name +'"</h5><p>"'+ localDiscard.rules +'"</p></div>');
    })

    socket.on('addExplosion', function (howManyDown) {
        var explodingNinja = { "id": 200, "name": "Exploding Ninja", "rules": "Reveal Card", "url": "" }
        console.log("deck before:", deck)
        deck.splice(deck.length - howManyDown, 0, explodingNinja)
        console.log("deck after:", deck)
        socket.emit("updateDeck", deck)


        $('#deckLength').html('cards left ' + deck.length);
    })

    socket.on('updatePlayers', function (players) {
        localPlayers = players
        updateLocalPlayer(localPlayers)
        visualizePlayers(localPlayers)
    })

    $('#subHowManyDown').click(function () {
        var howManyDown = $('#valHowManyDown').val();
        console.log("how many down", howManyDown)
        socket.emit('newLocationForExplode',howManyDown)
        $('#howManyDown').hide();
        $(".blur").css("filter", "blur(0px)");

    })

    $('#deck').click(function () {
        if (localPlayer.isTurn) {
            $('.seeFuture').html(seeFuture)
            $('.turnStatus').html(" ")
            var cardDrawn = deck.pop()
            if (cardDrawn.id === 200) {
                console.log("drew explode")
                socket.emit("updateDeck", deck)
                for (var i in localPlayer.hand) {
                    if (localPlayer.hand[i].id === 100) {
                        var usedDiffuse = localPlayer.hand.splice(i, 1)
                        socket.emit("discard", [usedDiffuse[0], localPlayer.id]);
                        socket.emit("turnEnded", localPlayer.id)
                        localPlayer.isTurn = false
                        $('#hand').empty()
                        renderHand(localPlayer.hand)
                        $(".blur").css("filter", "blur(4.5px)");
                        $('#howManyDown').show();
                        $('.infoHowManyDown').html("You have drawn Exploding Ninja! You have used your Defuse Card. Put Exploding Ninja anywhere in the deck");
                        usedCards = []
                        return
                    }
                }
                console.log("you dead")
                $(".blur").css("filter", "blur(4.5px)");
                $('#action').show()
                $('.loserStatus').html(localPlayer.name + " has drawn Exploding Ninja! He doesn't have any more defuses.")

                localPlayer.isTurn = false
                isAttacked = false;
                attackCount = 0;
                socket.emit('playerDead', localPlayer.id)
            }
            usedCards = []
            if (!isAttacked) {
                localPlayer.hand.push(cardDrawn)
                $('#hand').append('<div class="card" style="background-image: url('+ localPlayer.hand[localPlayer.hand.length-1].url +');" id="'+ localPlayer.hand[localPlayer.hand.length-1].id +'"><h5>"'+ localPlayer.hand[localPlayer.hand.length-1].name +'"</h5><p>"'+ localPlayer.hand[localPlayer.hand.length-1].rules +'"</p></div>');
                socket.emit("updatePlayerWhoDrew", {'player': localPlayer.id, 'card': cardDrawn})
                socket.emit("turnEnded", localPlayer.id)
                socket.emit("updateDeck", deck)
                localPlayer.isTurn = false;
                $('#isMyTurn').html('turn: ' + localPlayer.isTurn.toString())
            }
            else {
                attackCount++;
                localPlayer.hand.push(cardDrawn)
                $('#hand').append('<div class="card" style="background-image: url('+ localPlayer.hand[localPlayer.hand.length-1].url +');" id="'+ localPlayer.hand[localPlayer.hand.length-1].id +'"><h5>"'+ localPlayer.hand[localPlayer.hand.length-1].name +'"</h5><p>"'+ localPlayer.hand[localPlayer.hand.length-1].rules +'"</p></div>');
                socket.emit("updateDeck", deck)
                if (attackCount > 1) {
                    socket.emit("turnEnded", localPlayer.id)
                    socket.emit("updateDeck", deck)
                    localPlayer.isTurn = false;
                    isAttacked = false;
                    attackCount = 0;
                    localDiscard = { id: 666, name: "Attack ",
                    rules: "End your turn without drawing a card. Force the next player to take two turns", 
                    url: "./img/samuraiBlue.png"
                }
                    socket.emit("discard", [{ id: 666, name: "Attack ",rules: "End your turn without drawing a card. Force the next player to take two turns", 
                    url: "./img/samuraiBlue.png" }, localPlayer.id]);
                    $('#isMyTurn').html('turn: ' + localPlayer.isTurn.toString())
                }
            }
            //
            usedCards = []
        } else {
            $(".blur").css("filter", "blur(4.5px)");
            $('#action').show();
            $('.turnStatus').html("Not Your Turn!!");
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

    socket.on('TakePlayerCard', function(data){
        if(data[0] === localPlayer.id) {
            for (var i in localPlayer.hand) {
                if(localPlayer.hand[i].id === data[1].id) {
                    localPlayer.hand.splice(i,1)
                }
            }
            $('#hand').empty()
            renderHand(localPlayer.hand)
        }
    })

    $(document).on('click', "div.playerscard", function(e) {
        if (pickingRandom && localPlayer.isTurn) {
            playersHand = localPlayers[e.currentTarget.parentElement.parentElement.id].hand
            playersId = e.currentTarget.parentElement.parentElement.id.toString()
            for(var i in playersHand) {
                theCard = playersHand[i]
                console.log("thecard")
                console.log(theCard)
                if (theCard.id.toString() ===  e.target.id.toString()) {
                    localPlayer.hand.push(theCard)
                    $('#hand').empty()
                    renderHand(localPlayer.hand)
                    socket.emit('playerLosingCard', [playersId,theCard])
                    localPlayers[playersId].hand.splice(i,1)
                    localPlayers[localPlayer.id].hand.push(theCard)
                    socket.emit('playersGotChanged', localPlayers)                  
                    pickingRandom = false;
                    usedCards = []
                }
            }
        } else {
            console.log("you need two cards of the same")
        }
    })

    $('#hand').on("click", ".card", function(e){
        if (localPlayer.isTurn && !isAttacked) {
            for (let i = 0; i <= localPlayer.hand.length; i++) {
                if (localPlayer.hand[i].id === parseInt(e.target.parentElement.id) || localPlayer.hand[i].id === parseInt(e.target.id)) {
                    socket.emit("discard", [localPlayer.hand[i], localPlayer.id]);
                    usedCards.push(localPlayer.hand[i])
                    console.log("just added a card to dis")
                    console.log(usedCards)
                    if(usedCards.length >= 2) {
                        console.log(usedCards[usedCards.length-2].name)
                        console.log(usedCards[usedCards.length-1].name)
                        if(usedCards[usedCards.length-1].name === usedCards[usedCards.length-2].name) {
                            pickingRandom = true;
                        }
                    }
                    //Discard logic goes below
                    if (localPlayer.hand[i].name === "Skip") {
                        localPlayer.isTurn = false;
                    } else if (localPlayer.hand[i].name === "Attack") {
                        localPlayer.isTurn = false;
                    } else if (localPlayer.hand[i].name === "See the future") {
                        seeFuture = deck[deck.length - 1].name + ", "
                            + deck[deck.length - 2].name + ", " + deck[deck.length - 3].name
                        console.log("Next three cards are: ", seeFuture);
                        $(".blur").css("filter", "blur(4.5px)");
                        $('#action').show()
                        $('.seeFuture').html("Next three cards are: " + seeFuture);
                        seeFuture = "";
                    }
                    else if (localPlayer.hand[i].name === "Shuffle the draw") {
                        shuffle(deck);
                        socket.emit("updateDeck", deck)
                    }
                    localPlayer.hand.splice(i, 1);
                    $("#hand").empty();
                    renderHand(localPlayer.hand);
                    break;
                }
            }
        } else {
            $(".blur").css("filter", "blur(4.5px)");
            $('#action').show();
            $('.turnStatus').html("Calm down not ur turn.");
            console.log("Calm down not ur turn.");
        }
    })




});
