// アプリケーション作成用のモジュールを読み込み
const {app, BrowserWindow} = require('electron');

/**
 * if debug mode it is true
 */
const DEBUG_MODE = false;

// メインウィンドウ
let mainWindow;

let windowWidth = 620;
if (DEBUG_MODE == true) {
  windowWidth = windowWidth * 2;
}

function createWindow() {
    // メインウィンドウを作成します
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        width: windowWidth, height: 700,
    });

    // メインウィンドウに表示するURLを指定
    mainWindow.loadFile('html/index.html');

    if (DEBUG_MODE == true) {
        // デベロッパーツールの起動
        mainWindow.webContents.openDevTools();
    }

    // メインウィンドウが閉じられたときの処理
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

//  初期化が完了した時の処理
app.on('ready', createWindow);

// 全てのウィンドウが閉じたときの処理
app.on('window-all-closed', () => {
    // macOSのとき以外はアプリケーションを終了
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
// アプリケーションがアクティブになった時の処理(Macだと、Dockがクリックされた時）
app.on('activate', () => {
    // メインウィンドウが消えている場合は再度メインウィンドウを作成する
    if (mainWindow === null) {
        createWindow();
    }
});