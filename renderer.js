import { JsonTest } from "./JsonTest.js";
import { BinaryTest } from "./BinaryTest.js";
import { ThroughputTest } from "./ThroughputTest.js";
import { UiHelpers } from "./ui.js";

/** @type {MessagePort} */
let messagePort;
/** @type { Map<string, () => void> } */
const handlers = new Map();
let nextId = 0;

window.onmessage = (event) => {
  const [port] = event.ports;
  messagePort = port;
  window.onmessage = null;

  messagePort.onmessage = ({ data: { id, payload } }) => {
    handlers.get(id)?.(payload); // resolve id
  };
};

document.getElementById("StartTests").addEventListener("click", startTests);

async function sendViaMessagePort(payload) {
  return new Promise((r) => {
    const id = ++nextId;
    handlers.set(id, r);
    messagePort.postMessage({ id, payload });
  });
}

async function sendViaIpcRenderer(payload) {
  const id = ++nextId;
  const response = await window.api.invoke("to-main", {
    id,
    payload,
  });
  return response.payload;
}

/** @param animate { boolean } */
async function startTests() {
  UiHelpers.clearUI();
  UiHelpers.setLoading(true);
  // start binary test
  const resultsBinary = await new BinaryTest(
    sendViaMessagePort,
    sendViaIpcRenderer
  ).run();
  UiHelpers.outputTable(resultsBinary, "binary");
  // start json test
  const resultsJson = await new JsonTest(
    sendViaMessagePort,
    sendViaIpcRenderer
  ).run();
  UiHelpers.outputTable(resultsJson, "json");
  // start throughput test
  const resultsThroughput = await new ThroughputTest(
    handlers,
    messagePort
  ).run();
  UiHelpers.outputTable(resultsThroughput, "throughput");
  UiHelpers.setLoading(false);
  handlers.clear();
}
