class PlayerSockets {
    constructor(){
        var url;
        if (typeof u != "undefined") {
            url = 'h=' + u;
        } else {
            url = 'h=null';
        }
        console.log(u);
        this.socket = io(window.location.origin, {query: url});

        this.socket.on('game_start', function (data) {
            data = JSON.parse(data);

            if (typeof data.game_id != "undefined" && typeof data.tournament_id != "undefined"){

                if (typeof g === "undefined") {
                    location.href = "/tournament/" + data.tournament_id + "/game/" + data.game_id;
                } else {
                    if (!isNaN(parseInt(g)) && g != data.game_id) {
                        location.href = "/tournament/" + data.tournament_id + "/game/" + data.game_id;
                    } else {
                        console.log("id совпадает");
                    }
                }


            } else {
                console.log("нет id турнира или id игры");
            }

        });

    }
}

new PlayerSockets();

