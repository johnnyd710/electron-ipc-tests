const { ipcMain, BrowserWindow, app, MessageChannelMain } = require("electron");
const path = require("path");

/** @type {BrowserWindow} */
let renderer;

// Create a hidden background window
/** @returns {BrowserWindow} */
function createBgWindow() {
  result = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  result.loadURL("file://" + __dirname + "/background.html");
  result.on("closed", () => {
    console.log("background window closed");
  });
  return result;
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
    // call quit to exit, otherwise the background windows will keep the app running
    app.quit();
  });

  // create background thread
  const background = createBgWindow();

  const { port1, port2 } = new MessageChannelMain();
  renderer.once("ready-to-show", () => {
    renderer.webContents.postMessage("port", null, [port1]);
  });
  background.once("ready-to-show", () => {
    background.webContents.postMessage("port", null, [port2]);
  });

  renderer.webContents.openDevTools();

  ipcMain.handle("to-main", (ev, data) => {
    const { payload, id } = data;
    return { id, payload };
  });

  ipcMain.handle("start-throughput-test", (ev, kb) => {
    throughputTests(kb);
  });
});

async function throughputTests(kb) {
  // blast throughput-test with data but don't block main?
  let n = 0;
  const startTime = performance.now();
  while (performance.now() - startTime < 10_000) {
    const payload = {
      data: new Uint8Array(kb * 1024 * 8).map((v, i) => i),
      id: ++n,
    };
    renderer.webContents.send("throughput-test", payload);
  }
  renderer.webContents.send("throughput-test", { done: true });
}
