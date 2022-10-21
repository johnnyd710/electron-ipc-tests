import { payload } from "./payload.js";

/** @type {MessagePort} */
let messagePort;
/** @type { Map<string, () => void> } */
const handlers = new Map();
let nextId = 0;

const TestHelpers = {
  generateStaticTypedArray: (kb) => {
    const bytes = kb * 1000;
    const buffer = new ArrayBuffer(bytes);
    return new Uint8Array(buffer);
  },
  generateStaticJson: () => {
    const jsonPayloadSize = {
      SMALL: 1,
      MEDIUM: 2,
      LARGE: 3,
    };
    return payload[jsonPayloadSize.MEDIUM];
  },
};

const UiHelpers = {
  setVal: (id, value) => {
    document.getElementById(id).innerHTML = value;
  },
  setButton: (enabled) => {
    document.getElementById("StartTests").disabled = enabled;
    document.getElementById("StartTestsAnimate").disabled = enabled;
  },
  clearUI: () => {
    UiHelpers.resetTable();
    document.getElementById("animation")?.remove();
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
  animate: () => {
    const animation = document.createElement("img");
    animation.id = "animation";
    animation.src = "https://i.imgur.com/kDDFvUp.png";
    animation.height = 100;
    animation.width = 100;
    animation.className = "rotate";
    document.body.appendChild(animation);
  }
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

document.getElementById("StartTests").addEventListener("click", () => startTests(false));
document.getElementById("StartTestsAnimate").addEventListener("click", () => startTests(true));

/** @param binary { Uint8Array } */
async function sendViaMessagePortUsingTransferable(binary) {
  return new Promise((r) => {
    const id = ++nextId;
    handlers.set(id, r);
    messagePort.postMessage({ id, binary }, [binary]);
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
  const response = await window.api.invoke("to-main", {
    payload,
  });
  return response;
}

/** @param animate { boolean } */
async function startTests(animate) {
  UiHelpers.clearUI();
  UiHelpers.setButton(true);
  if (animate) UiHelpers.animate();
  await runBenchmark();
}

async function runBenchmark() {
  const suite = new Benchmark.Suite();
  suite
    .add("MessagePort#Json", {
      defer: true,
      fn: async function (deferred) {
        const payload = TestHelpers.generateStaticJson();
        await sendViaMessagePort(payload);
        deferred.resolve();
      },
    })
    .add("IpcRenderer#Json", {
      defer: true,
      fn: async function (deferred) {
        const payload = TestHelpers.generateStaticJson();
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
        await sendViaMessagePortUsingTransferable(payload.buffer);
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
