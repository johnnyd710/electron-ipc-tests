const payload = {
    "small": {
        "test": "a small payload test"
    }
}

/** @type {MessagePort} */
let messagePort;
window.onmessage = (event) => {
    const [port] = event.ports;
    messagePort = port;
    window.onmessage = null;
  };
  
/** sends ipc messages roundtrip to main process and back again
 * @param {number} iterations
 * @returns { Promise<Map<string, string>> } map of each message sent roundtrip with measurement time
 */
export async function toMainTest(iterations) {
    const sent = new Map;
    const measurements = new Map;
    let resolve;
    const listener = ({ id, payload }) => {
        const start = sent.get(id);
        measurements.set(id, performance.now() - start);
        resolve();
    }
    window.api.toRenderer(listener);

    for (let i = 1; i <= iterations; i++) {
        const response = new Promise(r => resolve = r);
        sent.set(i, performance.now());
        window.api.toMain({ id: i, payload: payload.small });
        await response;
        resolve = undefined;
    }

    window.api.rmToRenderer(listener);
    return measurements;
}

/** sends ipc messages roundtrip to background renderer and back again
 * @param {number} iterations
 * @returns { Promise<Map<string, string>> } map of each message sent roundtrip with measurement time
 */
 export async function toUtilityTest(iterations) {
    const sent = new Map;
    const measurements = new Map;
    const listener = ({ data: { id, payload }}) => {
        const start = sent.get(id);
        if (start && payload) {
            measurements.set(id, performance.now() - start);
            resolve();
        }
    };
    let resolve;
    messagePort.onmessage = listener;
    for (let i = 1; i <= iterations; i++) {
        const response = new Promise(r => resolve = r);
        sent.set(i, performance.now());
        messagePort.postMessage({ id: i, payload: payload.small });
        await response;
        resolve = undefined;
    }
    messagePort.onmessage = null;
    return measurements;
}