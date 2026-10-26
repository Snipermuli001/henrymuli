/* Project Henry AMOLED floating accents.
   Lightweight, pointer-reactive, and disabled for reduced-motion preferences. */
(() => {
  const motion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if (motion?.matches || document.querySelector(".ph-float-field")) return;
  const style = document.createElement("style");
  style.textContent = `
    body { isolation: isolate; }
    .ph-float-field { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; contain: strict; }
    .ph-float-orb { position: absolute; display: block; width: clamp(120px, 23vw, 340px); aspect-ratio: 1; border-radius: 50%; filter: blur(48px); opacity: .12; transform: translate3d(var(--ph-x, 0px), var(--ph-y, 0px), 0); will-change: transform; animation: phOrbDrift 19s ease-in-out infinite alternate; }
    .ph-float-orb:nth-child(1) { left: -7%; top: 12%; background: #52e8ff; }
    .ph-float-orb:nth-child(2) { right: -8%; top: 34%; background: #a56cff; animation-duration: 24s; animation-delay: -7s; }
    .ph-float-orb:nth-child(3) { left: 36%; bottom: -16%; background: #5b7cff; animation-duration: 28s; animation-delay: -11s; }
    .ph-float-orb:nth-child(4) { right: 22%; top: -18%; width: clamp(90px, 14vw, 210px); background: #52e8ff; opacity: .07; animation-duration: 31s; }
    @keyframes phOrbDrift { from { margin-top: -12px; } to { margin-top: 20px; } }
    @media (prefers-reduced-motion: reduce) { .ph-float-field, .ph-float-orb { display: none !important; animation: none !important; } }
  `;
  document.head.append(style);
  const field = document.createElement("div");
  field.className = "ph-float-field";
  field.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 4; i++) { const orb = document.createElement("span"); orb.className = "ph-float-orb"; field.append(orb); }
  document.body.prepend(field);
  let scheduled = false, lastX = 0, lastY = 0;
  document.addEventListener("pointermove", event => {
    lastX = event.clientX; lastY = event.clientY;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      field.style.setProperty("--ph-x", Math.round((lastX / Math.max(1, innerWidth) - .5) * 24) + "px");
      field.style.setProperty("--ph-y", Math.round((lastY / Math.max(1, innerHeight) - .5) * 18) + "px");
      scheduled = false;
    });
  }, { passive: true });
  document.addEventListener("pointerleave", () => { field.style.setProperty("--ph-x", "0px"); field.style.setProperty("--ph-y", "0px"); }, { passive: true });
})();