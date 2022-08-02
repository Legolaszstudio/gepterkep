import "./Search.css";
import React from "react";
import { withRouter } from "../../Utils/withRouter";
import { hideSpinner, showSpinner } from "../Spinner/Spinner";
import globals from "../../Utils/globals";
import { delay } from "../../Utils/delay";
import Swal from "sweetalert2";

class Search extends React.Component {
    objTypes = new Set();
    fields = new Set();
    state = {
        results: globals.computerData?.objects ?? [],
    }

    constructor(props) {
        super(props);
        this.prepareSearch = this.prepareSearch.bind(this);
        this.searchUpdate = this.searchUpdate.bind(this);
        this.cardClicked = this.cardClicked.bind(this);
    }

    componentDidMount() {
        document.title = "Keresés - Gép Térkép";
        if (globals.computerData == null) {
            setTimeout(() => {
                this.props.navigate("/", { replace: true });
            }, 100);
        } else {
            this.prepareSearch();
        }
    }

    prepareSearch() {
        showSpinner();
        for (const item of globals.computerData.objects) {
            this.objTypes.add(item.type);
            for (const field of item.fields) {
                this.fields.add((typeof field.value === 'boolean' ? 'b:' : 't:') + field.name);
            }
        }
        for (const template of globals.computerData.templates) {
            const opt = document.createElement('option');
            opt.value = template.name;
            opt.text = template.name;
            document.getElementById('searchFilter').appendChild(opt);
        }
        hideSpinner();
    }

    async searchUpdate(search) {
        const val = search.target.value;

        let searchObjs = globals.computerData.objects;
        const filterTempl = document.getElementById('searchFilter').value;
        if (filterTempl !== 'all') {
            searchObjs = searchObjs.filter(obj => obj.type === filterTempl);
        }

        this.setState({
            results: searchObjs.filter(obj => obj.name.toLowerCase().includes(val.toLowerCase()))
        });

        const searchInCustomFields = document.getElementById("sInField").checked;
        if (searchInCustomFields) {
            await delay(5);
            const inFieldResult = searchObjs.filter(obj =>
                obj.fields.some(x =>
                    typeof x.value === 'boolean' ? false : x.value.toLowerCase().includes(val.toLowerCase())
                )
            );
            for (const item of inFieldResult) {
                if (!this.state.results.some(x => x.name === item.name)) {
                    this.state.results.push(item);
                }
            }
            this.setState({
                results: this.state.results,
            });
        }

        const searchInPath = document.getElementById("sInPath").checked;
        if (searchInPath) {
            await delay(5);
            const pathResult = searchObjs.filter(obj =>
                decodeURIComponent(obj.path).toLowerCase().includes(val.toLowerCase())
            );
            for (const item of pathResult) {
                if (!this.state.results.some(x => x.name === item.name)) {
                    this.state.results.push(item);
                }
            }
            this.setState({
                results: this.state.results,
            });
        }

        const sortResults = document.getElementById("sortRes").checked;
        if (sortResults) {
            await delay(5);
            let temp = this.state.results;
            temp.sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name));
            this.setState({
                results: temp,
            });
        }
    }

    async cardClicked(obj) {
        const result = await Swal.fire({
            title: "Találat megtekintése",
            html: `<label for="mName">Azonosító</label><br>
            <input id="mName" class="swal2-input" style="margin-top: 0"value="${obj.name}" readonly>
            <br>
            <label for="mColor" style="margin-top: 10px">Marker Színe</label>
            <input type="color" style="margin-top: 10px" id="mColor" value="${obj.color}" disabled readonly>
            <h3 style="margin-bottom: 10px">Egyéni mezők</h3>
            ${obj.fields.map(field => {
                if (typeof field.value === 'boolean') {
                    return `<div>
                        <label for="swal2-checkbox" class="swal2-checkbox" style="display: flex;">
                            <input type="checkbox" value="1" id="fc${encodeURIComponent(field.name)}" ${field.value ? 'checked' : ''} disabled readonly>
                            <span class="swal2-label">${field.name}</span>
                        </label>
                    </div>`;
                } else {
                    return `<div>
                        <label for="ft${encodeURIComponent(field.name)}">${field.name}</label>
                        <input type="text" style="margin-top: 0" name="ft${encodeURIComponent(field.name)}" id="ft${encodeURIComponent(field.name)}" value="${field.value}" class="swal2-input" readonly></input>
                    </div>`;
                }
            }).join("\n")}`,
            confirmButtonText: "Megnézés térképen",
            showCancelButton: true,
        });
        if (result.isConfirmed) {
            this.props.navigate(
                obj.path + "?show=" + encodeURIComponent(obj.name),
            )
        }
    }

    render() {
        return (
            <div className="search">
                <div style={{ height: '15vh', minHeight: '150px' }}>
                    <h1 style={{ textAlign: 'center' }}>Keresés</h1>
                    <div style={{ display: 'flex', justifyContent: 'space-around' }} className="searchSettings">
                        <div>
                            <input type="checkbox" id="sInField" value="1" defaultChecked></input>
                            <label htmlFor="sInField">Keresés egyéni mezőkben is</label>
                        </div>
                        <div>
                            <input type="checkbox" id="sInPath" value="1" defaultChecked></input>
                            <label htmlFor="sInPath">Keresés útvonalban is</label>
                        </div>
                        <div>
                            <input type="checkbox" id="sortRes" value="1" defaultChecked></input>
                            <label htmlFor="sortRes">Találatok rendezése</label>
                        </div>
                        <select id="searchFilter" onChange={() => { this.searchUpdate({ target: { value: document.getElementById('mainInput').value } }) }}>
                            <option value="all">Minden</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <input id="mainInput" onChange={this.searchUpdate} type="text" className="swal2-input" style={{ width: '70vw', backgroundColor: 'white' }}></input>
                    </div>
                </div>
                <hr></hr>
                <div style={{ height: '75vh', overflow: 'auto' }}>
                    <div id="results">
                        {this.state.results.map(result => <div key={result.name} className="resultCard cp" onClick={() => this.cardClicked(result)}>
                            <div style={{ display: 'flex' }}>
                                <p>{result.type}</p>
                                <div style={{ height: '50px', width: '2px', margin: '3px', backgroundColor: 'grey' }}></div>
                                <p>{result.name}</p>
                            </div>
                            <div style={{ marginLeft: 'auto' }}>
                                <p>{result.path.split('/floorplanview')[1].split('/').map(x => decodeURIComponent(x)).join('/')}</p>
                            </div>
                        </div>)}
                    </div>
                </div>
            </div>
        );
    }
}

export default withRouter(Search);