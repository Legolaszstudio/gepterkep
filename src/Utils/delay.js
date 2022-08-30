/**
 * Create promise resolving in `time` milliseconds
 * @param {number} time Delay in milliseconds
 */
export async function delay(time) {
    await new Promise(resolve => setTimeout(resolve, time));
}