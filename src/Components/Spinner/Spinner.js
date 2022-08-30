import React from "react";
import "./Spinner.css";

class Spinner extends React.Component {
    render() {
        return (
             <div id="spinner" className="spinnermodal hide">
                <div className="spinnercontent">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }
}


/** Show spinner modal */
export function showSpinner() {
    document.getElementById('spinner').classList.remove("hide");
    document.getElementById('spinner').classList.add("fadein");
}

/** Hide spinner modal */
export function hideSpinner() {
    document.getElementById('spinner').classList.remove("fadein");
    document.getElementById('spinner').classList.add("hide");
}

export default Spinner;