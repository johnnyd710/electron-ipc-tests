/** @type {MessagePort} */
let messagePort;
/**
 * @param mb { number }
 * @param optimize { boolean }
 */
async function throughputTests(mb, optimize) {
  // pre-generate the arrays so we don't measure time to create fake data...
  const data = [];
  const sizeOfEachMessage = 128 * 1024 * 10; // in bytes
  let curr = 0;
  while (curr < mb) {
    data.push(
      new Uint8Array(sizeOfEachMessage).map(() =>
        Math.floor(Math.random() * 255)
      )
    );
    curr += sizeOfEachMessage / 1024 / 1024; // convert back to mb
  }
  // now that we have generated the data we want to send, alert the frontend the test should start
  messagePort.postMessage({ id: "throughput-test", payload: { start: true } });
  // now send data to the frontend as fast as we can :)
  data.forEach((d, i) => {
    const payload = {
      data: d,
      id: i,
    };
    if (optimize) {
      console.log("sending optimized buffer", payload);
      messagePort.postMessage({ id: "throughput-test", payload }, [
        payload.data.buffer,
      ]);
    } else {
      messagePort.postMessage({ id: "throughput-test", payload });
    }
  });
  // test is complete, alert the frontend
  messagePort.postMessage({ id: "throughput-test", payload: { done: true } });
}
process.parentPort.once("message", async (event) => {
  const [port] = event.ports;
  messagePort = port;
  messagePort.on("message", ({ data }) => {
    const { payload, id, mb, optimize } = data;
    if (id === "start-throughput-test") {
      throughputTests(mb, optimize);
    } else {
      messagePort.postMessage({ id, payload });
    }
  });
  messagePort.start();
});
