// see https://www.electronjs.org/docs/latest/tutorial/context-isolation
const { contextBridge, ipcRenderer } = require("electron");

// We need to wait until the renderer window is ready to receive the message before
// sending the port. We create this promise in the preload so it's guaranteed
// to register the onload listener before the load event is fired.
const windowLoaded = new Promise((resolve) => {
  window.onload = resolve;
});

ipcRenderer.on("port", async (event) => {
  await windowLoaded;
  // We use regular window.postMessage to transfer the port from the isolated
  // world to the renderer world.
  window.postMessage("port", "*", event.ports);
});

contextBridge.exposeInMainWorld("api", {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  addListener: (channel, fn) => ipcRenderer.addListener(channel, fn),
  rmListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
