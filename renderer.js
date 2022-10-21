import { JsonTest } from "./JsonTest.js";

/** @type {MessagePort} */
let messagePort;
/** @type { Map<string, () => void> } */
const handlers = new Map();
let nextId = 0;

const TestHelpers = {
  generateStaticTypedArray: (kb) => {
    const bytes = kb * 1024 * 8;
    return new Uint8Array(bytes).map((v, i) => i);
  },
};

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
    messagePort.postMessage({ id, payload }, [payload.buffer]);
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
  const results = await new JsonTest(
    sendViaMessagePort,
    sendViaIpcRenderer
  ).run();
  UiHelpers.outputTable(results);
  UiHelpers.setButton(false);
  // await runBenchmark();
}

async function runBenchmark() {
  const suite = new Benchmark.Suite();
  suite
    .add("MessagePort#Json", {
      defer: true,
      fn: async function (deferred) {
        const payload = TestHelpers.generateStaticJson(
          UiHelpers.getPayloadSize()
        );
        await sendViaMessagePort(payload);
        deferred.resolve();
      },
    })
    .add("IpcRenderer#Json", {
      defer: true,
      fn: async function (deferred) {
        const payload = TestHelpers.generateStaticJson(
          UiHelpers.getPayloadSize()
        );
        await sendViaIpcRenderer(payload);
        deferred.resolve();
      },
    })
    .add("MessagePort#Uint8Array", {
      defer: true,
      fn: async function (deferred) {
        const payload = TestHelpers.generateStaticTypedArray(
          UiHelpers.getPayloadSize()
        );
        await sendViaMessagePort(payload);
        deferred.resolve();
      },
    })
    .add("MessagePort#Uint8ArrayOptimized", {
      defer: true,
      fn: async function (deferred) {
        const payload = TestHelpers.generateStaticTypedArray(
          UiHelpers.getPayloadSize()
        );
        await sendViaMessagePortUsingTransferable(payload);
        deferred.resolve();
      },
    })
    .add("IpcRenderer#Uint8Array", {
      defer: true,
      fn: async function (deferred) {
        const payload = TestHelpers.generateStaticTypedArray(
          UiHelpers.getPayloadSize()
        );
        await sendViaIpcRenderer(payload);
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
