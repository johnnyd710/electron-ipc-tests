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

  ipcMain.handle("to-main", (ev, data) => {
    const { payload, id } = data;
    return { id, payload };
  });

  ipcMain.handle("start-throughput-test", (ev, kb) => {
    throughputTests(kb);
  });
  renderer.webContents.openDevTools();
});

async function throughputTests(mb) {
  // pre-generate the arrays so we don't measure time to create fake data...
  const data = [];
  const sizeOfEachMessage = 128 * 1024 * 10; // in bytes
  let curr = 0;
  while (curr < mb) {
    data.push(new Uint8Array(sizeOfEachMessage).map((v, i) => i));
    curr += sizeOfEachMessage / 1024 / 1024; // convert back to mb
  }
  renderer.webContents.send("throughput-test", { start: true });
  // now send them all to the frontend as fast as we can :)
  data.forEach((d, i) => {
    const payload = {
      data: d,
      id: i,
    };
    renderer.webContents.send("throughput-test", payload);
  });
  renderer.webContents.send("throughput-test", { done: true });
}
