import "./Floorplan.css";
import React from "react";
import { withRouter } from "../../Utils/withRouter";
import globals from "../../Utils/globals";
import Swal from "sweetalert2";
import { hideSpinner, showSpinner } from "../Spinner/Spinner";
import { delay } from "../../Utils/delay";
import { exportFile } from "../../Utils/exportFile";
import { saveToCloud, createInCloud } from "../../Utils/saveToCloud";
import config from "../../config";
//TODO: Delatable maps

class Floorplan extends React.Component {
    componentWillUnmount() {
        window.removeField = undefined;
    }

    state = {
        computerData: globals.computerData,
    };

    constructor(props) {
        super(props);
        this.imageConverted = this.imageConverted.bind(this);
        this.newFloorplan = this.newFloorplan.bind(this);
        this.newTemplate = this.newTemplate.bind(this);
        this.navToView = this.navToView.bind(this);
        this.editCard = this.editCard.bind(this);
    }

    componentDidMount() {
        document.title = "Főmenü - Gép Térkép";
        // Go back if not loaded
        if (globals.computerData == null) {
            setTimeout(() => {
                this.props.navigate("/", { replace: true });
            }, 100);
        }
    }

    async newTemplate() {
        const result = await Swal.fire({
            title: "Új minta",
            showCancelButton: true,
            html: `
                <input type="text" id="templateName" placeholder="Minta neve" class="swal2-input"/>
                <br>
                <br>
                <label for="templateColor">Alapértelmezett szín</label>
                <input type="color" id="templateColor"/>
                <br>
                <br>
                <label for="templateImg">Ikon</label>
                <input type="file" id="templateImg" accept=".png,.jpg,.jpeg,.svg"/>
            `,
            preConfirm: () => {
                const data = {
                    name: document.getElementById("templateName").value,
                    color: document.getElementById("templateColor").value,
                    icon: document.getElementById("templateImg"),
                };

                if (data.name.length === 0) {
                    alert("Adj meg egy nevet!");
                    return false;
                }

                if (data.icon.files.length !== 1) {
                    alert("1 ikont tölts fel!")
                    return false;
                }

                if (globals.computerData.templates.some((element) => element.name === data.name)) {
                    alert("Ilyen minta már létezik");
                    return false;
                }

                return data;
            },
        });
        if (result.isConfirmed) {
            showSpinner();
            let file = result.value.icon.files[0];
            let reader = new FileReader();
            const self = this;
            reader.onloadend = function () {
                globals.computerData.templates.push({
                    name: result.value.name,
                    color: result.value.color,
                    icon: reader.result,
                    fields: [],
                });
                hideSpinner();
                self.setState({
                    computerData: globals.computerData,
                });
            }
            reader.readAsDataURL(file);
        }
    }

    newFloorplan() {
        const self = this;
        Swal.fire({
            title: "Új alaprajz",
            showCancelButton: true,
            html: `
                <input type="text" id="planName" placeholder="Alaprajz neve" class="swal2-input"/>
                <input type="file" id="planImg" accept=".png,.jpg,.jpeg,.svg"/>
            `,
            focusConfirm: false,
            preConfirm: () => {
                const data = {
                    planName: document.getElementById('planName')?.value,
                    planImg: document.getElementById('planImg'),
                };

                if (data.planName?.length === 0) {
                    alert("Adj meg egy nevet");
                    return false;
                }

                if (globals.computerData.floorplans.some((element) => element.name === data.planName)) {
                    alert("Ilyen néven már létezik terv");
                    return false;
                }

                if (data.planImg?.files?.length !== 1) {
                    alert("1 fényképet tölts fel");
                    return false;
                }

                return data;
            }
        }).then(x => {
            if (x.isConfirmed) {
                showSpinner();
                let file = x.value.planImg.files[0];
                let reader = new FileReader();
                reader.onloadend = function () {
                    self.imageConverted(reader.result, x.value);
                }
                reader.readAsDataURL(file);
            }
        });
    }

