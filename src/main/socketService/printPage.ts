/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';
import { PageMessage } from './messageProto';
import { BrowserWindow, BrowserView } from 'electron';

interface IprintPageByMessageParams {
  pageMessage: PageMessage;
  mainWindow: BrowserWindow;
}
export function printPageByMessage(params: IprintPageByMessageParams) {
  const { mainWindow, pageMessage } = params;
  return new Promise<void>(async (resolve, reject) => {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
      },
    });
    mainWindow.setBrowserView(view);
    view.setBounds({ x: 10, y: 50, width: 400, height: 400 });

    view.webContents.on('did-finish-load', (e) => {
      console.log('dom-ready', e);
    });

    view.webContents.on('did-frame-finish-load', (e) => {
      console.log('dom-ready', e);
    });

    view.webContents.on('dom-ready', (e) => {
      console.log('dom-ready', e);
    });

    view.webContents.on('paint', (e) => {
      console.log('dom-ready', e);
    });



    view.webContents.executeJavaScript('window.printInfo = 1345');
    view.webContents.loadURL(pageMessage.url);


    // view.webContents.on('did-finish-load', e => {
    // console.log('did-finish-load',  e);
    // setTimeout(() => {
    //   view.webContents.print({ silent: true, color: false, pageSize: 'A3' }, async (success, failRes) => {
    //     console.log(`${pageMessage.url} 打印完成`);
    //     if (success) {
    //       resolve();
    //     } else {
    //       reject(failRes);
    //     }
    //   });
    // }, 1000);

    // });
  });
}
