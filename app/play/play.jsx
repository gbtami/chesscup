import React from 'react';
import {render} from 'react-dom';


class PlaySockets extends React.Component {
    constructor(props){

        super(props);
        this.state = {
            games : [],
            challenges : [],
        };

        this.accept = this.accept.bind(this);

    }

    componentDidMount(){
        var self = this;
        var url;
        if (typeof u != "undefined") {
            url = 'h=' + u;
        } else {
            url = 'h=null';
        }
        this.socket = io(window.location.origin, {query: url + "&lobby=true"});

        this.socket.on('games_list', function (data) {
            const games = JSON.parse(data.games);
            const challenges = JSON.parse(data.challenges);

            self.setState({
                games : games,
                challenges : challenges,
            });

             console.log(challenges);
             console.log(games);

        });
        this.socket.on('playzone_start_game', function (data) {
             console.log(data);

            location.href = "/play/game/" + data.created_id;

        });



        //$(function () {
        $("#create_game").on("click", function () {

            self.socket.emit('create_game', JSON.stringify({
                "amount" : $("#amount").val(),
                "user_id" : u,
                "user_name" : user_name,
            }));

            $("#exampleModal").modal("hide");

        });
        // })
    }

    accept(event){
        var $target = $(event.target);
        var attr = $target.data("game_id");


        this.socket.emit('accept_game', JSON.stringify({
            "user_id" : u,
            "game_id" : attr,
            "user_name" : user_name,

        }));

        // console.log(attr);
    }


    render () {
        return (
            <div>

                <h2>Вызовы</h2>

                <table className="table table-sm">
                    <thead className="thead-dark">
                    <tr>
                        <th scope="col" className="text-center">#</th>
                        <th scope="col" className="text-center">Имя</th>
                        <th scope="col" className="text-center">Контроль</th>
                        <th scope="col" className="text-center"></th>
                    </tr>
                    </thead>
                    <tbody>




                        {this.state.challenges.map((item, index) => (

                        <tr key={index}>
                            <th>{item.user_id}</th>
                            <td className="text-center">{item.user_name}</td>
                            <td className="text-center">{item.time_control} + 0</td>
                            <td className="text-center">
                                <span className="btn btn-primary" data-game_id={item._id} onClick={this.accept}>Принять</span>
                            </td>
                        </tr>
                        ))}

                    </tbody>
                </table>

                <h2>Игры</h2>

                <table className="table table-sm">
                    <thead className="thead-light">
                    <tr>
                        <th scope="col" className="text-center">#</th>
                        <th scope="col" className="text-center"></th>
                        <th scope="col" className="text-center">Контроль</th>
                        <th scope="col" className="text-center"></th>
                    </tr>
                    </thead>
                    <tbody>
                        {this.state.games.map((item, index) => (

                            <tr key={index}>
                                <th>{item.user_id}</th>
                                <td className="text-center">{item.p1_name} vs {item.p2_name}</td>
                                <td className="text-center">{item.amount} + 0</td>
                                <td className="text-center">
                                    <a className="btn btn-primary btn-sm" href={ "/play/game/" + item._id }>Смотреть</a>
                                </td>
                            </tr>
                        ))}

                    </tbody>
                </table>

            </div>

        );
    }

}


render(
    <PlaySockets/>
    , document.getElementById('games'));