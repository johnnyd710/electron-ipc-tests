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
    const payloads = [26, 128, 500, 1024];
    for (const kb of payloads) {
      const title = `MessagePort#${kb}KB`;
      const count = await this.testUtility(kb);
      const data = (count * kb) / 1024;
      const seconds = 10;
      results[title] = {
        "MB/s": Number(data / seconds).toFixed(2),
        samples: count,
      };
    }
    for (const kb of payloads) {
      const title = `IpcRenderer#${kb}KB`;
      const count = await this.testMain(kb);
      const data = (count * kb) / 1024;
      const seconds = 10;
      results[title] = {
        "MB/s": Number(data / seconds).toFixed(2),
        samples: count,
      };
    }
    const sortable = Object.fromEntries(
      Object.entries(results).sort(([, a], [, b]) => b["MB/s"] - a["MB/s"])
    );
    return sortable;
  }

  /**
   * @param kb { number }
   * @returns results { Promise<number> }
   */
  async testUtility(kb) {
    let returnFn;
    const returnPromise = new Promise((r) => (returnFn = r));
    const collection = [];
    // add a listener to collect data and count responses
    const listener = (data) => {
      if (data.done) {
        this.handlers.delete("throughput-test");
        returnFn(collection.length);
      } else {
        collection.push(data.data);
      }
    };
    this.handlers.set("throughput-test", listener);
    // send a signal to main start the test
    this.messagePort.postMessage({ id: "start-throughput-test", kb });
    return returnPromise;
  }

  /**
   * @param kb { number }
   * @returns results { Promise<number> }
   */
  async testMain(kb) {
    let returnFn;
    const returnPromise = new Promise((r) => (returnFn = r));
    const collection = [];
    // add a listener to collect data and count responses
    window.api.addListener("throughput-test", (ev, data) => {
      if (data.done) {
        window.api.rmListeners("throughput-test");
        returnFn(collection.length);
      } else {
        collection.push(data.data);
      }
    });
    // send a signal to main start the test
    await window.api.invoke("start-throughput-test", kb);
    return returnPromise;
  }
}
