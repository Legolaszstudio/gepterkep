import "./Main.css";
import { error } from "../../Utils/swal";
import globals from "../../Utils/globals";
import { showSpinner, hideSpinner } from "../Spinner/Spinner";
import Swal from "sweetalert2";
import React from "react";
import { withRouter } from "../../Utils/withRouter";
import { delay } from "../../Utils/delay";

class Main extends React.Component {
    constructor() {
        super()
        this.navToFloorplan = this.navToFloorplan.bind(this);
        this.newProject = this.newProject.bind(this);
        this.loadJson = this.loadJson.bind(this);
        this.receivedText = this.receivedText.bind(this);
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
            </div>
        );
    }
}

export default withRouter(Main);