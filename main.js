const {
  ipcMain,
  BrowserWindow,
  app,
  MessageChannelMain,
  ipcRenderer,
} = require("electron");
const path = require("path");
app.allowRendererProcessReuse = true;
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

  // renderer.webContents.openDevTools();

  ipcMain.handle("to-main", (ev, payload) => {
    return { id: payload.id };
  });
});
