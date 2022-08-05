import "./Main.css";
import { error } from "../../Utils/swal";
import globals from "../../Utils/globals";
import { showSpinner, hideSpinner } from "../Spinner/Spinner";
import Swal from "sweetalert2";
import React from "react";
import { withRouter } from "../../Utils/withRouter";
import { delay } from "../../Utils/delay";
import config from "../../config";

class Main extends React.Component {
    state = {
        remoteList: [],
    };

    constructor() {
        super()
        this.navToFloorplan = this.navToFloorplan.bind(this);
        this.newProject = this.newProject.bind(this);
        this.loadJson = this.loadJson.bind(this);
        this.receivedText = this.receivedText.bind(this);
        this.editRemote = this.editRemote.bind(this);
        this.getRemoteData = this.getRemoteData.bind(this);
        this.remoteClicked = this.remoteClicked.bind(this);
    }

    navToFloorplan() {
        this.props.navigate("/floorplan", { replace: true });
    }

    newProject() {
        const that = this;
        Swal.fire({
            title: 'Projekt neve?',
            input: 'text',
            inputLabel: 'Pl.: GépTakarítás2022',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Valamit meg kell adni!'
                }
            }
        }).then(x => {
            if (x.value != null) {
                showSpinner();
                globals.computerData = {
                    create: new Date().toISOString(),
                    software: "Novy's gepmap",
                    name: x.value,
                    floorplans: [],
                    templates: [],
                    objects: [],
                };
                that.navToFloorplan();
                hideSpinner();
            }
        });
    }

    loadJson() {
        let input, file, fr;

        if (typeof window.FileReader !== 'function') {
            error("Ez a böngésző még nem támogatja a file olvasó api-t!");
            return;
        }

        input = document.getElementById('import');
        if (!input.files) {
            error("Ez a böngésző még nem tud fájlokat kezelni!");
        } else if (!input.files[0]) {
            error("Jelöl ki egy fájlt feltöltésre!");
        } else if (input.files.length > 1) {
            error("Max 1 fájlt tölthetsz fel!");
        } else {
            file = input.files[0];
            if (!file.name.endsWith(".gepmap")) {
                error("Ismeretlen fájl formátum");
                return;
            }
            showSpinner();
            fr = new FileReader();
            fr.onload = this.receivedText;
            fr.readAsText(file);
        }
    }

    async receivedText(e) {
        let lines = e.target.result;
        try {
            globals.computerData = JSON.parse(lines);
            if (globals.computerData.software !== "Novy's gepmap") {
                throw new Error(`Unknown software signature ${globals.computerData.software}`);
            }

            // Redup images
            let i = 0;
            for (const floor of globals.computerData.floorplans) {
                lines = lines.replaceAll(`#toReplace#${i}`, floor.image);
                i++;
            }
            globals.computerData = JSON.parse(lines);

            console.log('%cSuccessfully read file: ', 'color: green')
            console.log(globals.computerData);
            this.navToFloorplan();
        } catch (err) {
            error("Érvénytelen adat", err);
        } finally {
            await delay(500)
            hideSpinner();
        }
    }

    componentDidMount() {
        document.title = "Gép Térkép";
        if (config.isRemoteEnabled) this.getRemoteData();
    }

    async getRemoteData() {
        const res = await (await fetch(config.apiAddress + "/api/getAvailableMaps")).json();
        this.setState({
            remoteList: res,
        });
    }

    async remoteClicked(inpId) {
        showSpinner();
        const res = await (await fetch(`${config.apiAddress}/maps/${inpId}.gepmap`)).text();
        window.isNetworkMap = true;
        window.mapId = inpId;
        this.receivedText({
            target: {
                result: res,
            },
        });
        hideSpinner();
    }

    async editRemote(event, element) {
        event?.preventDefault();
        const result = await Swal.fire({
            title: `ID: ${element.id}`,
            html: `
            <label for="pName">Név</label>
            <input type="text" id="pName" placeholder="Név" class="swal2-input" value="${element.name}"/>
            <br>
            <p>Létrehozva: ${new Date(element.create).toLocaleString()}</p>
            <p>Módosítva: ${new Date(element.edit).toLocaleString()}</p>
            `,
            preConfirm: () => document.getElementById("pName").value,
            showCancelButton: true,
            showDenyButton: true,
            denyButtonText: 'Törlés',
        });

        if (result.isConfirmed && result.value !== element.name) {
            showSpinner();
            try {
                const res = await fetch(`${config.apiAddress}/api/rename`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: result.value, id: element.id })
                });
                if (!res.ok) throw new Error('Something went wrong');
                this.getRemoteData();
            } catch (err) {
                error("Hiba :(", err);
            } finally {
                hideSpinner();
            }
        }

        if (result.isDenied) {
            await delay(500);
            const confRes = await Swal.fire({
                icon: 'warning',
                title: `${element.name} törlése`,
                text: 'Ez a térkép törlése fog kerülni, örökre el veszik!',
                showConfirmButton: false,
                showCancelButton: true,
                showDenyButton: true,
                denyButtonText: 'Törlés',
            });
            if (confRes.isDenied) {
                showSpinner();
                try {
                    const res = await fetch(`${config.apiAddress}/api/delete`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ id: element.id })
                    });
                    if (!res.ok) throw new Error('Something went wrong');
                    this.getRemoteData();
                } catch (err) {
                    error("Hiba :(", err);
                } finally {
                    hideSpinner();
                }
            }
        }
        return false;
    }

    render() {
        return (
            <div className="MainComponent">
                <h1>Gép Térkép Viewer</h1>
                <p style={{ fontSize: "1.2em" }}>Tölts be egy általunk generált <strong>.gepmap</strong> fájlt!</p>
                <input type="file" id="import" accept=".gepmap" onChange={this.loadJson}></input>
                <br />
                <p style={{ fontSize: "1.2em" }}>Vagy hozzunk létre egy újat!</p>
                <input type="button" value="Új projekt" onClick={this.newProject}></input>
                {config.isRemoteEnabled ? <div className="remoteContainer">
                    <h2 style={{ marginTop: '40px', marginBottom: '40px' }}>Szerveren elérhető térképek</h2>
                    <div className="remoteList">
                        {this.state.remoteList.map(elem => <div key={"k" + elem.id} onClick={() => this.remoteClicked(elem.id)} onContextMenu={(event) => this.editRemote(event, elem)} className="remoteCard cp">
                            <p>{elem.id}</p>
                            <p>{elem.name}</p>
                            <p>{(new Date(elem.edit)).toLocaleDateString()}</p>
                        </div>)}
                    </div>
                </div> : <div></div>}
            </div>
        );
    }
}

export default withRouter(Main);