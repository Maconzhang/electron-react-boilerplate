import URI from 'urijs';
import {
  app,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
  BrowserView,
} from 'electron';
import moment from 'moment';

const remove = require('lodash/remove');

const messageAche = new Map();

type callBack = (data: any) => void;

// let view: null | BrowserView = null;

export function initSocketService() {
  console.log('initSocketService');
  const server = require('http').createServer();
  const io = require('socket.io')(server, {
    cors: {
      origin: '*', // from the screenshot you provided
      methods: ['GET', 'POST'],
    },
  });

  io.on(
    'connection',
    (client: { on: (arg0: string, arg1: callBack) => void }) => {
      console.log('client', client);

      client.on('event', (data: any) => {
        console.log('event', data);
      });
      client.on('disconnect', () => {
        console.log('disconnect');
      });

      client.on('client-message', async (e) => {
        console.log('client-message', e, client);

        const log = `[${moment().format('yyyy-MM-DD HH:MM:ss')} ] -- 开始打印(${
          e.mode
        }) -- ${e.url} `;
        sendMessageAsync({ e, messageAche, log });

        const { message, url, mode, printOption = {} } = e;
        const urlObj = new URI(url);
        const { labelId } = URI.parseQuery(urlObj.query());
        messageAche.set(labelId, message);

        // 预览的话直接打开一个
        if (mode === 'preview') {
          shell.openExternal(url).then(() => {
            const log = `[${moment().format(
              'yyyy-MM-DD HH:MM:ss'
            )} ] -- 预览完成(${e.mode}) -- ${e.url} `;
            sendMessageAsync({ e, messageAche, log });
          });
        } else {
          // 每个 BrowserView 有独立渲染进程
          // const  view = new BrowserView({
          //   webPreferences: {
          //     nodeIntegration: false,
          //   },
          // });
          // view.setBounds({ x: 10, y: 10, width: 300, height: 300 });
          // await view.webContents.loadURL(url);
          // await view.webContents.executeJavaScript("window._clientCallBack(" +  JSON.stringify(e) + ")");
          // view.webContents.print({ printBackground: true, silent: true, color: false, ...printOption }, (success, failureReason) => {
          //   // 打印如何回调到前端, 通过对应的socketId发送通知
          //   io.sockets.sockets.get(client?.id)?.emit('printCallBack', success, failureReason);
          //   messageAche.set(labelId, { ...message, status: 'complete' });

          //   const log =`[${moment().format('yyyy-MM-DD HH:MM:ss')} ] -- 打印完成(${e.mode}) -- ${e.url} `;
          //   sendMessageAsync({ e, messageAche, log });
          //   (view.webContents as any).destroy();
          // });

          printPageSingle({ e, io, client });
        }
      });

      client.on('getPageMessage', (e: any) => {
        const url = new URI(e.url);
        const { labelId } = URI.parseQuery(url.query());
        io.sockets.sockets
          .get(client?.id)
          ?.emit('toPageMessage', {
            labelId,
            message: messageAche.get(labelId),
          });
        // io.sockets.sockets.get(client?.id)?.emit("printCallBack", { labelId, message: messageAche.get(labelId) });
        // io.emit("toPageMessage", { labelId, message: messageAche.get(labelId) });
      });

      io.emit('to-client', 'hello client');

      io.emit('to-client-by-broad', 'hello client');
      console.log('client');
    }
  );
  server.listen(50000);
}

let messagelist: {}[] = [];
let messageTimer: NodeJS.Timeout | string | number | undefined;
// 向主进程发送消息
function sendMessageAsync(message: {}) {
  messagelist.push(message);

  if (messageTimer) {
    clearTimeout(messageTimer);
    messageTimer = undefined;
  }

  messageTimer = setTimeout(() => {
    clearTimeout(messageTimer);
    messageTimer = undefined;
    app._mainWindow.webContents.send('onSocketMessages', messagelist);
    messagelist = [];
  }, 1000);
}

// 多进程打印（打印顺序不好控制）
let browserViewAche: BrowserView[] = [];
let waitMessage: {}[] = [];
async function printPage({ e, io, client }) {
  const { message, url, mode, printOption = {} } = e;
  if (browserViewAche.length > 0) {
    return waitMessage.push({ e, client });
  }
  const urlObj = new URI(url);
  const { labelId } = URI.parseQuery(urlObj.query());
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
    },
  });
  browserViewAche.push(view);

  view.setBounds({ x: 10, y: 10, width: 300, height: 300 });
  await view.webContents.loadURL(url);
  await view.webContents.executeJavaScript(
    'window._clientCallBack(' + JSON.stringify(e) + ')'
  );
  view.webContents.print(
    { printBackground: true, silent: true, color: false, ...printOption },
    (success, failureReason) => {
      // 打印如何回调到前端, 通过对应的socketId发送通知
      // console.log('io', io, io.sockets.get('qA9CJMQGVNuHMpwpAAAc'));
      io.sockets.sockets
        .get(client?.id)
        ?.emit('printCallBack', success, failureReason);
      messageAche.set(labelId, { ...message, status: 'complete' });

      const log = `[${moment().format('yyyy-MM-DD HH:MM:ss')} ] -- 打印完成(${
        e.mode
      }) -- ${e.url} `;
      sendMessageAsync({ e, messageAche, log });
      (view.webContents as any).destroy();

      remove(browserViewAche, (n: BrowserView) => n == view);

      const newMessage = waitMessage.shift();
      newMessage && printPage({ ...newMessage, io });

      console.log('browserViewAche', browserViewAche);
      console.log('waitMessage', waitMessage);
    }
  );
}

// 用单进程打印(减少app运行内存), 减少进程创建和destroy开销
let signleView: BrowserView;
let waitMessageList: {}[] = [];
let signleViewDoing = false;
async function printPageSingle({ e, io, client }) {
  console.log('signleViewDoing', signleViewDoing);

  try {
    const { message, url, mode, printOption = {} } = e;
    const urlObj = new URI(url);
    const { labelId } = URI.parseQuery(urlObj.query());
    if (!signleView) {
      signleView = new BrowserView({
        webPreferences: {
          nodeIntegration: false,
        },
      });
      (signleView as BrowserView).setBounds({
        x: 10,
        y: 10,
        width: 300,
        height: 300,
      });
    }

    if (signleViewDoing) {
      waitMessageList.push({ e, client });
      return;
    }
    signleViewDoing = true;

    await signleView.webContents.loadURL(url);
    await signleView.webContents.executeJavaScript(
      'window._clientCallBack(' + JSON.stringify(e) + ')'
    );

    signleView.webContents.print(
      { printBackground: true, silent: true, color: false, ...printOption },
      (success, failureReason) => {
        // 打印如何回调到前端, 通过对应的socketId发送通知
        io.sockets.sockets
          .get(client?.id)
          ?.emit('printCallBack', success, failureReason);
        messageAche.set(labelId, { ...message, status: 'complete' });

        const log = `[${moment().format('yyyy-MM-DD HH:MM:ss')} ] -- 打印完成(${
          e.mode
        }) -- ${e.url} `;
        sendMessageAsync({ e, messageAche, log });

        signleViewDoing = false;

        const newMessage = waitMessageList.shift();
        newMessage && printPageSingle({ ...newMessage, io });
      }
    );
  } catch (error) {
    sendMessageAsync({ log: `打印异常： ${JSON.stringify(error)}` });
  }
}
