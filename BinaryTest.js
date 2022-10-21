export class BinaryTest {
  /**
   * @param sendViaMessagePort { () => Promise<void> }
   * @param sendViaIpcRenderer { () => Promise<void> }
   * @param sendViaMessagePortOptimized { () => Promise<void> }
   */
  constructor(
    sendViaMessagePort,
    sendViaIpcRenderer,
    sendViaMessagePortOptimized
  ) {
    this.sendViaMessagePort = sendViaMessagePort;
    this.sendViaIpcRenderer = sendViaIpcRenderer;
    this.sendViaMessagePortOptimized = sendViaMessagePortOptimized;
  }
  setup() {
    // we must generate payload every time (see Transferables)
    this.getPayload = (kb) => {
      const bytes = kb * 1024 * 8;
      return new Uint8Array(bytes).map((v, i) => i);
    };
  }
  async run() {
    this.setup();
    const suite = new Benchmark.Suite();
    return new Promise((resolve) => {
      suite
        .add("MessagePort#Binary#26KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaMessagePort(this.getPayload(26));
            deferred.resolve();
          },
        })
        .add("IpcRenderer#Binary#26KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaIpcRenderer(this.getPayload(26));
            deferred.resolve();
          },
        })
        .add("MessagePortOptimized#Binary#26KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaMessagePortOptimized(this.getPayload(26));
            deferred.resolve();
          },
        })
        .add("MessagePort#Binary#128KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaMessagePort(this.getPayload(128));
            deferred.resolve();
          },
        })
        .add("IpcRenderer#Binary#128KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaIpcRenderer(this.getPayload(128));
            deferred.resolve();
          },
        })
        .add("MessagePortOptimized#Binary#128KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaMessagePortOptimized(this.getPayload(128));
            deferred.resolve();
          },
        })
        .add("MessagePort#Binary#1024KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaMessagePort(this.getPayload(1024));
            deferred.resolve();
          },
        })
        .add("IpcRenderer#Binary#1024KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaIpcRenderer(this.getPayload(1024));
            deferred.resolve();
          },
        })
        .add("MessagePortOptimized#Binary#1024KB", {
          defer: true,
          fn: async (deferred) => {
            await this.sendViaMessagePortOptimized(this.getPayload(1024));
            deferred.resolve();
          },
        })
        // add listeners
        .on("cycle", function (event) {
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
          resolve(results);
        })
        .run();
    });
  }
}
