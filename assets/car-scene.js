// TrustRoute — interactive 3D car ("take it for a spin")
// A stylized low-poly car built entirely from primitives, in brand colors.
// Drag to rotate (mouse, touch, and pen all unified via the Pointer Events API).
// No external 3D model or CDN dependency — Three.js is self-hosted at assets/vendor/.

import * as THREE from './vendor/three.module.min.js';

export function initCarScene(container) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- renderer ----
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return false; // caller shows a static fallback
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none'; // let us handle drag/swipe ourselves
  renderer.domElement.setAttribute('aria-hidden', 'true');

  // ---- scene / camera ----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 2.1, 8.4);
  camera.lookAt(0, 0.35, 0);

  // ---- lighting ----
  scene.add(new THREE.AmbientLight(0xbfe3d8, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x2fb28e, 0.9);
  rim.position.set(-5, 3, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xd6338a, 0.25);
  fill.position.set(-2, -1, 4);
  scene.add(fill);

  // ---- brand palette ----
  const TEAL = 0x159172;
  const TEAL_LIGHT = 0x2fb28e;
  const NAVY = 0x0a1a2c;
  const NAVY_GLASS = 0x16314f;
  const CHROME = 0xe9f2ef;
  const AMBER = 0xf2c98a;

  const carGroup = new THREE.Group();

  // Body (lower chassis)
  const bodyMat = new THREE.MeshStandardMaterial({ color: TEAL, roughness: 0.35, metalness: 0.25 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.62, 1.7, 2, 1, 1), bodyMat);
  body.position.y = 0.42;
  carGroup.add(body);

  // Nose taper (front bumper wedge) and tail wedge for a friendlier silhouette
  const wedgeMat = bodyMat;
  const noseGeo = new THREE.BoxGeometry(0.5, 0.5, 1.56);
  const nose = new THREE.Mesh(noseGeo, wedgeMat);
  nose.position.set(1.95, 0.34, 0);
  nose.rotation.z = Math.PI / 10;
  carGroup.add(nose);
  const tail = new THREE.Mesh(noseGeo, wedgeMat);
  tail.position.set(-1.95, 0.34, 0);
  tail.rotation.z = -Math.PI / 10;
  carGroup.add(tail);

  // Cabin / greenhouse
  const cabinMat = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.5, metalness: 0.15 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 1.48), cabinMat);
  cabin.position.set(-0.15, 0.98, 0);
  carGroup.add(cabin);

  // Cabin roof taper (slightly trapezoidal look via a scaled top box)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 1.34), cabinMat);
  roof.position.set(-0.15, 1.33, 0);
  carGroup.add(roof);

  // Windows (glass strips on the cabin sides, slightly inset & emissive-cool tint)
  const glassMat = new THREE.MeshStandardMaterial({ color: NAVY_GLASS, roughness: 0.15, metalness: 0.6 });
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.36), glassMat);
  windshield.position.set(0.76, 1.0, 0);
  carGroup.add(windshield);
  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 1.36), glassMat);
  rearWindow.position.set(-1.02, 0.98, 0);
  carGroup.add(rearWindow);

  // Wheels
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.75, metalness: 0.2 });
  const hubMat = new THREE.MeshStandardMaterial({ color: CHROME, roughness: 0.3, metalness: 0.7 });
  const wheelPositions = [
    [1.2, 0.06, 0.95], [1.2, 0.06, -0.95],
    [-1.2, 0.06, 0.95], [-1.2, 0.06, -0.95],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 20), wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, y, z);
    carGroup.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.36, 14), hubMat);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(x, y, z);
    carGroup.add(hub);
  });

  // Headlights + taillights (emissive)
  const headMat = new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 0.9, roughness: 0.4 });
  [0.72, -0.72].forEach((z) => {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), headMat);
    h.position.set(2.18, 0.4, z);
    carGroup.add(h);
  });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xd6338a, emissive: 0xd6338a, emissiveIntensity: 0.7, roughness: 0.4 });
  [0.68, -0.68].forEach((z) => {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), tailMat);
    t.position.set(-2.16, 0.4, z);
    carGroup.add(t);
  });

  // Brand accent: a small teal ring on the roof, echoing the checkmark-badge in the logo
  const badgeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.035, 10, 24),
    new THREE.MeshStandardMaterial({ color: TEAL_LIGHT, emissive: TEAL_LIGHT, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.4 })
  );
  badgeRing.rotation.x = Math.PI / 2;
  badgeRing.position.set(-0.15, 1.41, 0);
  carGroup.add(badgeRing);

  carGroup.rotation.y = -0.5;
  scene.add(carGroup);

  // Soft contact "shadow" — a simple dark translucent ellipse, no shadow-map cost
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.15, 32), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.01;
  shadow.scale.set(1, 0.62, 1);
  scene.add(shadow);

  // ---- resize handling ----
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ---- drag-to-rotate (pointer events unify mouse, touch, and pen) ----
  let isDragging = false;
  let lastX = 0;
  let velocity = 0;
  let idleTimer = null;
  const el = renderer.domElement;

  function onPointerDown(e) {
    isDragging = true;
    lastX = e.clientX;
    velocity = 0;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
    clearTimeout(idleTimer);
  }
  function onPointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    const delta = dx * 0.012;
    carGroup.rotation.y += delta;
    velocity = delta;
  }
  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    el.style.cursor = 'grab';
    try { el.releasePointerCapture(e.pointerId); } catch (err) {}
    idleTimer = setTimeout(() => { velocity = velocity || 0; }, 30);
  }

  el.style.cursor = 'grab';
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  el.addEventListener('pointerleave', () => { if (!isDragging) return; });

  // ---- render loop: inertia + gentle idle auto-rotate ----
  let raf = null;
  let idleSpin = reduceMotion ? 0 : 0.0032;
  let stopped = false;

  function tick() {
    if (stopped) return;
    if (!isDragging) {
      if (Math.abs(velocity) > 0.0002) {
        carGroup.rotation.y += velocity;
        velocity *= reduceMotion ? 0 : 0.945; // no momentum coast for reduced-motion users
      } else if (!reduceMotion) {
        carGroup.rotation.y += idleSpin;
      }
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  // pause the render loop when off-screen to save battery/CPU
  const visObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (!raf) { stopped = false; tick(); }
      } else {
        stopped = true;
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      }
    });
  }, { threshold: 0.05 });
  visObserver.observe(container);

  return {
    destroy() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      visObserver.disconnect();
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  };
}