    /// Called after floorplan image is uploaded
    imageConverted(result, inputs) {
        globals.computerData.floorplans.push({
            id: encodeURIComponent(inputs.planName),
            name: inputs.planName,
            image: result,
            layers: [{
                id: 0,
                name: 'default',
            }],
        });
        this.setState({
            computerData: globals.computerData,
        });
        hideSpinner();
    }

    navToView(element) {
        return () => {
            this.props.navigate("/floorplanview/" + element.id);
        };
    }

    /// Edit the template clicked
    editCard(self) {
        return async () => {
            const result = await Swal.fire({
                showCancelButton: true,
                showDenyButton: true,
                denyButtonText: "Törlés",
                title: `${self.name} szerkesztése`,
                html: `
                    <label for="templateName">Név</label>
                    <input value="${self.name}" type="text" id="templateName" placeholder="Minta neve" class="swal2-input"/>
                    <br>
                    <br>
                    <label for="templateColor">Alapértelmezett szín</label>
                    <input type="color" id="templateColor" value="${self.color}"/>
                `,
                preConfirm: () => {
                    const data = {
                        name: document.getElementById('templateName').value,
                        color: document.getElementById('templateColor').value,
                    };

                    if (data.name.length === 0) {
                        alert("Adj meg egy nevet!");
                        return false;
                    }

                    if (
                        // eslint-disable-next-line eqeqeq
                        data.name != self.name &&
                        globals.computerData.templates.some((element) => element.name === data.name)
                    ) {
                        alert("Ilyen minta már létezik");
                        return false;
                    }

                    return data;
                }
            });
            // Törlés
            if (result.isDenied) {
                Swal.fire({
                    title: `${self.name} törlésre fog kerülni`,
                    text: "Ez nem fogja kitörülni a létező objektumokat, csak a mintát!",
                    showDenyButton: true,
                    denyButtonText: "OK",
                    confirmButtonText: "Mégsem",
                }).then(x => {
                    if (x.isDenied) {
                        showSpinner();
                        globals.computerData.templates = globals.computerData.templates.filter(
                            el => el.name !== self.name,
                        );
                        this.setState({
                            computerData: globals.computerData,
                        });
                        hideSpinner();
                    }
                });
            }
            // Módosítás
            if (result.isConfirmed) {
                if (
                    self.name !== result.value.name ||
                    self.color !== result.value.color
                ) {
                    alert("Ez a művelet nem módosítja a létező objektumokat!")
                    self.name = result.value.name;
                    self.color = result.value.color;
                    this.setState({
                        computerData: globals.computerData,
                    });
                }
                while (true) {
                    const fieldResult = await Swal.fire({
                        title: self.name + " mezők",
                        html: self.fields?.map(
                            field => `
                                <div class="row">
                                    <p style="font-size: 1.5em; margin-top: 10px; margin-bottom: 0;">${field.name}: ${field.type}</p>
                                    <img class="cp" style="width: 40px; height: 40px" src="/delete-circle.svg" onclick="removeField('${self.name}', '${field.name}')"/>
                                </div>
                            `
                        )?.join('\n') ?? "<p>Nincsen még mező</p>",
                        confirmButtonText: "Új mező",
                        showCancelButton: true,
                        cancelButtonText: "Kilépés",
                    });
                    if (fieldResult.isDismissed) break;
                    if (fieldResult.isConfirmed) {
                        const newFieldResult = await Swal.fire({
                            title: self.name + " új mező felvétele",
                            html: `
                                <input type="text" id="fieldName" placeholder="Mező neve" class="swal2-input"/>
                                <select id="fieldType" class="swal2-select">
                                    <option value="text" selected>Szöveges</option>
                                    <option value="checkbox">Checkbox</option>
                                </select>
                            `,
                            preConfirm: () => {
                                const data = {
                                    name: document.getElementById("fieldName").value,
                                    type: document.getElementById("fieldType").value,
                                };

                                if (data.name.length === 0) {
                                    alert("Adj meg valamit!");
                                    return false;
                                }

                                if (self.fields.some(x => x.name === data.name)) {
                                    alert("Ilyen mező már létezik");
                                    return false;
                                }

                                return data;
                            },
                            confirmButtonText: "Kész",
                            showCancelButton: true,
                            cancelButtonText: "Mégsem",
                        });
                        showSpinner();
                        if (newFieldResult.isConfirmed) {
                            self.fields.push({
                                name: newFieldResult.value.name,
                                type: newFieldResult.value.type,
                            });
                            await delay(500);
                        }
                        await delay(500);
                        hideSpinner();
                    }
                }
            }
        };
    }

