import { JsonTest } from "./JsonTest.js";
import { BinaryTest } from "./BinaryTest.js";

/** @type {MessagePort} */
let messagePort;
/** @type { Map<string, () => void> } */
const handlers = new Map();
let nextId = 0;

const UiHelpers = {
  setVal: (id, value) => {
    document.getElementById(id).innerHTML = value;
  },
  setButton: (enabled) => {
    document.getElementById("StartTests").disabled = enabled;
  },
  clearUI: () => {
    UiHelpers.resetTable();
  },
  // getPayloadSize: () => +document.getElementById("payload").value,
  /**
   * @param s { { [key: string]: {} } }
   * @param id { string }
   */
  outputTable: (s, id) => {
    const cols = [];
    for (const k in s) {
      for (const c in s[k]) {
        if (cols.indexOf(c) === -1) cols.push(c);
      }
    }
    let html =
      "<thead><tr><th></th>" +
      cols.map((c) => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>";
    for (const l in s) {
      html +=
        "<tr><th>" +
        l +
        "</th>" +
        cols.map((c) => "<td>" + (s[l][c] || "") + "</td>").join("") +
        "</tr>";
    }
    html += "</tbody>";
    const table = document.createElement("table");
    table.id = `results-table-${id}`;
    table.innerHTML = html;
    document.body.appendChild(table);
  },
  resetTable: () => {
    document.querySelectorAll("table")?.forEach((t) => t.remove());
  },
};

window.onmessage = (event) => {
  const [port] = event.ports;
  messagePort = port;
  window.onmessage = null;

  messagePort.onmessage = ({ data: { id, payload } }) => {
    handlers.get(id)?.(id);
    handlers.delete(id); // all handlers only last once
  };
};

document.getElementById("StartTests").addEventListener("click", startTests);

/** @param payload { Uint8Array } */
async function sendViaMessagePortUsingTransferable(payload) {
  return new Promise((r) => {
    const id = ++nextId;
    handlers.set(id, r);
    messagePort.postMessage({ id, payload, t: true }, [payload.buffer]);
  });
}

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
  return response.id;
}

/** @param animate { boolean } */
async function startTests() {
  UiHelpers.clearUI();
  UiHelpers.setButton(true);
  const resultsBinary = await new BinaryTest(
    sendViaMessagePort,
    sendViaIpcRenderer,
    sendViaMessagePortUsingTransferable
  ).run();
  UiHelpers.outputTable(resultsBinary, "binary");
  const resultsJson = await new JsonTest(
    sendViaMessagePort,
    sendViaIpcRenderer
  ).run();
  UiHelpers.outputTable(resultsJson, "json");
  UiHelpers.setButton(false);
}
