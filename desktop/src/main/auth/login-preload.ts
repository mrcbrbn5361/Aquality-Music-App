/**
 * Aquality Music - Stealth Login Preload Script
 * 
 * Google ve YouTube Music oturum açma akışında Electron / Chromium
 * gömülü tarayıcı kısıtlamalarını (BotGuard / 'Bu tarayıcı veya uygulama güvenli olmayabilir')
 * aşmak ve tarayıcının standart güvenli bir ortam olarak tanınmasını sağlamak için
 * navigator ve window.chrome ortamını gerçek Google Chrome ile uyumlu hale getirir.
 */

declare const window: any;
declare const navigator: any;

try {
  // 1. navigator.webdriver bayrağını ve prototipini temizle
  const navProto = (typeof navigator !== 'undefined' ? Object.getPrototypeOf(navigator) : null) || (typeof navigator !== 'undefined' ? navigator : null);
  try {
    delete (navProto as any).webdriver;
  } catch {}
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true
  });
} catch {}

try {
  // 2. Google Accounts kontrolü için window.chrome nesnesini tanımla
  const win = window as any;
  if (!win.chrome) {
    win.chrome = {};
  }
  win.chrome.app = win.chrome.app || {
    isInstalled: false,
    InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
    RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' }
  };
  win.chrome.csi = win.chrome.csi || function () {};
  win.chrome.loadTimes = win.chrome.loadTimes || function () {
    const now = Date.now() / 1000;
    return {
      commitLoadTime: now,
      connectionInfo: 'http/1.1',
      finishDocumentLoadTime: now,
      finishLoadTime: now,
      firstPaintAfterLoadTime: 0,
      firstPaintTime: now,
      navigationType: 'Other',
      npnNegotiatedProtocol: 'unknown',
      requestTime: now,
      startLoadTime: now,
      wasAlternateProtocolAvailable: false,
      wasFetchedViaSpdy: false,
      wasNpnNegotiated: false
    };
  };
} catch {}
