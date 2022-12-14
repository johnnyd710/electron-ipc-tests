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

  /**
   * Adds result of _run to results
   * @param { (mb: number) => Promise<number>} initiateTest
   * @param { {[key: string]: number } } results
   * @param { string } name
   */
  async _run(initiateTest, results, name) {
    const dataTransferSize_MB = 256; // MB worth of data from backend to frontend
    // do a few so we can take the average
    const title = `${name}#${dataTransferSize_MB}mb`;
    const runs = [];
    const maxRuns = 5;
    for (let i = 0; i < maxRuns; i++) {
      // start the actual test
      const ms = await initiateTest(dataTransferSize_MB);
      runs.push(ms);
    }
    const average = runs.reduce((p, c) => p + c, 0) / maxRuns;
    const seconds = average / 1000;
    results[title] = {
      "MB/s": Number(dataTransferSize_MB / seconds).toFixed(2),
      "avg time (ms)": Number(average).toFixed(2),
      runs: maxRuns,
    };
  }

  async run() {
    let results = {};
    await this._run((mb) => this.testUtility(mb), results, "MessagePort");
    await this._run(
      (mb) => this.testUtility(mb, true),
      results,
      "MessagePortOptimized"
    );
    await this._run((mb) => this.testMain(mb), results, "IpcRenderer");
    const sortable = Object.fromEntries(
      Object.entries(results).sort(([, a], [, b]) => b["MB/s"] - a["MB/s"])
    );
    return sortable;
  }

  /**
   * Listens for data from the backend.
   * Sends a signal to the backend to start the test.
   * Once the backend sends a { start: true } response, starts recording the elapsed time.
   * Once the backend sends a { done: true } response, function returns with the elapsed time.
   * @param mb { number }
   * @param optimize { boolean }
   * @returns { Promise<number> }
   */
  async testUtility(mb, optimize) {
    let returnFn;
    let start;
    const returnPromise = new Promise((r) => (returnFn = r));
    // collects data from backend
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
   * Listens for data from the backend.
   * Sends a signal to the backend to start the test.
   * Once the backend sends a { start: true } response, starts recording the elapsed time.
   * Once the backend sends a { done: true } response, function returns with the elapsed time.
   * @param mb { number }
   * @returns { Promise<number> }
   */
  async testMain(mb) {
    let returnFn;
    let start;
    const returnPromise = new Promise((r) => (returnFn = r));
    // collects data from backend
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
