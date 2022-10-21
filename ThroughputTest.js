export class ThroughputTest {
  /**
   * @param handlers { Map<string, () => void> }
   * @param messagePort { MessagePort }
   */
  constructor(handlers, messagePort) {
    /** @type handlers { Map<string, () => void> } */
    this.handlers = handlers;
    /** @type messagePort { MessagePort } */
    this.messagePort = messagePort;
  }

  async run() {
    let results = {};
    const payloads = [32, 256, 512];
    for (const mb of payloads) {
      const title = `MessagePort#${mb}mb`;
      const ms = await this.testUtility(mb);
      const seconds = ms / 1000;
      results[title] = {
        "MB/s": Number(mb / seconds).toFixed(2),
        ms: Number(ms).toFixed(2),
      };
    }
    for (const mb of payloads) {
      const title = `MessagePortOptimized#${mb}mb`;
      const ms = await this.testUtility(mb, true);
      const seconds = ms / 1000;
      results[title] = {
        "MB/s": Number(mb / seconds).toFixed(2),
        ms: Number(ms).toFixed(2),
      };
    }
    for (const mb of payloads) {
      const title = `IpcRenderer#${mb}mb`;
      const ms = await this.testMain(mb);
      const seconds = ms / 1000;
      results[title] = {
        "MB/s": Number(mb / seconds).toFixed(2),
        ms: Number(ms).toFixed(2),
      };
    }
    const sortable = Object.fromEntries(
      Object.entries(results).sort(([, a], [, b]) => b["MB/s"] - a["MB/s"])
    );
    return sortable;
  }

  /**
   * @param mb { number }
   * @param optimize { boolean }
   * @returns { Promise<number> }
   */
  async testUtility(mb, optimize) {
    let returnFn;
    let start;
    const returnPromise = new Promise((r) => (returnFn = r));
    const collection = [];
    // add a listener to collect data and count responses
    const listener = (data) => {
      if (data.start) {
        start = performance.now();
      } else if (data.done) {
        this.handlers.delete("throughput-test");
        returnFn(performance.now() - start);
      } else {
        collection.push(data.data);
      }
    };
    this.handlers.set("throughput-test", listener);
    // send a signal to main start the test
    this.messagePort.postMessage({ id: "start-throughput-test", mb, optimize });
    return returnPromise;
  }

  /**
   * @param mb { number }
   * @returns { Promise<number> }
   */
  async testMain(mb) {
    let returnFn;
    let start;
    const returnPromise = new Promise((r) => (returnFn = r));
    const collection = [];
    // add a listener to collect data and count responses
    window.api.addListener("throughput-test", (ev, data) => {
      if (data.start) {
        start = performance.now();
      } else if (data.done) {
        window.api.rmListeners("throughput-test");
        returnFn(performance.now() - start);
      } else {
        collection.push(data.data);
      }
    });
    // send a signal to main start the test
    await window.api.invoke("start-throughput-test", mb);
    return returnPromise;
  }
}
