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
    messagePort.onmessage = ({ data }) => {
      messagePort.postMessage(data);
    }
  };
  
/** sends ipc messages roundtrip to main process and back again
 * @param {number} iterations
 * @returns { Promise<Map<string, string>> } map of each message sent roundtrip with measurement time
 */
export function toMainTest(iterations) {
    return new Promise((resolve) => {
        const sent = new Map;
        const measurements = new Map;
        window.api.toRenderer(({ id, payload }) => {
            const start = sent.get(id);
            measurements.set(id, performance.now() - start);
            if (measurements.size >= iterations) {
                resolve(measurements);
            }
        });
    
        for (let i = 1; i <= iterations; i++) {
            sent.set(i, performance.now());
            window.api.toMain({ id: i, payload: payload.small });
        }
    });
}

/** sends ipc messages roundtrip to background renderer and back again
 * @param {number} iterations
 * @returns { Promise<Map<string, string>> } map of each message sent roundtrip with measurement time
 */
 export function toUtilityTest(iterations) {
    return new Promise((resolve) => {
        const sent = new Map;
        const measurements = new Map;
        messagePort.addEventListener("message", ({ data: { id, payload }}) => {
            const start = sent.get(id);
            measurements.set(id, performance.now() - start);
            if (measurements.size >= iterations) {
                resolve(measurements);
            }
        });
    
        for (let i = 1; i <= iterations; i++) {
            sent.set(i, performance.now());
            messagePort.postMessage({ id: i, payload: payload.small });
        }
    
    });

}