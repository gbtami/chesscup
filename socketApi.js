var socket_io = require('socket.io');
var io = socket_io();
var socketApi = {};

socketApi.io = io;
var Elo = require('arpad');
var uscf = {
    default: 20,
    2100: 15,
    2400: 10
};

var min_score = 100;
var max_score = 10000;
const save_result = require('./routes/save_result');
const game_over = require('./routes/game_over');
const save_result_mongo = require('./routes/save_result_mongo');
const bluebird = require('bluebird');
const ObjectId = require('mongodb').ObjectId;


let online_players = {};
let store = {};

var elo = new Elo(uscf, min_score, max_score);

module.exports = function (app) {


    const pool = bluebird.promisifyAll(app.pool);

    io.on('connection', function (socket) {


        var handshakeData = socket.request;
        let data = handshakeData._query;

        if (handshakeData._query['h'] && handshakeData._query['h'] != "undefined") {
            socket.p_id = data.h;
            app.globalPlayers[socket.p_id] = socket;
            store[socket.p_id] = socket.id;
        }

        if ((handshakeData._query['t1'] && handshakeData._query['t1'] != "undefined")) {
            socket.join('t' + handshakeData._query['t1']);
        }
        if ((handshakeData._query['chat'] && handshakeData._query['chat'] != "undefined")) {
            socket.join('chat' + handshakeData._query['chat']);
        }
        if ((handshakeData._query['lobby'] && handshakeData._query['lobby'] != "undefined")) {
            socket.join('lobby');
        }

        //события игры

        if (handshakeData._query['g'] && handshakeData._query['g'] != "undefined") {

            socket.game_id = data.g;

            if (handshakeData._query['h'] && handshakeData._query['h'] != "undefined") {
                online_players[socket.game_id] = online_players[socket.game_id] || {};
                online_players[socket.game_id][socket.p_id] = online_players[socket.game_id][socket.p_id] || 0;
                online_players[socket.game_id][socket.p_id] = ++online_players[socket.game_id][socket.p_id];
            }

            socket.join(socket.game_id);
          //  console.log(online_players);


            io.to(socket.game_id).emit('playerOnline',
                JSON.stringify(online_players[handshakeData._query['g']] || {}));


           // io.sockets.emit('playerOnline', JSON.stringify(online_players[handshakeData._query['g']]));

           // console.log(Object.keys(app.globalPlayers).length);



            pool
                .query('SELECT * FROM tournaments_results WHERE id = ?', handshakeData._query['g'])
                .then(rows => {
                    var game = rows[0];
                    if (game) {
                        var time = game.created_at;
                        var a = time.getTime() - new Date().getTime();
                        var diffDays = Math.ceil(a / (1000 * 3600 ));
                        var isPlayer = false;
                        var color = null;
                        if (game.p1_id == handshakeData._query['h']) {
                            isPlayer = true;
                            color = "white";
                        } else if (game.p2_id == handshakeData._query['h']) {
                            isPlayer = true;
                            color = "black";
                        }
                    }


                });

            socket.on('eventServer', function (msg) {
                try {
                    msg = JSON.parse(msg);
                    //console.log(msg);
                    let temp, game_over = false;
                    //console.log(socket.p_id);
                    if (msg.tourney_id) {
                        msg.id = parseInt(msg.id);
                        temp = {_id: msg.id};
                    } else {
                        temp = {_id: ObjectId(msg.id)};
                    }

                    app.mongoDB.collection("users").findOne(temp, function (err, mongoGame) {


                        if (!mongoGame) {
                            console.log("Игра не найдена.");
                            const a = {
                                event: "game_aborted",
                            };
                            io.to(msg.id).emit('eventClient', JSON.stringify(a));
                            return false;
                        }


                        var obj = {
                            "fen": msg.data,
                            "is_over": msg.is_over,
                            "is_started" : 1
                        }

                        var p_time_left;
                        var p__another_time_left;
                        var actual_time = new Date().getTime();
                        if (msg.player === "p1") {
                            p_time_left = "p1_time_left";
                            p__another_time_left = "p2_time_left";
                            var lm = (mongoGame.p1_last_move) ? mongoGame.p1_last_move.getTime() : actual_time;
                            var spent_time = actual_time - lm;
                            obj[p_time_left] = mongoGame.p1_time_left - spent_time;
                            obj.p2_last_move = new Date();
                            game_over = (obj[p_time_left] < 0);

                        } else if (msg.player === "p2") {
                            p_time_left = "p2_time_left";
                            p__another_time_left = "p1_time_left";
                            var lm = (mongoGame.p2_last_move) ? mongoGame.p2_last_move.getTime() : actual_time;
                            var spent_time = actual_time - lm;
                            obj[p_time_left] = mongoGame.p2_time_left - spent_time;
                            obj.p1_last_move = new Date();
                            game_over = (obj[p_time_left] < 0);
                        }

                         if (game_over === true) {
                             var send_data = {
                                 id: mongoGame._id,
                             };
                             //по времени проиграл второй игрок
                             if (msg.player === "p2") {
                                 send_data.p1_won = 1;
                                 send_data.p2_won = 0;
                                 send_data.p1_id = mongoGame.p1_id;
                                 send_data.p2_id = mongoGame.p2_id;
                                 send_data.p2_time_left = -1;
                                 send_data.p1_time_left = mongoGame.p1_time_left;
                                 send_data.tourney_id = mongoGame.tournament_id;
                             } else {
                                 //по времени проиграл первый игрок
                                 send_data.p1_won = 0;
                                 send_data.p2_won = 1;
                                 send_data.p1_id = mongoGame.p1_id;
                                 send_data.p2_id = mongoGame.p2_id;
                                 send_data.p1_time_left = -1;
                                 send_data.p2_time_left = mongoGame.p2_time_left;
                                 send_data.tourney_id = mongoGame.tournament_id;
                             }
                             save_result_mongo(send_data, mongoGame, app);
                         } else {
                             app.mongoDB.collection("users").updateOne(temp,
                                 {
                                     $set: obj,
                                     $setOnInsert: {
                                         "moves": [],
                                         "is_over": game_over,
                                     }
                                 },

                                 {
                                     upsert: true,
                                     writeConcern: true
                                 },
                                 function (err, data) {


                                     var a = {
                                         event: "move",
                                         fen: msg.data,
                                         san: msg.move,
                                         captured: msg.captured,
                                         from: msg.from,
                                         to: msg.to,
                                         // p1_time_left: mongoGame.p1_time_end.getTime() - new Date().getTime(),
                                         // p2_time_left: mongoGame.p2_time_end.getTime() - new Date().getTime(),
                                         is_over: msg.is_over
                                     };

                                     a[p_time_left] = obj[p_time_left];
                                     a[p__another_time_left] = mongoGame[p__another_time_left];


                                     io.to(msg.id).emit('eventClient', JSON.stringify(a));

                                     //io.sockets.emit('eventClient', JSON.stringify(a));

                                     app.mongoDB.collection("users").updateOne(temp,
                                         {$push: {"moves": msg.move}},
                                         { writeConcern: true }
                                     ).catch(function () {
                                         console.log(arguments);
                                     });

                                     if (msg.is_over == 1 && msg.tourney_id) {
                                         game_over(msg, app);
                                     }
                                 }
                             );

                         }


                    })


                } catch (e) {
                    console.log(e.message);
                }
            });




            socket.on('checkTime1', function (data) {
                var msg = JSON.parse(data);

                console.log("checkTime1");
                console.log(msg);

                var who_get_flagged = msg.player;

                let temp;
                if (msg.tourney_id) {
                    temp = {_id: msg.id};
                } else {
                    temp = {_id: ObjectId(msg.id)};
                }

                let who_move_last = "", game_over = false;


                if (msg.id) {
                    app.mongoDB.collection("users").findOne(temp, function (err, mongoGame) {

                        var send_data = {
                            id: mongoGame._id,
                        };

                        //последний кто двигал фигуры - белые
                        if (who_get_flagged === "p2") {
                            //истекло ли время черных
                            if (mongoGame.p2_time_left + mongoGame.p2_last_move.getTime() < new Date().getTime()) {
                                send_data.p1_won = 1;
                                send_data.p2_won = 0;
                                send_data.p1_id = mongoGame.p1_id;
                                send_data.p2_id = mongoGame.p2_id;
                                send_data.p2_time_left = -1;
                                send_data.p1_time_left = mongoGame.p1_time_left;
                                send_data.tourney_id = mongoGame.tournament_id;
                                game_over = true;
                            }

                        } else {
                            //последние ходили черные

                            //истекло ли время белых
                            if (mongoGame.p1_time_left + mongoGame.p1_last_move.getTime() < new Date().getTime()) {
                                send_data.p1_won = 0;
                                send_data.p2_won = 1;
                                send_data.p1_id = mongoGame.p1_id;
                                send_data.p2_id = mongoGame.p2_id;
                                send_data.p1_time_left = -1;
                                send_data.p2_time_left = mongoGame.p2_time_left;
                                send_data.tourney_id = mongoGame.tournament_id;
                                game_over = true;
                            }
                        }

                        if (game_over) {
                            save_result_mongo(send_data, mongoGame, app);
                        }

                        //если это турнирная партия сохранияем в mysql
                        if (msg.tourney_id != null) {
                            game_over(msg, app);
                        }
                    });
                } else {
                    console.log("id not defined");
                }
            });

            socket.on('playerOnOff', function (data) {
                data = JSON.parse(data);
                io.to(data.game_id).emit('playerOnline', JSON.stringify(online_players[data.game_id]));

               // io.sockets.emit('playerOnline', JSON.stringify(online_players[data.game_id]));
            });


            socket.on('rematch_game', function (data) {
                data = JSON.parse(data);
                console.log(data);
                if (app.globalPlayers[data.enemy_id]) {
                    console.log(JSON.stringify(store));

                    io.to(store[data.enemy_id]).emit('eventClient', JSON.stringify({
                        event : "rematch_offer"
                    }));
                }

            });




        } else if (
            (!handshakeData._query['h'] ||
            handshakeData._query['h'] == "undefined"
            || handshakeData._query['h'] == "null")
            && (handshakeData._query['t1']
            &&  handshakeData._query['t1'] != "undefined")
        ) {

            var random = getRandomId(app.viewers);
            socket.viewer_id = random;
            socket.t1 = handshakeData._query['t1'];
            app.viewers[handshakeData._query['t1']] =  app.viewers[handshakeData._query['t1']] || {};
            app.viewers[handshakeData._query['t1']][random] = socket;
          //  console.log(Object.keys(app.viewers));
          //  console.log(Object.keys(app.viewers[handshakeData._query['t1']]));
            // console.log(Object.keys(app.globalPlayers));
            // console.log(handshakeData._query['h']);
        } else if (
            handshakeData._query['chat'] && handshakeData._query['chat'] != "undefined"
        ) {

            socket.on('message', function (data) {
               // data = JSON.parse(data);
                io.to("chat" + handshakeData._query['chat']).emit('message', data);
                var game = app.mongoDB.collection("chat").insertOne({
                    msg : data,
                    chat_id : parseInt(handshakeData._query['chat']),
                });
            });

        }else if (
            handshakeData._query['lobby'] && handshakeData._query['lobby'] != "undefined"
        ) {

            getCurrentPlayGames(socket, data.insertedId);


            socket.on('create_game', function (data) {
              //  console.log('create_game');
              //  console.log(data);
                data = JSON.parse(data);

                var game = app.mongoDB.collection("challenges").insertOne({
                    "owner" : data.user_id,
                    "user_name" : data.user_name,
                    "created_at" : new Date(),
                    "time_control" : data.amount
                }, function (err, data) {
                    getCurrentPlayGames(socket, data.insertedId);
                 //   console.log(data.insertedId);
                });



            });

            socket.on('cancel_game', function (data) {
               // console.log('cancel_game');
                console.log(data);
            });

            socket.on('accept_game', function (data) {
                //console.log('accept_game');
                data = JSON.parse(data);
               // console.log(data.user_id);
                console.log(data.game_id);

                app.mongoDB.collection("challenges").findOne({_id: ObjectId(data.game_id)}, function (err, mongoGame) {
                   // console.log("test");
                   // console.log(mongoGame);
                    //влдаелец не найден
                    if (!mongoGame || !mongoGame.owner) {
                        return false;
                    }

                    app.mongoDB.collection("users").insertOne({
                        "moves": [],
                        "is_over": 0,
                        "p1_id": data.user_id,
                        "p2_id": mongoGame.owner,
                        "p1_won": 0,
                        "p2_won": 0,
                        "p1_name" : data.user_name,
                        "p2_name" : mongoGame.user_name,
                        "playzone" : true,
                        "amount" : mongoGame.time_control,

                        "p1_last_move": null,
                        "p2_last_move": null,
                        "p1_time_left": mongoGame.time_control * 60000,
                        "p2_time_left": mongoGame.time_control * 60000,
                        "is_started": 0,
                        "time_addition": 0,
                    }, function (err, insertedGame) {
                        app.mongoDB.collection("challenges").remove({owner: mongoGame.owner}, function () {


                        });


                        socket.emit('playzone_start_game', {
                            created_id : insertedGame.insertedId,
                        });

                        //если пользователь на сайте
                        if ( app.globalPlayers[mongoGame.owner]) {
                            app.globalPlayers[mongoGame.owner].emit('playzone_start_game', {
                                created_id : insertedGame.insertedId,
                            });
                        }




                    });

                });


                /*
*/
            });

        }


        function getCurrentPlayGames(socket, created_id) {
            app.mongoDB.collection("challenges").find({}, function(err, cursor) {
                let challenges = [];
                cursor.forEach(function (message) {
                    challenges.push(message);
                 //   console.log(message);
                }, function () {


                    app.mongoDB.collection("users").find({"playzone" : true, "is_over" : 0}, function(err, cursor) {
                        let games = [];
                        cursor.forEach(function (message) {
                            games.push(message);
                         //   console.log(message);
                        }, function () {

                            io.to("lobby").emit('games_list',
                                {
                                    games: JSON.stringify(games),
                                    challenges: JSON.stringify(challenges),
                                    created_id: created_id,
                                }
                            );

                        });
                    });


                });
            });
        }

        socket.on('disconnect', function () {
          //  console.log("disconnect");
          //  console.log(Object.keys(app.globalPlayers));

            if (typeof online_players[socket.game_id] !== "undefined"
                && typeof online_players[socket.game_id][this.p_id] !== "undefined") {
                online_players[socket.game_id][socket.p_id] = --online_players[socket.game_id][socket.p_id];

                if (online_players[socket.game_id][socket.p_id] <= 0) {
                    delete online_players[socket.game_id][socket.p_id];
                    io.to(socket.game_id).emit('playerOnline', JSON.stringify(online_players[socket.game_id]));
                    //io.sockets.emit('playerOnline', JSON.stringify(online_players[socket.game_id]));
                }

                if (Object.keys(online_players[socket.game_id]).length === 0) {
                    delete online_players[socket.game_id];
                }
            }

            if (typeof app.globalPlayers[socket.p_id] !== "undefined"){
                delete app.globalPlayers[socket.p_id];
            }

            if (typeof socket.viewer_id !== "undefined" && typeof socket.t1 !== "undefined"){
                delete app.viewers[socket.t1][socket.viewer_id];

                if (Object.keys(app.viewers[socket.t1]).length === 0) {
                    delete app.viewers[socket.t1];
                }

            }

        });
    });

        socketApi.game_over = function (msg) {

        };
        socketApi.sendNotification = function () {
            io.sockets.emit('hello', {msg: 'Hello World!'});
        };



        return socketApi
};


 function getRandomId(viewers) {
    let random = Math.random()*100000000000000000;
    if (viewers[random]) {
        getRandomId(viewers);
    } else {
        return random;
    }
}


