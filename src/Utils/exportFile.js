import globals from './globals';
import { exportJson } from './exportJson';

/**
 * Save workspace with all data as a gepmap file, and start downloading it
 */
export function exportFile() {
    const res = exportJson();

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(res));
    element.setAttribute('download', globals.computerData.name + '.gepmap');
    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();
    document.body.removeChild(element);
}