    async floorplanMenu(e, element) {
        e.preventDefault();
        const res = await Swal.fire({
            title: element.name,
            showDenyButton: true,
            denyButtonText: "Törlés",
        });
        if (res.isDenied) {
            await delay(750);
            const confirmResult = await Swal.fire({
                title: element.name + " törlése",
                text: 'Ez az alaprajz törlésre fog kerülni, örökre eleveszik!',
                showDenyButton: true,
                denyButtonText: "Törlés",
                confirmButtonText: "Mégsem",
            });
            if (confirmResult.isDenied) {
                globals.computerData.floorplans = globals.computerData.floorplans.filter(x => x.id !== element.id);
                this.setState({ computerData: globals.computerData });
            }
        }
    }

    render() {
        return (
            <div className="Floorplan">
                <h1 style={{ marginLeft: '10px' }}>Alaprajzok</h1>
                <div className="FloorplanList">
                    {
                        this.state.computerData?.floorplans?.map(element =>
                            <div key={"fpcard" + element.name} className="floorplanCard" onContextMenu={(e) => this.floorplanMenu(e, element)} onClick={this.navToView(element)}>
                                <img className="floorPrevImg" src={element.image} alt=""></img>
                                <h3>{element.name}</h3>
                            </div>
                        )
                    }
                    <div className="floorplanCard" onClick={this.newFloorplan}>
                        <div className="plusBtn">
                            <p style={{ fontSize: "100px", margin: "0" }}>+</p>
                        </div>
                        <h3>Új alaprajz</h3>
                    </div>
                </div>
                <h1 style={{ marginLeft: '10px', marginTop: '30px' }}>Minták</h1>
                <div className="FloorplanList">
                    {
                        this.state.computerData?.templates?.map(element =>
                            <div onClick={this.editCard(element)} key={"templcard" + element.name} className="floorplanCard" style={{ backgroundColor: element.color }}>
                                <img className="floorPrevImg" src={element.icon} alt=""></img>
                                <h3>{element.name}</h3>
                            </div>
                        )
                    }
                    <div className="floorplanCard" onClick={this.newTemplate}>
                        <div className="plusBtn">
                            <p style={{ fontSize: "100px", margin: "0" }}>+</p>
                        </div>
                        <h3>Új minta</h3>
                    </div>
                </div>
                <h1 style={{ marginLeft: '10px', marginTop: '30px' }}>Opciók</h1>
                <div className="FloorplanList">
                    <div className="floorplanCard" onClick={() => this.props.navigate("/search")}>
                        <img alt="" src="database-search.svg" className="floorPrevImg"></img>
                        <h3>Keresés</h3>
                    </div>
                    {config.isRemoteEnabled ? <div className="floorplanCard" onClick={window.isNetworkMap === true ? saveToCloud : async () => { await createInCloud(); this.setState({}) }}>
                        <img alt="" src="database-arrow-up.svg" className="floorPrevImg"></img>
                        <h3>{window.isNetworkMap === true ? "Mentés szerverre" : "Feltöltés a szerverre"}</h3>
                    </div> : null}
                    <div className="floorplanCard" onClick={exportFile}>
                        <img alt="" src="database-export.svg" className="floorPrevImg"></img>
                        <h3>Export</h3>
                    </div>
                </div>
            </div>
        )
    }
}

// Egyéni minta mező törlése
window.removeField = async (templateName, fieldName) => {
    if (window.confirm(`${fieldName} nevű mező törlésre fog kerülni!\nA létező objektumok nem fognak elveszni!`)) {
        const template = globals.computerData.templates.find(x => x.name === templateName);
        const fields = template.fields.filter(field => field.name !== fieldName);
        template.fields = fields;
        window.cSwal.close();
    }
}

export default withRouter(Floorplan);