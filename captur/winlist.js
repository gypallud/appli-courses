'use strict';
// Liste des fenêtres visibles (ordre d'affichage, de la plus en avant à la plus en arrière),
// en pixels physiques de l'écran. Sert à surligner une fenêtre au survol pendant la capture.
// Si l'accès à Windows échoue, on renvoie une liste vide : la capture marche quand même.

let list = () => [];

if (process.platform === 'win32') {
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    const dwmapi = koffi.load('dwmapi.dll');

    const HANDLE = koffi.pointer('CAPTUR_HANDLE', koffi.opaque());
    koffi.alias('CAPTUR_HWND', HANDLE);
    koffi.struct('CAPTUR_RECT', { left: 'int32_t', top: 'int32_t', right: 'int32_t', bottom: 'int32_t' });
    koffi.proto('int __stdcall CapturEnumProc(CAPTUR_HWND hwnd, intptr_t lParam)');

    const EnumWindows = user32.func('int __stdcall EnumWindows(CapturEnumProc *cb, intptr_t lParam)');
    const IsWindowVisible = user32.func('int __stdcall IsWindowVisible(CAPTUR_HWND hwnd)');
    const IsIconic = user32.func('int __stdcall IsIconic(CAPTUR_HWND hwnd)');
    const GetWindowLongW = user32.func('int32_t __stdcall GetWindowLongW(CAPTUR_HWND hwnd, int index)');
    const DwmRect = dwmapi.func('int32_t __stdcall DwmGetWindowAttribute(CAPTUR_HWND hwnd, uint32_t attr, _Out_ CAPTUR_RECT *value, uint32_t size)');
    const DwmInt = dwmapi.func('DwmGetWindowAttribute', 'int32_t', ['CAPTUR_HWND', 'uint32_t', koffi.out(koffi.pointer('int32_t')), 'uint32_t']);

    const GWL_EXSTYLE = -20;
    const WS_EX_TRANSPARENT = 0x20;
    const WS_EX_TOOLWINDOW = 0x80;
    const WS_EX_NOACTIVATE = 0x08000000;
    const DWMWA_EXTENDED_FRAME_BOUNDS = 9;
    const DWMWA_CLOAKED = 14;

    list = () => {
      const out = [];
      EnumWindows((hwnd) => {
        try {
          if (!IsWindowVisible(hwnd) || IsIconic(hwnd)) return 1;
          const ex = GetWindowLongW(hwnd, GWL_EXSTYLE);
          if (ex & (WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE)) return 1;
          const cloaked = [0];
          if (DwmInt(hwnd, DWMWA_CLOAKED, cloaked, 4) === 0 && cloaked[0]) return 1;
          const r = {};
          if (DwmRect(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, r, 16) !== 0) return 1;
          const w = r.right - r.left;
          const h = r.bottom - r.top;
          if (w >= 40 && h >= 40) out.push({ x: r.left, y: r.top, w, h });
        } catch (_) { /* fenêtre ignorée */ }
        return 1;
      }, 0);
      return out;
    };
  } catch (err) {
    console.warn('[captur] liste des fenêtres indisponible :', err.message);
  }
}

module.exports = { list: () => { try { return list(); } catch (_) { return []; } } };
