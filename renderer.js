import { payload } from "./payload.js";

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
  getPayloadSize: () => +document.getElementById("payload").value,
  /** @param s { { [key: string]: {} } } */
  outputTable: (s) => {
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
    table.id = "results-table";
    table.innerHTML = html;
    document.body.appendChild(table);
  },
  resetTable: () => {
    document.getElementById("results-table")?.remove();
  },
};

window.onmessage = (event) => {
  const [port] = event.ports;
  messagePort = port;
  window.onmessage = null;

  messagePort.onmessage = ({ data: { id, payload } }) => {
    handlers.get(id)?.();
    handlers.delete(id); // all handlers only last once
  };
};

document.getElementById("StartTests").addEventListener("click", startTests);

async function sendViaMessagePort(payloadSize) {
  return new Promise((r) => {
    const id = ++nextId;
    handlers.set(id, r);
    messagePort.postMessage({ id, payload: payload[payloadSize] });
  });
}

async function sendViaIpcRenderer(payloadSize) {
  const response = await window.api.invoke("to-main", {
    payload: payload[payloadSize],
  });
  return response;
}

async function startTests() {
  UiHelpers.clearUI();
  UiHelpers.setButton(true);
  runBenchmark(UiHelpers.getPayloadSize());
}

/** @param payloadSize { number } */
function runBenchmark(payloadSize) {
  const suite = new Benchmark.Suite();
  suite
    .add("MessagePort", {
      defer: true,
      fn: async function (deferred) {
        await sendViaMessagePort(payloadSize);
        deferred.resolve();
      },
    })
    .add("IpcRenderer", {
      defer: true,
      fn: async function (deferred) {
        await sendViaIpcRenderer(payloadSize);
        deferred.resolve();
      },
    })
    // add listeners
    .on("cycle", function (event) {
      if (event.aborted) {
        UiHelpers.setButton(false);
        console.log(`test '${event.target.name}' was aborted`);
      }
      if (event.cancelled) {
        UiHelpers.setButton(false);
        console.log(`test '${event.target.name}' was cancelled`);
      }

      console.log(event.target.toString());
    })
    .on("complete", function () {
      const maxHz = this.sort((a, b) => b.hz - a.hz)[0].hz;
      console.log(`ran on ${Benchmark.platform.description}`);
      const results = this.sort(function (a, b) {
        return b.hz - a.hz;
      }).reduce(function (prev, cur) {
        return (
          (prev[cur.name] = Object.assign(
            {
              "ops/s": Number(cur.hz).toFixed(2),
              samples: cur.stats.sample.length,
              "margin of error": "\u00B1".concat(
                Number(cur.stats.rme).toFixed(2),
                "%"
              ),
              ratio: Number(cur.hz / maxHz).toFixed(2),
            },
            cur.note !== undefined && {
              note: cur.note,
            }
          )),
          prev
        );
      }, {});
      UiHelpers.outputTable(results);
      UiHelpers.setButton(false);
    })
    // run async
    .run();
}
