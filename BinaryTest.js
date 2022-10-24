export class BinaryTest {
  /**
   * @param sendViaMessagePort { () => Promise<void> }
   * @param sendViaIpcRenderer { () => Promise<void> }
   */
  constructor(sendViaMessagePort, sendViaIpcRenderer) {
    this.sendViaMessagePort = sendViaMessagePort;
    this.sendViaIpcRenderer = sendViaIpcRenderer;
  }
  /** @param sizes { number[] } */
  createPayloads(sizes) {
    const cache = {};
    // create the we Uint8Array at setup because creating a Uint8Array for each run is expensive
    // and we are testing latency not the time it takes to create a Uint8Array...
    for (const size of sizes) {
      cache[size] = new Uint8Array(size * 1024).map(() =>
        Math.floor(Math.random() * 255)
      );
    }
    this.getPayload = (size) => {
      if (undefined === cache[size]) throw Error("Size not found in cache");
      return cache[size];
    };
  }
  async run() {
    this.createPayloads([26, 128, 1024]);
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
