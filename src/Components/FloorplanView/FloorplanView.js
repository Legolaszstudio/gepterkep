import "./FloorplanView.css";
import React from "react";
import { withRouter } from "../../Utils/withRouter";
import globals from "../../Utils/globals";
import { fabric } from "fabric";
import Swal from "sweetalert2";
import { showSpinner, hideSpinner } from "../../Components/Spinner/Spinner";
import { delay } from "../../Utils/delay";
import { exportFile } from "../../Utils/exportFile";
import { saveToCloud } from "../../Utils/saveToCloud"; 

class FloorplanView extends React.Component {
    objMoving = false;
    mainBoundRect = {
        top: 0,
        left: 0,
    };

    firstUpdate = true;
    finishLoading = true;

    state = {
        data: null,
        floorplan: null,
    };
    canvas;

    constructor(props) {
        super(props);
        this.setupCanvas = this.setupCanvas.bind(this);
        this.resizeCanvas = this.resizeCanvas.bind(this);
        this.newAreaPrepare = this.newAreaPrepare.bind(this);
        this.saveCanvas = this.saveCanvas.bind(this);
        this.loadFloorplan = this.loadFloorplan.bind(this);
        this.loadCanvasJson = this.loadCanvasJson.bind(this);
        this.newMarker = this.newMarker.bind(this);
        this.newMarkerTemplateSelected = this.newMarkerTemplateSelected.bind(this);
        this.newMarkerImageLoaded = this.newMarkerImageLoaded.bind(this);
        this.attachCustomHandlers = this.attachCustomHandlers.bind(this);
        this.attachMarkerClick = this.attachMarkerClick.bind(this);
        this.moveBtnHandler = this.moveBtnHandler.bind(this);
        this.exportClicked = this.exportClicked.bind(this);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps?.props?.params['*'] !== this.props.params['*']) {
            if (this.firstUpdate) { this.firstUpdate = false; return }
            if (!this.finishLoading) return;
            this.finishLoading = false;
            showSpinner();
            const urlParams = this.props.params['*'].split("/");
            document.title = this.props.params['*'] + " - Gép Térkép";

            if (urlParams.length === 1) {
                this.canvas.clear();
                this.loadFloorplan(this.canvas);
                this.mainBoundRect = {
                    left: 0,
                    top: 0,
                };
                this.setState({
                    data: this.state.floorplan,
                });
                setTimeout(() => {
                    this.finishLoading = true;
                    hideSpinner();
                }, 100);
                return;
            }

            let current = this.state.floorplan.fabric.objects;
            let currentFinder = current;
            let parent;

            for (let i = 1; i < urlParams.length; i++) {
                current = currentFinder.find(x => {
                    return x.custom.name === urlParams[i] || x.custom.id === urlParams[i];
                });
                parent = current;
                currentFinder = current.custom?.fabric?.objects;
                console.log(`Found area ${i} ${urlParams.slice(1, i + 1).join('/')}`, current);
            }

            this.setState({
                data: current,
            });
            this.canvas.clear();
            this.loadFloorplan(this.canvas, true);
            // show border around selected area
            if (!Array.isArray(parent)) {
                parent = [parent];
            }
            fabric.util.enlivenObjects(parent, (res) => {
                res[0].custom = {};
                res[0].custom.type = "BorderControl";
                res[0].fill = "none";
                res[0].remove(res[0].getObjects().find(x => x.type === "text"))
                res[0].getObjects()[0].fill = "rgb(0,0,0,0)";
                res[0].selectable = false;
                res[0].hasRotatingPoint = false;
                this.canvas.add(res[0]);
                this.canvas.renderAll();
            });

            setTimeout(() => {
                fabric.util.enlivenObjects([current], (obj) => {
                    const rect = obj[0].getBoundingRect();
                    this.mainBoundRect = {
                        top: rect.top,
                        left: rect.left,
                    };

                    if (this.state.data.custom.fabric != null) {
                        this.loadCanvasJson(this.state.data.custom.fabric.objects, this.canvas, false);
                    }

                    const zoom = Math.min(...[
                        this.canvas.height / rect.height,
                        this.canvas.width / rect.width
                    ]) - 0.25;
                    const newLeft = (-rect.left * zoom);
                    const newTop = (-rect.top * zoom) + rect.height / 2;

                    // update the canvas viewport
                    this.canvas.setViewportTransform([zoom, 0, 0, zoom, newLeft, newTop]);

                    setTimeout(() => {
                        this.finishLoading = true;
                        hideSpinner();
                    }, 100);
                });
            }, 100);
        }
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resizeCanvas, false);
    }

    componentDidMount() {
        window.unlocked = false;

        const urlParams = this.props.params['*'].split("/");
        document.title = urlParams[urlParams.length - 1] + " - Gép Térkép";
        if (globals.computerData == null) {
            setTimeout(() => {
                this.props.navigate("/", { replace: true });
            }, 100);
            return;
        }

        window.addEventListener('resize', this.resizeCanvas, false);

        const current = globals.computerData.floorplans.find(
            (x) => {
                return x.id === urlParams[0] || x.name === urlParams[0];
            }
        );
        console.log("Found floorplan: ", current);
        this.setState({
            data: current,
            floorplan: current,
        });
        setTimeout(async () => {
            this.setupCanvas();
            const show = this.props.searchParams[0].get('show');
            if (urlParams.length > 1) {
                for (let i = 0; i < urlParams.length; i++) {
                    const segments = urlParams.slice(0, i + 1).join('/');
                    const url = '/floorplanview/' + segments;
                    this.props.navigate(url, { replace: i === 0 });

                    await delay(500);
                }
                await delay(1000);
            } else {
                await delay(200);
            }
            if (show != null) {
                const object = this.canvas.getObjects().find(x => x.custom?.name === show);
                if (object == null) return;
                for (let i = 0; i < 7; i++) {
                    object.set('opacity', 0);
                    this.canvas.renderAll();
                    await delay(500);
                    object.set('opacity', 1);
                    this.canvas.renderAll();
                    await delay(500);
                }
            }
        }, 100);
    }

    saveCanvas() {
        // Double equ to check if same obj
        // eslint-disable-next-line eqeqeq
        if (this.state.data == this.state.floorplan) {
            // Must mutate the 'pointer' directly
            // eslint-disable-next-line react/no-direct-mutation-state
            this.state.data.fabric = this.canvas.toJSON(['custom']);
        } else {
            // Must mutate the 'pointer' directly
            // eslint-disable-next-line react/no-direct-mutation-state
            this.state.data.custom.fabric = this.canvas.toJSON(['custom']);
        }
    }

    resizeCanvas() {
        const canvasRatio = this.canvas.height / this.canvas.width;
        const windowRatio = window.innerHeight / window.innerWidth;
        let width;
        let height;

        if (windowRatio < canvasRatio) {
            height = window.innerHeight;
            width = height / canvasRatio;
        } else {
            width = window.innerWidth;
            height = width * canvasRatio;
        }

        this.canvas.setDimensions({
            width: (width - 50) + 'px',
            height: (height - 50) + 'px'
        }, { cssOnly: true });
    }

    attachCustomHandlers(canvas) {
        const objects = canvas.getObjects();
        for (const object of objects) {
            if (object.custom.type === 'Area') {
                attachAreaClick(object, this.props.navigate, this.canvas, this.saveCanvas);
                object.set('hoverCursor', 'pointer');
            } else if (object.custom.type === 'Marker') {
                this.attachMarkerClick(object);
                object.set('hoverCursor', 'pointer');
            }
        }
        canvas.renderAll();
    }

    loadCanvasJson(jsonIn, canvas, fullLoad = true) {
        if (fullLoad) {
            canvas.loadFromJSON(jsonIn, () => {
                this.attachCustomHandlers(canvas);
                canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            });
        } else {
            fabric.util.enlivenObjects(jsonIn, (objs) => {
                for (const obj of objs) {
                    if (obj.custom.type === "BorderControl") continue;
                    canvas.add(obj);
                }
                this.attachCustomHandlers(canvas);
                canvas.renderAll();
            });
        }
    }

    loadFloorplan(canvas, bgOnly = false) {
        fabric.Image.fromURL(this.state.floorplan?.image, (image) => {
            canvas.setHeight(image.height);
            canvas.setWidth(image.width);
            this.resizeCanvas();
            if (bgOnly || this.state.floorplan.fabric == null) {
                canvas.setBackgroundImage(image, canvas.renderAll.bind(canvas));
            } else {
                this.loadCanvasJson(this.state.floorplan.fabric, canvas);
            }
        });
    }

    setupCanvas() {
        this.canvas = new fabric.Canvas('canvas', {
            fireRightClick: true,
            fireMiddleClick: true,
            stopContextMenu: true,
        });
        const canvas = this.canvas;

        this.loadFloorplan(canvas);

        // Zooming
        // eslint-disable-next-line no-func-assign
        handleZoom = handleZoom.bind(canvas);
        handleZoom(canvas);

        // eslint-disable-next-line no-func-assign
        handleNewAreaSelection = handleNewAreaSelection.bind(canvas);
        this.canvas.saveCanvas = this.saveCanvas.bind(this);
        this.canvas.navigate = this.props.navigate;
        handleNewAreaSelection(canvas);

        // Auto save when object is moved/modified
        const that = this;
        canvas.on('object:moving', function (event) {
            that.objMoving = true;
        });

        canvas.on('object:modified', function (event) {
            that.objMoving = true;
        });

        canvas.on('mouse:up', function (event) {
            if (that.objMoving) {
                showSpinner();
                that.objMoving = false;
                that.saveCanvas();
                hideSpinner();
            }
        });
    }

    newAreaPrepare() {
        document.getElementById('defaultbtn').classList.add('hide');
        document.getElementById('newAreabtn').classList.remove('hide');
        this.canvas.areaSelect = true;
        window.unlocked = true;
    }

    async newMarker() {
        for (const template of globals.computerData.templates) {
            setTimeout(() => {
                document.getElementById(
                    "ms" + encodeURIComponent(template.name)
                ).addEventListener("click", () => this.newMarkerTemplateSelected(template));
            }, 500);
        }
        await Swal.fire({
            title: 'Új marker: sablon választás',
            html: `
                <div class="markerSelector">
                    ${globals.computerData?.templates?.map(element =>
                `<div id="${"ms" + encodeURIComponent(element.name)}" class="floorplanCard" style="background-color: ${element.color}">
                        <img class="floorPrevImg" src=${element.icon} alt=""></img>
                        <h3>${element.name}</h3>
                    </div>`
            ).join("\n")}
                </div>
            `,
            showCancelButton: true,
            showConfirmButton: false,
        });
    }

    async newMarkerTemplateSelected(template) {
        Swal.close();
        await delay(500);
        const result = await Swal.fire({
            title: template.name,
            html: `
            <input type="text" name="mName" id="mName" placeholder="Azonosító" class="swal2-input"></input>
            <div style="margin-top: 10px">
                <label for="mColor">Szín</label>
                <input type="color" name="mColor" id="mColor" value="${template.color}"/>
            </div>
            <h3 style="margin-bottom: 10px">Egyéni mezők</h3>
            ${template.fields.map(field => {
                if (field.type === "checkbox") {
                    return `<div>
                        <label for="swal2-checkbox" class="swal2-checkbox" style="display: flex;">
                            <input type="checkbox" value="1" id="fc${encodeURIComponent(field.name)}">
                            <span class="swal2-label">${field.name}</span>
                        </label>
                    </div>`;
                } else {
                    return `<div>
                        <label for="ft${encodeURIComponent(field.name)}">${field.name}</label>
                        <input type="text" style="margin-top: 0" name="ft${encodeURIComponent(field.name)}" id="ft${encodeURIComponent(field.name)}" placeholder="${field.name}" class="swal2-input"></input>
                    </div>`;
                }
            }).join("\n")}
            `,
            showCancelButton: true,
            preConfirm: () => {
                const data = {
                    name: document.getElementById("mName").value,
                    color: document.getElementById("mColor").value,
                    fields: [],
                };

                if (data.name.length === 0) {
                    alert("Adj meg egy azonosítót!");
                    return false;
                }

                if (globals.computerData.objects.filter(x => x.type === template.name).some(x => x.name === data.name)) {
                    alert("Ilyen nevű objektum már létezik!");
                    return false;
                }

                for (const field of template.fields) {
                    data.fields.push({
                        name: field.name,
                        value: field.type === "checkbox" ?
                            document.getElementById(`fc${encodeURIComponent(field.name)}`).checked :
                            document.getElementById(`ft${encodeURIComponent(field.name)}`).value,
                    });
                }

                return data;
            },
        });

        if (result.isConfirmed) {
            const that = this;

            globals.computerData.objects.push({
                ...result.value,
                type: template.name,
                path: window.location.pathname,
            });

            if (template.icon.startsWith("data:image/svg+xml")) {
                fabric.loadSVGFromURL(template.icon, (icon) => {
                    that.newMarkerImageLoaded(icon[0], result.value, template)
                });
            } else {
                fabric.Image.fromURL(template.icon, (icon) => {
                    that.newMarkerImageLoaded(icon, result.value, template);
                });
            }
        }
    }

    newMarkerImageLoaded(icon, data, template) {
        icon.scaleToWidth(150);
        icon.set({
            fill: data.color,
        });

        const text = new fabric.Text(data.name, {
            fontFamily: 'Calibri',
            visible: true,
            fill: '#000000',
        });
        text.set("top", text.getBoundingRect().height / 2 - icon.height / 2);
        text.set("left", icon.width / 2 + text.getBoundingRect().width / 2);

        const group = new fabric.Group([icon, text]);
        group.set({
            custom: {
                ...data,
                template: template.name,
                type: 'Marker',
            },
        });
        group.set({
            left: this.mainBoundRect.left,
            top: this.mainBoundRect.top,
            strokeWidth: 10,
        });
        group.set('hoverCursor', 'pointer');
        this.attachMarkerClick(group);

        this.canvas.add(group);
        this.canvas.renderAll();
        this.saveCanvas();
    }

    attachMarkerClick(marker) {
        const that = this;
        marker.on('mousedown', async (opts) => {
            if (window.unlocked) return;

            // Mashup current fields and new ones if any
            const fields = [...marker.custom.fields];
            const mainTemplate = globals.computerData.templates.find(x => x.name === marker.custom.template)?.fields ?? [];

            for (const field of mainTemplate) {
                if (fields.find(x => x.name === field.name) == null) {
                    if (field.type === "checkbox") {
                        fields.push({
                            name: field.name,
                            value: false,
                        });
                    } else {
                        fields.push({
                            name: field.name,
                            value: '',
                        });
                    }
                }
            }

            marker.custom.fields = fields;

            const result = await Swal.fire({
                title: "Marker szerkesztése",
                html: `
                    <label for="mName">Azonosító</label><br>
                    <input id="mName" class="swal2-input" style="margin-top: 0"value="${marker.custom.name}">
                    <br>
                    <label for="mColor" style="margin-top: 10px">Marker Színe</label>
                    <input type="color" style="margin-top: 10px" id="mColor" value="${marker.custom.color}">
                    <h3 style="margin-bottom: 10px">Egyéni mezők</h3>
                    ${fields.map(field => {
                    if (typeof field.value === 'boolean') {
                        return `<div>
                                <label for="swal2-checkbox" class="swal2-checkbox" style="display: flex;">
                                    <input type="checkbox" value="1" id="fc${encodeURIComponent(field.name)}" ${field.value ? 'checked' : ''}>
                                    <span class="swal2-label">${field.name}</span>
                                </label>
                            </div>`;
                    } else {
                        return `<div>
                                <label for="ft${encodeURIComponent(field.name)}">${field.name}</label>
                                <input type="text" style="margin-top: 0" name="ft${encodeURIComponent(field.name)}" id="ft${encodeURIComponent(field.name)}" value="${field.value}" class="swal2-input"></input>
                            </div>`;
                    }
                }).join("\n")}
                `,
                showCancelButton: true,
                preConfirm: () => {
                    const data = {
                        name: document.getElementById("mName").value,
                        color: document.getElementById("mColor").value,
                        fields: [],
                    };

                    if (data.name.length === 0) {
                        alert("Adj meg egy azonosítót!");
                        return false;
                    }

                    if (data.name !== marker.custom.name && globals.computerData.objects.filter(x => x.type === marker.custom.template).some(x => x.name === data.name)) {
                        alert("Ilyen nevű objektum már létezik!");
                        return false;
                    }

                    for (const field of fields) {
                        data.fields.push({
                            name: field.name,
                            value: typeof field.value === "boolean" ?
                                document.getElementById(`fc${encodeURIComponent(field.name)}`).checked :
                                document.getElementById(`ft${encodeURIComponent(field.name)}`).value,
                        });
                    }

                    return data;
                },
                showDenyButton: true,
                denyButtonText: "Törlés",
            });

            if (result.isConfirmed) {
                let changed = false;
                if (result.value.name !== marker.custom.name) {
                    globals.computerData.objects.find(x => x.name === marker.custom.name).name = result.value.name;
                    marker.custom.name = result.value.name;
                    opts.target.getObjects().find(x => x.type === 'text').set('text', result.value.name);
                    changed = true;
                }

                if (result.value.color !== marker.custom.color) {
                    marker.custom.color = result.value.color;
                    const ssvg = opts.target.getObjects().find(x => x.type === 'path');
                    if (ssvg != null) {
                        ssvg.set('fill', result.value.color);
                    }
                    globals.computerData.objects.find(x => x.name === result.value.name).color = marker.custom.color;
                    changed = true;
                }


                if (result.value.fields !== marker.custom.fields) {
                    marker.custom.fields = result.value.fields;
                    changed = true;
                    globals.computerData.objects.find(x => x.name === result.value.name).fields = marker.custom.fields;
                }

                this.setState({});

                if (changed) {
                    this.canvas.renderAll();
                    this.saveCanvas();
                }
            }

            if (result.isDenied) {
                await delay(100);
                Swal.fire({
                    title: `${marker.custom.name} törlésre fog kerülni`,
                    showDenyButton: true,
                    denyButtonText: "OK",
                    confirmButtonText: "Mégsem",
                }).then(async (y) => {
                    if (y.isDenied) {
                        showSpinner();
                        globals.computerData.objects = globals.computerData.objects.filter(x => !(x.name === marker.custom.name && x.type === marker.custom.template));
                        const obj = that.canvas.getObjects().find(x => x.custom.name === marker.custom.name && x.custom.template === marker.custom.template);
                        console.log(obj);
                        that.canvas.remove(obj);
                        await delay(750);
                        that.saveCanvas();
                        await delay(750);
                        that.canvas.renderAll();
                        that.setState({
                            computerData: globals.computerData,
                        });
                        hideSpinner();
                    }
                });
            }
        });
    }

    async exportClicked() {
        const res = await Swal.fire({
            title: "Export módja",
            confirmButtonText: "gepmap fájl",
            showDenyButton: true,
            denyButtonText: "fénykép fájl",
            denyButtonColor: "rgb(175,175,175)"
        });
        showSpinner();
        if (res.isConfirmed) {
            exportFile();
        } else if (res.isDenied) {
            const image = this.canvas.toDataURL({
                format: 'png',
                quality: 1,
            });
            const element = document.createElement('a');
            element.setAttribute('href', image);
            let filename;
            // eslint-disable-next-line eqeqeq
            if (this.state.data == this.state.floorplan) {
                filename = this.state.floorplan.name + ".png";
            } else {
                filename = this.state.data.custom.name + ".png";
            }
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();
            document.body.removeChild(element);
        }
        hideSpinner();
    }

    moveBtnHandler() {
        window.unlocked = !window.unlocked;
        this.setState({});
    }

    render() {
        return (
            <div className="floorplanview">
                <div className="floorplanview-toolbar">
                    <div id="defaultbtn">
                        <input type="button" className="btn btn-green mr-2" value="Új terület" onClick={this.newAreaPrepare}></input>
                        <input type="button" className="btn btn-green mr-2" value="Új marker" onClick={this.newMarker}></input>
                        <input type="button" className={`btn ${window.unlocked ? "btn-red" : "btn-green"} mr-2`} value={window.unlocked ? "Mozgatás vége" : "Mozgatás"} id="moveBtn" onClick={this.moveBtnHandler}></input>
                        <input type="button" className="btn btn-blue mr-2" value="Export" onClick={this.exportClicked}></input>
                        {window.isNetworkMap ? <input type="button" className="btn btn-blue mr-2" value="Mentés" onClick={saveToCloud}></input> : null}
                    </div>
                    <div id="newAreabtn" className="hide">
                        <input type="button" id="newAreabtn-done" className="btn btn-green mr-2" value="Kész"></input>
                        <input type="button" id="newAreabtn-cancel" className="btn btn-red mr-2" value="Mégsem"></input>
                        <p style={{ textAlign: 'center', display: 'inline-block', color: 'white' }}>Nyomj rá a terület sarkaira!</p>
                    </div>
                </div>
                <div className="canvasWrapper">
                    <canvas id="canvas"></canvas>
                </div>
            </div>
        );
    }
}

