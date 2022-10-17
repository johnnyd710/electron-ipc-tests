const { ipcMain, BrowserWindow, app, MessageChannelMain } = require("electron");
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
    width: 500,
    height: 400,
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

  // Main thread can receive directly from windows
  ipcMain.on("to-main", (event, arg) => {
    renderer.webContents.send("to-renderer", arg);
  });

  const { port1, port2 } = new MessageChannelMain();
  renderer.once("ready-to-show", () => {
    renderer.webContents.postMessage("port", null, [port1]);
  });
  background.once("ready-to-show", () => {
    background.webContents.postMessage("port", null, [port2]);
  });

  // Send message to renderer through ipc (for the main ipc tests)
  ipcMain.on("for-renderer", (event, arg) => {
    renderer.webContents.send("to-renderer", arg);
  });
});
