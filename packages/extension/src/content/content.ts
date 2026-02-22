// Story 2.4'te doldurulacak: Fetch/XHR intercept & HAR response replay
// KRİTİK: world: "MAIN" — sayfanın JS context'inde çalışır
// Bu sayede window.fetch ve XMLHttpRequest monkey-patching yapılabilir

console.log('[HAR Mock] Content script loaded (MAIN world)');