function handleNewAreaSelection(canvas) {
    let x = 0;
    let y = 0;
    let polygon = null;
    let polygonPoints = [];
    let lines = [];
    let lineCounter = 0;
    let drawingObject = {};
    drawingObject.type = "";
    drawingObject.background = "";
    drawingObject.border = "";

    async function done(opts, that) {
        window.unlocked = false;
        const elementId = opts.srcElement.id;

        //Just cancel
        that.areaSelect = false;
        lines.forEach(function (value, _, __) {
            canvas.remove(value);
        });
        canvas.renderAll();

        if (elementId === "newAreabtn-done" && polygonPoints.length >= 3) {
            const swalResult = await Swal.fire({
                title: "Terület létrehozása",
                html: `
                    <label for="areaName">Terület neve</label>
                    <input id="areaName" class="swal2-input">
                    <br>
                    <label for="areaColor">Terület Színe</label>
                    <input type="color" id="areaColor" value="#ff0000">
                `,
                showCancelButton: true,
                preConfirm: () => {
                    const data = {
                        areaName: document.getElementById('areaName')?.value,
                        areaColor: document.getElementById('areaColor')?.value,
                    };

                    if (data.areaName.length === 0) {
                        alert("Adj meg egy nevet!")
                        return false;
                    }

                    const objects = that.getObjects().filter(x => x.custom?.name != null && x.custom.name === data.areaName);

                    if (objects.length > 0) {
                        alert("Ilyen nevű terület már létezik");
                        return false;
                    }

                    return data;
                },
            });
            if (swalResult.isConfirmed) {
                polygon = finishPolygon(polygonPoints, {
                    color: swalResult.value.areaColor,
                    name: swalResult.value.areaName,
                });
                canvas.add(polygon);
                attachAreaClick(polygon, that.navigate, canvas, that.saveCanvas);
                canvas.renderAll();
                that.saveCanvas();
            }
            resetAreaSelection();
        } else {
            resetAreaSelection();
        }
    }

    function resetAreaSelection() {
        polygonPoints = [];
        lines = [];
        lineCounter = 0;
        document.getElementById('defaultbtn').classList.remove('hide');
        document.getElementById('newAreabtn').classList.add('hide');
    }

    const that = this;
    document.getElementById("newAreabtn-done").addEventListener('click', (opts) => {
        done(opts, that);
    });
    document.getElementById("newAreabtn-cancel").addEventListener('click', (opts) => {
        done(opts, that);
    });

    function Point(x, y) {
        this.x = x;
        this.y = y;
    }

    function setStartingPoint(options) {
        const pointer = canvas.getPointer(options.e);

        x = pointer.x;
        y = pointer.y;
    }

    canvas.on('mouse:down', (options) => {
        if (this.areaSelect && !options.e.altKey) {
            canvas.selection = false;
            setStartingPoint(options); // set x,y
            polygonPoints.push(new Point(x, y));
            let points = [x, y, x, y];
            lines.push(new fabric.Line(points, {
                strokeWidth: 3,
                selectable: false,
                stroke: 'red'
            }));
            canvas.add(lines[lineCounter]);
            lineCounter++;
            canvas.on('mouse:up', () => {
                canvas.selection = true;
            });
        }
    });

    canvas.on('mouse:move', function (options) {
        if (lines[0] !== null && lines[0] !== undefined && this.areaSelect) {
            setStartingPoint(options);
            lines[lineCounter - 1].set({
                x2: x,
                y2: y
            });
            canvas.renderAll();
        }
    });

    function finishPolygon(polygonPointsInput, details) {
        const left = findLeftPaddingForRoof(polygonPointsInput);
        const top = findTopPaddingForRoof(polygonPointsInput);
        polygonPointsInput.push(new Point(polygonPointsInput[0].x, polygonPointsInput[0].y))
        const polygon = new fabric.Polyline(polygonPointsInput, {
            fill: details.color,
            stroke: details.color,
            strokeWidth: 3,
            selectable: false,
            hasRotatingPoint: false,
        });
        polygon.set({
            left: left,
            top: top,
        });

        const center = polygon.getCenterPoint();
        const text = new fabric.Text(details.name, {
            fontFamily: 'Calibri',
            visible: true,
            selectable: false,
            hasRotatingPoint: false,
        });
        text.set({
            left: center.x,
            top: center.y,
        });

        const group = new fabric.Group([polygon, text], {
            selectable: false,
            hasRotatingPoint: false,
            hoverCursor: 'pointer',
        });
        group.set("custom", {
            type: "Area",
            name: details.name,
            id: encodeURIComponent(details.name),
        });

        return group;
    }

    function findTopPaddingForRoof(polygonPointsInput) {
        let result = 999999;
        for (let f = 0; f < lineCounter; f++) {
            if (polygonPointsInput[f].y < result) {
                result = polygonPointsInput[f].y;
            }
        }
        return Math.abs(result);
    }

    function findLeftPaddingForRoof(polygonPointsInput) {
        let result = 999999;
        for (let i = 0; i < lineCounter; i++) {
            if (polygonPointsInput[i].x < result) {
                result = polygonPointsInput[i].x;
            }
        }
        return Math.abs(result);
    }
}

