# Electron Ipc Tests

![Demo](demo.gif)

Tested on two different machines, [MessagePort](https://www.electronjs.org/docs/latest/api/message-port-main) latency is about twice as fast as [IpcRenderer](https://www.electronjs.org/docs/latest/api/ipc-renderer).

## Todo

Test for throughput MB/s (representative of RPC tile requests I think?)
- send request to main, have main shoot as many requests (with large binary data) as it can in 30 seconds then send a DONE message
- make sure you get all messages (count mb) then on DONE count it up! Mb /s

Test for latency DONE just have payload sizes and types (JSON and binary) representative of the real world (use example I found)

Then importantly add some frontend gpu animation and see how it effect tests (it should)
show throughput as function of gpu animation