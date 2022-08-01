import globals from "./globals";

export function exportJson() {
    globals.computerData.export = new Date().toISOString();
    let stringified = JSON.stringify(globals.computerData);
    
    // Deduplicate background images
    let i = 0;
    for (const floor of globals.computerData.floorplans) {
        stringified = stringified.replaceAll(floor.image, `#toReplace#${i}`);
        stringified = stringified.replace(`#toReplace#${i}`, floor.image);
        i++;
    }

    return stringified;
}