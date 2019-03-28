$(document).ready(function () {

    var socket = io(); //1

    var local_players;
    var my_id;
    var hand;
    var deck;
    var discard;
    var isTurn = false;
    var isAttacked = false;
    var attackCount = 0;

    socket.on('new_user', function (data) {
        my_id = data.id
        hand = data.hand
        render_hand(hand)
        $('#myid').html(my_id)
    })

    socket.on('senddecktoall', function (data) {
        deck = data
        $('#deckLength').html('cards left ' + deck.length);
    })

    socket.on('playerjoin', function (data) {
        local_players = {};
        visualizePlayers(local_players)
        local_players = data
        visualizePlayers(local_players)
    })
    socket.on('allplayers', function (data) {
        local_players = {};
        visualizePlayers(local_players)
        local_players = data
        visualizePlayers(local_players)
    })
    socket.on('deletedplayers', function (data) {
        console.log("are we getting the delete call ?")
        console.log(data)
        local_players = {};
        visualizePlayers(local_players)
        local_players = data
        visualizePlayers(local_players)
    })

    //HERE
    socket.on('turnupdate', function (data) {
        console.log("turnupdateon", data)
        if (my_id === data.id) {
            isTurn = true
            $('#ismyturn').html('isTurn: true')
            if(discard != undefined && discard.name === "Attack" && isTurn)
                isAttacked = true;
            else
                isAttacked = false;
        }
        console.log("clients istrue", isTurn)
        console.log("Am i attacked",isAttacked)
    })
    socket.on("updateddiscard", data => {
        discard = data;
        if(discard.name === "Attack1")
            isAttacked = false;
        console.log("discraded card", discard);
        $('#discard').empty();
        $('#discard').append('<div class="card" id="' + discard.id + '">' + discard.name + '</div>');

    })

    socket.on('disconnect', function (data) {
        console.log("discon in client")
        console.log(data)
        local_players = data;
        visualizePlayers(local_players)
    })

    function render_hand(hand) {
        for (var i = 0; i < hand.length; i++) {
            $('#hand').append('<div class="card" id="' + hand[i].id + '">' + hand[i].name + '</div>')
        }
    }

    function visualizePlayers(players) {
        for (var i in players) {
            var ids = $('#' + players[i].id)
                .map(function () { return this.id })
                .get();
            if (players[i].id != my_id && ids.length === 0) {
                $('#players').append('<div class="aplayer" id="' + players[i].id + '"></div>')
                $('#' + players[i].id).append('<p>ID:' + players[i].id + '</p><p>isTurn:' + players[i].isTurn + '</p>')
                $('#' + players[i].id).append('<div class="cardholder"></div>')
                for (var x in players[i].hand) {

                    // console.log(players[i].hand[x].id)
                    $('#' + players[i].id + ' .cardholder').append('<div id="' + players[i].hand[x].id + '" class="playerscard"></div>')
                }
            }
        }
    }

    $('#deck').click(function () {
        if (isTurn) {
            cardDrawn = deck.pop()
            //logic for exploding and defuse
            if (cardDrawn.id === 200) {
                console.log("drew explode")
                for (var i in hand) {
                    console.log(hand[i].id)
                    if (hand[i].id === 100) {
                        var usedDiffuse = hand.splice(i, 1)
                        $('#hand').empty();
                        render_hand(hand);
                        socket.emit("discard", usedDiffuse[0]);
                        socket.emit("drewcard", my_id)
                        isTurn = false
                        isAttacked = false;
                        attackCount = 0;

                        return
                    }
                }
                console.log("you dead")
                isTurn = false
                isAttacked = false;
                attackCount = 0;
                socket.emit('playerdead', my_id)
            }
            //draw and update hand
            if(!isAttacked)
            {
                hand.push(cardDrawn)
                $('#hand').append('<div class="card" id="' + hand[hand.length - 1].id + '">' + hand[hand.length - 1].name + '</div>')
                socket.emit("drewcard", my_id)
                socket.emit("updatedeck", deck)
                isTurn = false;
                $('#ismyturn').html('isTurn: false')
            }
            else
            {   attackCount++;
                hand.push(cardDrawn)
                $('#hand').append('<div class="card" id="' + hand[hand.length - 1].id + '">' + hand[hand.length - 1].name + '</div>')
                socket.emit("updatedeck", deck)
                if(attackCount > 1)
                {
                    socket.emit("drewcard", my_id)
                    socket.emit("updatedeck", deck)
                    isTurn = false;
                    isAttacked = false;
                    attackCount = 0;
                    discard = {id: 666, name: "Attack1"}
                    socket.emit("discard", {id:666, name: "Attack1"});
                    $('#ismyturn').html('isTurn: false')
                }
            }
        } 
        else {
            console.log("not your turn")
        }
    })

    $('#hand').on("click", ".card", function (e) {
        if (isTurn) {
            for (let i = 0; i <= hand.length; i++) {
                if (hand[i].id === parseInt(e.target.id)) {
                    socket.emit("discard", hand[i]);
                    //Discard logic goes below
                    if (hand[i].name === "Skip")
                        isTurn = false;
                    else if(hand[i].name === "Attack")
                        isTurn = false;    
                    hand.splice(i, 1);
                    $("#hand").empty();
                    render_hand(hand);
                    break;
                }
            }
        } else {
            console.log("calm down not ur turn");
        }
    })

    $('#ismyturn').html('isTurn: false')
});