function handleZoom(canvas) {
    canvas.on('mouse:wheel', (opt) => {
        let delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;
        const mPos = canvas.getPointer(opt.e);
        canvas.zoomToPoint({ x: mPos.x, y: mPos.y }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });
    canvas.on('mouse:down', (opt) => {
        const evt = opt.e;
        if (evt.altKey === true) {
            this.isDragging = true;
            this.selection = false;
            this.lastPosX = evt.clientX;
            this.lastPosY = evt.clientY;
        }
    });
    canvas.on('mouse:move', function (opt) {
        if (this.isDragging) {
            let e = opt.e;
            let vpt = this.viewportTransform;
            vpt[4] += e.clientX - this.lastPosX;
            vpt[5] += e.clientY - this.lastPosY;
            this.requestRenderAll();
            this.lastPosX = e.clientX;
            this.lastPosY = e.clientY;
        }
    });
    canvas.on('mouse:up', function () {
        this.setViewportTransform(this.viewportTransform);
        this.isDragging = false;
        this.selection = true;
    });
}

function attachAreaClick(area, navigate, canvas, saveCanvas) {
    area.on('mousedown', async (e) => {
        if (e.button === 3) {
            console.log(e);
            const res = await Swal.fire({
                title: e.target.custom.name,
                showConfirmButton: false,
                showDenyButton: true,
                denyButtonText: "Törlés",
                showCancelButton: true,
            });
            if (res.isDenied) {
                await delay(5);
                const confirm = await Swal.fire({
                    title: e.target.custom.name + " törlése",
                    text: "Ez a terület és az összes alterülete a benne található objektummokkal együtt törlésre fog kerülni!",
                    showDenyButton: true,
                    denyButtonText: "Törlés",
                    showCancelButton: true,
                    showConfirmButton: false,
                });

                if (confirm.isDenied) {
                    showSpinner();
                    globals.computerData.objects = globals.computerData.objects.filter(x => !x.path.includes(window.location.pathname + '/' + area.custom.id));

                    canvas.remove(e.target);
                    await delay(750);
                    saveCanvas();
                    await delay(750);
                    canvas.renderAll();
                    await delay(750);
                    hideSpinner();
                }
            }
        }
        if (!window.unlocked && e.button === 1) navigate(window.location.pathname + '/' + area.custom.id)
    });
}

export default withRouter(FloorplanView);