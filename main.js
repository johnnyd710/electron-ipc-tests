const {
  ipcMain,
  BrowserWindow,
  app,
  MessageChannelMain,
  utilityProcess,
} = require("electron");
const path = require("path");

/** @type {Electron.BrowserWindow} */
let renderer;
/** @type {Electron.UtilityProcess} */
let worker;

/** Create a Utility Process
 * @param { MessagePort } port
 * @returns {Electron.UtilityProcess}
 */
function createUtilityProcess(port) {
  let child = utilityProcess.fork(
    path.join(__dirname, "worker.js"),
    undefined,
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  // Send utilityPort to the utility process
  child.on("spawn", () => {
    child.postMessage("port", [port]);
  });
  // Utility process can also send messages to the main process via process.parentPort
  // We can listen to them via
  child.on("message", (data) => {
    console.log(`MESSAGE FROM CHILD TO MAIN: ${data}`);
  });
  // Child process emits exit event on termination
  child.on("exit", (code) => {
    console.log(`CHILD EXITED WITH CODE: ${code}`);
  });
  child.stdout.on("data", function (data) {
    console.log("stdout: " + data);
  });
  child.stderr.on("data", function (data) {
    console.log("stderr: " + data);
  });
  return child;
}

app.whenReady().then(function () {
  // Create the "renderer" window which contains the visible UI
  renderer = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  renderer.loadURL("file://" + __dirname + "/renderer.html");
  renderer.show();
  renderer.on("closed", () => {
    app.quit();
  });

  const { port1, port2 } = new MessageChannelMain();

  // create worker process
  worker = createUtilityProcess(port2);

  renderer.once("ready-to-show", () => {
    renderer.webContents.postMessage("port", null, [port1]);
  });

  ipcMain.handle("to-main", (ev, data) => {
    const { payload, id } = data;
    return { id, payload };
  });

  ipcMain.handle("start-throughput-test", (ev, mb) => {
    throughputTests(mb);
  });
  renderer.webContents.openDevTools();
});

async function throughputTests(mb) {
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
  // alert the frontend that the test is beginning
  renderer.webContents.send("throughput-test", { start: true });
  // now send them all to the frontend as fast as we can :)
  data.forEach((d, i) => {
    const payload = {
      data: d,
      id: i,
    };
    renderer.webContents.send("throughput-test", payload);
  });
  // alert the frontend that the test is finished
  renderer.webContents.send("throughput-test", { done: true });
}
