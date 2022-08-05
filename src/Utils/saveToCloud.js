import config from '../config';
import Swal from 'sweetalert2';
import { error } from './swal';
import { exportJson } from './exportJson';
import { showSpinner, hideSpinner } from '../Components/Spinner/Spinner';
import { globals } from './globals';

export async function createInCloud() {
    const result = await Swal.fire({
        icon: 'warning',
        title: 'Feltöltés a szerverre',
        text: 'Fel fog kerülni a szerverre, ahol mindenki látni fogja, biztosan folytatod?',
        showCancelButton: true,
        showConfirmButton: false,
        showDenyButton: true,
        denyButtonText: 'Irány a felhő!',
    });

    if (result.isDenied) {
        showSpinner();
        try {
            await fetch(`${config.apiAddress}/api/create`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: globals.computerData.name, map: exportJson() })
            });
        } catch (err) {
            error("Hiba feltöltés közben", err);
        } finally {
            hideSpinner();
        }
    }
}

export async function saveToCloud() {
    const result = await Swal.fire({
        icon: 'warning',
        title: 'Mentés a szerverre',
        text: 'Ezzel felül írod a jelenlegi verziót, biztosan folytatod?',
        showCancelButton: true,
        showConfirmButton: false,
        showDenyButton: true,
        denyButtonText: 'Irány a felhő!',
    });

    if (result.isDenied) {
        showSpinner();
        try {
            await fetch(`${config.apiAddress}/api/upload`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: window.mapId, map: exportJson() })
            });
        } catch (err) {
            error("Hiba feltöltés közben", err);
        } finally {
            hideSpinner();
        }
    }
}