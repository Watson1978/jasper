import {BrowserView, BrowserWindow, clipboard, Menu, MenuItem, Rectangle, session, shell} from 'electron';
import fs from 'node:fs';
import nodePath from 'node:path';
import os from 'os';
import {BrowserViewIPCChannels} from '../../IPC/BrowserViewIPC/BrowserViewIPC.channel';
import {ShellUtil} from '../../Renderer/Library/Util/ShellUtil';
import {browserViewMc} from './BrowserViewTranslateService';

type Target = {
  window: BrowserWindow | null;
  browserView: BrowserView | null;
  rect: Rectangle | null;
  zoomFactor: number;
  hideCount: number;
};

class _BrowserViewService {
  private main: Target = {
    window: null,
    browserView: null,
    rect: null,
    zoomFactor: 1,
    hideCount: 0,
  };

  private window: BrowserWindow;
  private active: Target = this.main;

  initWindow(window: BrowserWindow) {
    this.window = window;
    this.setupMainWindow(window);

    // Phase B: かつて存在した IssueWindow（別ウィンドウでIssueを開く機能）は、
    // GitHub Project のサイドパネル表示への移行に伴い廃止済み。
    // 起動時に常駐していた「隠しBrowserWindow + BrowserView + issue-window.html
    // レンダラ」を生成しないことで、未使用プロセス分のメモリを削減する。
    [this.main.browserView.webContents].forEach(webContents => {
      webContents.addListener('console-message', (_ev, level, message) => BrowserViewService.eventConsoleMessage(level, message));
      webContents.addListener('dom-ready', () => BrowserViewService.eventDOMReady());
      webContents.addListener('did-start-navigation', (_ev, url, inPage) => BrowserViewService.eventDidStartNavigation(url, inPage));
      webContents.addListener('did-navigate', () => BrowserViewService.eventDidNavigate());
      webContents.addListener('did-navigate-in-page', () => BrowserViewService.eventDidNavigateInPage());
      webContents.addListener('before-input-event', (_ev, input) => BrowserViewService.eventBeforeInput(input));
      webContents.addListener('found-in-page', (_ev, result) => BrowserViewService.eventFoundInPage(result));
      webContents.session.on('will-download', () => BrowserViewService.eventWillDownload());
    });
  }

  private setupMainWindow(mainWindow: BrowserWindow) {
    this.main.window = mainWindow;
    this.setupWindow(this.main);

    // GitHub Projectでissueを開くとサイドパネルで開くようになったので、IssueWindowを開く必要はなくなった
    // // github projectでissueをクリックしたときにissue windowで開くようにするため。
    // this.main.browserView.webContents.setWindowOpenHandler((details) => {
    //   this.openIssueWindow(details.url);
    //   return {action: 'deny'};
    // });
  }

  private setupWindow(target: Target) {
    target.browserView = new BrowserView({
      webPreferences: {
        // github.com 表示用の BrowserView。Issue一覧を見ている間は非表示になる。
        // ポーリングは main window 側の renderer が担うため、ここは非表示時に
        // スロットリングして CPU/メモリを節約しても通知取得に影響しない。
        backgroundThrottling: true,
        nodeIntegration: false,
        spellcheck: false,
      }
    });
    target.window?.setBrowserView(target.browserView);
    target.browserView.setBackgroundColor('#fff');

    // zoom factorはURLを読み込んでからではないと取得できないため、dom-readyをハンドルしている
    target.window?.webContents.once('dom-ready', () => {
      this.setZoomFactor(target.window.webContents.getZoomFactor());
    });

    this.setupContextMenu(target);
  }

  private setupContextMenu(target: Target) {
    const webContents = target.browserView.webContents;
    webContents.addListener('dom-ready', () => {
      const jsFilePath = nodePath.join(__dirname, 'Main/asset/js/context-menu.js');
      const js = fs.readFileSync(jsFilePath).toString();
      target.browserView.webContents.executeJavaScript(js);
    });

    webContents.addListener('console-message', (_ev, _level, message) => {
      if (message.indexOf('CONTEXT_MENU:') !== 0) return;

      const data = JSON.parse(message.split('CONTEXT_MENU:')[1]);

      const menu = new Menu();
      if (data.url) {
        menu.append(new MenuItem({label: browserViewMc().url.open, click: () => ShellUtil.openExternal(data.url)}));
        menu.append(new MenuItem({label: browserViewMc().url.copy, click: () => clipboard.writeText(data.url)}));
        menu.append(new MenuItem({type: 'separator'}));
      }

      if (data.text) {
        if (os.platform() === 'darwin') {
          menu.append(new MenuItem({label: browserViewMc().search, click: () => shell.openExternal(`dict://${data.text}`)}));
          menu.append(new MenuItem({type: 'separator'}));
        }

        menu.append(new MenuItem({label: browserViewMc().text.copy, click: () => clipboard.writeText(data.text)}));
        menu.append(new MenuItem({label: browserViewMc().text.cut, click: () => webContents.cut()}));
      }

      menu.append(new MenuItem({label: browserViewMc().text.paste, click: () => webContents.paste()}));
      menu.popup({window: this.active.window});
    });
  }

  openURLWithExternalBrowser() {
    this.window.webContents.send(BrowserViewIPCChannels.openURLWithExternalBrowser);
  }

  focusURLInput() {
    this.window.webContents.send(BrowserViewIPCChannels.focusURLInput);
  }

