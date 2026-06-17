import {app, nativeImage} from 'electron';
import nodePath from 'node:path';
import {browserViewIPCBind} from './IPC/BrowserViewIPC/BrowserViewIPC.bind';
import {electronIPCBind} from './IPC/ElectronIPC/ElectronIPC.bind';
import {mainWindowIPCBind} from './IPC/MainWindowIPC/MainWindowIPC.bind';
import {nodeIPCBind} from './IPC/NodeIPC/NodeIPC.bind';
import {SQLiteIPCBind} from './IPC/SQLiteIPC/SQLiteIPC.bind';
import {streamIPCBind} from './IPC/StreamIPC/StreamIPC.bind';
import {userPrefIPCBind} from './IPC/UserPrefIPC/UserPrefIPC.bind';
import {BrowserViewService} from './Main/Service/BrowserViewService';
import {IssueService} from './Main/Service/IssueService';
import {MainWindowService} from './Main/Service/MainWindowService';
import {StreamService} from './Main/Service/StreamService';
import {MainWindow} from './Main/Window/MainWindow/MainWindow';

// --- Phase A: メモリ最適化のための Chromium / V8 チューニング ---
// これらは app.whenReady() より前（プロセス起動直後）に設定する必要がある。
//
// ディスク/メディアキャッシュの上限を明示する。既定では使用量に応じて青天井で
// 肥大化し、メモリ常駐分も増えるため、控えめな上限に固定する。
app.commandLine.appendSwitch('disk-cache-size', `${50 * 1024 * 1024}`);   // 50MB
app.commandLine.appendSwitch('media-cache-size', `${10 * 1024 * 1024}`);  // 10MB
//
// 手動GCを許可する（globalThis.gc が使えるようになる）。
// renderer 側でウィンドウ非表示時にヒープを解放するために使用する。
// ※ ヒープ上限を絞りたい場合は下記のように max-old-space-size を併記できるが、
//    絞りすぎると大量Issue読み込み時に OOM クラッシュするため既定では無効。
//    例: '--expose-gc --max-old-space-size=768'
app.commandLine.appendSwitch('js-flags', '--expose-gc');
//
// 使っていない Chromium のバックグラウンドサービスを無効化し、常駐スレッド/
// メモリを削減する。Jasper は独自翻訳・キャストを使わないため安全に無効化できる。
app.commandLine.appendSwitch(
  'disable-features',
  'Translate,MediaRouter,DialMediaRouteProvider,OptimizationHints',
);

async function index() {
  await app.whenReady();

  // 開発時のアイコンを設定
  // app.dock は macOS 専用。Linux/Windows では undefined のため、ガードしないと
  // ここで例外が発生し、以降の MainWindow.init() に到達せずウィンドウが開かない。
  if (process.env.JASPER === 'DEV') {
    const iconPath = nodePath.join(__dirname, 'Main/asset/image/jasper-dev.png');
    app.dock?.setIcon(nativeImage.createFromPath(iconPath));
  }

  // メインウィンドウを生成
  await MainWindow.init();
  const window = MainWindow.getWindow();

  // 各種サービスを初期化
  MainWindowService.initWindow(window);
  BrowserViewService.initWindow(window);
  IssueService.initWindow(window);
  StreamService.initWindow(window);

  // bind IPC
  mainWindowIPCBind(window);
  browserViewIPCBind();
  streamIPCBind();
  SQLiteIPCBind();
  userPrefIPCBind();
  electronIPCBind();
  nodeIPCBind();

  await MainWindow.initRenderer();
}

index();
