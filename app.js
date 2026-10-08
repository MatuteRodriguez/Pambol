// ==============================================================
// PAMBOL LIGA MX - LÓGICA DE EXPERIENCIA NATIVA (HÁPTICOS Y GESTOS)
// ==============================================================

// Respuesta háptica (micro-vibraciones de celular)
function hapticFeedback(pattern = [15]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

// Desactivar zoom accidental por doble toque en pantallas táctiles
let lastTouchTimePambolGlobal = 0;
document.addEventListener('touchend', function (e) {
  const now = Date.now();
  if (now - lastTouchTimePambolGlobal <= 300) {
    e.preventDefault();
  }
  lastTouchTimePambolGlobal = now;
}, { passive: false });

// Prevenir zoom con dos dedos en la interfaz principal
document.addEventListener('touchmove', function (e) {
  if (e.touches && e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

// Registro del Service Worker para funcionamiento como PWA Offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PAMBOL PWA ServiceWorker activo:', reg.scope))
      .catch(err => console.log('ServiceWorker offline cache listo'));
  });
}