  startSearch() {
    this.window.webContents.send(BrowserViewIPCChannels.startSearch);
  }

  eventConsoleMessage(level: number, message: string) {
    // TODO: Avoid "Uncaught Exception" error
    if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) return;

    this.window.webContents.send(BrowserViewIPCChannels.eventConsoleMessage, level, message);
  }

  eventDOMReady() {
    // TODO: Avoid "Uncaught Exception" error
    if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) return;

    this.window.webContents.send(BrowserViewIPCChannels.eventDOMReady);
  }

  eventDidStartNavigation(url: string, inPage: boolean) {
    // 何故かウィンドウ破棄後にイベントが発火してくることがあるので、明示的にチェックする。原因は不明。
    if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) return;

    this.window.webContents.send(BrowserViewIPCChannels.eventDidStartNavigation, url, inPage);
  }

  eventDidNavigate() {
    // 何故かウィンドウ破棄後にイベントが発火してくることがあるので、明示的にチェックする。原因は不明。
    if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) return;

    this.window.webContents.send(BrowserViewIPCChannels.eventDidNavigate);
  }

  eventDidNavigateInPage() {
    // TODO: Avoid "Uncaught Exception" error
    if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) return;

    this.window.webContents.send(BrowserViewIPCChannels.eventDidNavigateInPage);
  }

  eventBeforeInput(input) {
    // TODO: Avoid "Uncaught Exception" error
    if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) return;

    this.window.webContents.send(BrowserViewIPCChannels.eventBeforeInput, input);
  }

  eventFoundInPage(result: Electron.Result) {
    // TODO: Avoid "Uncaught Exception" error
    if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) return;

    this.window.webContents.send(BrowserViewIPCChannels.eventFoundInPage, result);
  }

  eventWillDownload() {
    // TODO: Avoid "Uncaught Exception" error
    if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) return;

    this.window.webContents.send(BrowserViewIPCChannels.eventWillDownload);
  }

  loadURL(url: string) {
    session.defaultSession.clearCache();

    // ロードが呼び出されたら強制的に非表示を無効にする
    this.active.hideCount = 0;
    this.hide(false);
    if (this.active.rect != null) this.active.browserView.setBounds(this.active.rect);

    // 同じURLをロードする場合、ブラウザがスクロール位置を記憶してしまう。
    // そうすると、ハイライトコメント位置への自動スクロールがおかしくなるときがある。
    // なので、クエリパラメータをつけて別のURLとして認識させる。
    // `getURL()`でそのクエリパラメータを削除している
    const currentUrl = this.getURL();
    if (url === currentUrl) {
      this.active.browserView.webContents.loadURL(url + `?t=${Date.now()}`);
    } else {
      this.active.browserView.webContents.loadURL(url);
    }
  }

  getURL() {
    return this.active.browserView.webContents.getURL().replace(/[?]t=\d+/, '');
  }

  reload() {
    this.active.browserView.webContents.reload();
  }

  canGoBack() {
    return this.active.browserView.webContents.navigationHistory.canGoBack();
  }

  canGoForward() {
    return this.active.browserView.webContents.navigationHistory.canGoForward();
  }

  goBack() {
    return this.active.browserView.webContents.navigationHistory.goBack();
  }

  goForward() {
    return this.active.browserView.webContents.navigationHistory.goForward();
  }

  focus() {
    return this.active.browserView.webContents.focus();
  }

  blur() {
    return this.active.window.webContents.focus();
  }

  executeJavaScript(js: string) {
    return this.active.browserView.webContents.executeJavaScript(js);
  }

  insertCSS(css: string) {
    this.active.browserView.webContents.insertCSS(css);
  }

  findInPage(keyword: string, options?: Electron.FindInPageOptions) {
    if (keyword) return this.active.browserView.webContents.findInPage(keyword, options);
  }

  stopFindInPage(action) {
    return this.active.browserView.webContents.stopFindInPage(action);
  }

  scroll(amount: number, behavior: 'smooth' | 'auto') {
    this.active.browserView.webContents.executeJavaScript(`window.scrollBy({top: ${amount}, behavior: '${behavior}'})`);
  }

  getWebContents() {
    return this.active.browserView.webContents;
  }

  setZoomFactor(factor) {
    this.active.browserView.webContents.setZoomFactor(factor);
    this.active.zoomFactor = factor;
  }

  setRect(x, y, width, height) {
    const zX = Math.round(x * this.active.zoomFactor);
    const zY = Math.round(y * this.active.zoomFactor);
    const zWidth = Math.round(width * this.active.zoomFactor);
    const zHeight = Math.round(height * this.active.zoomFactor);

    this.active.browserView.setBounds({x: zX, y: zY, width: zWidth, height: zHeight});
    this.active.rect = this.active.browserView.getBounds();
  }

  setBackgroundColor(color) {
    return this.active.browserView.setBackgroundColor(color);
  }

  hide(enable) {
    if (enable) {
      this.active.hideCount++;
      if (this.active.window.getBrowserViews().find(v => v === this.active.browserView)) {
        this.active.window.removeBrowserView(this.active.browserView);
      }
    } else {
      this.active.hideCount = Math.max(0, this.active.hideCount - 1);
      if (this.active.hideCount === 0 && !this.active.window.getBrowserViews().find(v => v === this.active.browserView)) {
        this.active.window.setBrowserView(this.active.browserView);
      }
    }
  }

}

export const BrowserViewService = new _BrowserViewService();
