import React from 'react';
import {render} from 'react-dom';
import ResultsTable from "./ResultsTable.jsx";


class TeamsTables extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            tournament: tournament,
            results_table: results_table,
            participants_boards: participants_boards,
            participants: participants_array,

        };
        console.log(Object.keys(this.state.participants_boards));
    }
    componentDidMount(){
        const self = this;
    }
    changeOrder(event){
        const self = this;
    }

    selectTeam(event){
        const self = this;



    }



    componentWillReceiveProps(nextProps){


      //  if(nextProps.value !== this.props.pairs){
            this.setState({
                teams:nextProps.teams,
            });
       // }


    }
    render() {


        var tifOptions = Object.keys(participants_boards).map(function(key, index) {
            return <div key={key}>
                <h5 className="mt-2">Доска № {index + 1}</h5>
                <table className="table table-bordered table-hover table-sm">
                    <thead className="thead-light">
                    <tr>
                        <th></th>
                        <th>Имя</th>
                        <th>Очки</th>
                        <th>Бх</th>
                        <th>SB</th>
                        <th>Rate</th>
                        <th>+/-</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>


                    {participants_boards[key].map((item, index) => (
                        <tr key={index}>
                            <td>{index + 1}</td>
                            <td><a target="_blank" href="/users/stat/74">{item.name}</a></td>
                            <td>{item.scores}</td>
                            <td>{item.bh}</td>
                            <td>{item.berger}</td>
                            <td>{item.tournaments_rating}</td>
                            <td>{item.tournaments_rating - item.start_rating}</td>
                            <td>
                                <a href="" data-id="74" className="participant fa fa-eye"></a>
                                <a target="_blank" href="/users/stat/74" className="fa fa-chart-line"></a>
                            </td>
                        </tr>
                    ))}

                    </tbody>
                </table>
            </div>
        });

        return (
            <div className="position-relative mt-5">
                <ul className="nav nav-tabs" id="teams_tables_nav" role="tablist">
                    <li className="nav-item">
                        <a className="nav-link active" data-toggle="tab" href="#teams_participants" role="tab" aria-controls="home" aria-selected="true">Команды</a>
                    </li>
                    <li className="nav-item">
                        <a className="nav-link" data-toggle="tab" href="#every_board" role="tab" aria-controls="profile" aria-selected="false">По доскам</a>
                    </li>
                    <li className="nav-item">
                        <a className="nav-link" data-toggle="tab" href="#individial" role="tab" aria-controls="contact" aria-selected="false">Все участники</a>
                    </li>
                </ul>
                <div className="tab-content" id="myTabContent">
                    <div className="tab-pane fade show active" id="teams_participants" role="tabpanel" aria-labelledby="home-tab">


                        <table className="table table-bordered table-hover table-sm">
                            <thead className="thead-light">
                            <tr>
                                <th></th>
                                <th>Имя</th>
                                <th>Очки</th>
                                <th>Командные очки</th>
                                <th>Бх</th>
                                <th>SB</th>
                            </tr>
                            </thead>
                            <tbody>

                                {this.state.results_table.map((item, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{item.team_name}</td>
                                            <td>{item.scores}</td>
                                            <td>{item.scores}</td>
                                            <td>{item.bh}</td>
                                            <td>{item.berger}</td>
                                        </tr>
                                ))}

                            </tbody>
                        </table>




                    </div>
                    <div className="tab-pane fade" id="every_board" role="tabpanel" aria-labelledby="profile-tab">

                        <div>{tifOptions}</div>

                    </div>
                    <div className="tab-pane fade" id="individial" role="tabpanel" aria-labelledby="contact-tab">

                        <ResultsTable participants={this.state.participants} tournament={this.state.tournament}/>

                    </div>
                </div>

            </div>

        );

    }
}

render(
    <TeamsTables/>
    , document.getElementById('team_tables'));
