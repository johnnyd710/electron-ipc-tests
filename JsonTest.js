import { payload } from "./payload.js";

export class JsonTest {
  /**
   * @param sendViaMessagePort { () => Promise<void> }
   * @param sendViaIpcRenderer { () => Promise<void> }
   */
  constructor(sendViaMessagePort, sendViaIpcRenderer) {
    this.sendViaMessagePort = sendViaMessagePort;
    this.sendViaIpcRenderer = sendViaIpcRenderer;
  }
  createPayloads() {
    this.PAYLOAD_1_KB = payload[1];
    this.PAYLOAD_26_KB = payload[2];
    this.PAYLOAD_500_KB = payload[3];
  }
  async run() {
    this.createPayloads();
    const suite = new Benchmark.Suite();
    return new Promise((resolve) => {
      suite
        .add("MessagePort#Json#26KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaMessagePort(this.PAYLOAD_26_KB);
            deferred.resolve();
          },
        })
        .add("IpcRenderer#Json#26KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaIpcRenderer(this.PAYLOAD_26_KB);
            deferred.resolve();
          },
        })
        .add("MessagePort#Json#500KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaMessagePort(this.PAYLOAD_500_KB);
            deferred.resolve();
          },
        })
        .add("IpcRenderer#Json#500KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaIpcRenderer(this.PAYLOAD_500_KB);
            deferred.resolve();
          },
        })
        .add("MessagePort#Json#1KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaMessagePort(this.PAYLOAD_1_KB);
            deferred.resolve();
          },
        })
        .add("IpcRenderer#Json#1KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaIpcRenderer(this.PAYLOAD_1_KB);
            deferred.resolve();
          },
        })
        // add listeners
        .on("cycle", function (event) {
          console.log(event.target.toString());
        })
        .on("complete", function () {
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
                },
                cur.note !== undefined && {
                  note: cur.note,
                }
              )),
              prev
            );
          }, {});
          resolve(results);
        })
        .run();
    });
  }
}
