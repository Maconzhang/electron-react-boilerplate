import URI from 'urijs';
import {
  app,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
  BrowserView,
} from 'electron';

const messageAche = new Map();

type callBack = (data: any) => void;

export function initSocketService (mainWindow: BrowserWindow) {

  console.log('initSocketService');
  const server = require('http').createServer();
  const io = require('socket.io')(server, {
    cors: {
      origin: "*", // from the screenshot you provided
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (client: { on: (arg0: string, arg1: callBack) => void; }) => {
    console.log('client', client);

    client.on('event', (data: any) => {
      console.log('event', data);
    });
    client.on('disconnect', () => {
      console.log('disconnect');
    });

    client.on('client-message', (e) => {
      console.log('client-message', e, client);

      const { message, url, mode, printOption = {} } = e;
      // 预览的话直接打开一个
      if (mode === 'preview') {
        const urlObj = new URI(url);
        const { labelId } = URI.parseQuery(urlObj.query());
        messageAche.set(labelId, message);
        shell.openExternal(url);
      } else {
        let view = new BrowserView({
          webPreferences: {
            nodeIntegration: false,
          },
        });
        view.setBounds({ x: 10, y: 10, width: 300, height: 300 });
        view.webContents.loadURL(url);
        view.webContents.executeJavaScript("window._clientCallBack(" +  JSON.stringify(e) + ")").then(v => {
          view.webContents.print({ silent: true, color: false, ...printOption }, (success, failureReason) => {
            // 打印如何回调到前端
            // console.log('io', io, io.sockets.get('qA9CJMQGVNuHMpwpAAAc'));
            io.sockets.sockets.get(client?.id).emit('printCallBack', success, failureReason);
          })
        })
      }
    });

    client.on('getPageMessage', (e: any) => {
      const url = new URI(e.url);
      const { labelId } = URI.parseQuery(url.query());
      io.sockets.sockets.get(client?.id)?.emit("toPageMessage", { labelId, message: messageAche.get(labelId) });
      // io.sockets.sockets.get(client?.id)?.emit("printCallBack", { labelId, message: messageAche.get(labelId) });
      // io.emit("toPageMessage", { labelId, message: messageAche.get(labelId) });
    });


    io.emit("to-client", 'hello client');

    io.emit("to-client-by-broad", 'hello client');
    console.log('client');
  });
  server.listen(3000);
}
