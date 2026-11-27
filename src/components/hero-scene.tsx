"use client";

import { useEffect, useRef } from "react";

/**
 * Globe 3D di belakang logo hero (three.js, dimuat malas oleh HeroSceneLoader): bola kawat berputar pelan dan
 * titik-titik. Berhenti menggambar saat keluar layar atau tab tersembunyi.
 */
export default function HeroScene() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stop = () => {};
    let dead = false;

    (async () => {
      const T = await import("three");
      if (dead) return;
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      el.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(40, 1, 0.1, 50);
      camera.position.z = 5.2;

      const cyan = new T.Color(0x06b6d4);
      const globe = new T.Group();
      scene.add(globe);

      const sphere = new T.IcosahedronGeometry(1.5, 3);
      globe.add(new T.LineSegments(new T.WireframeGeometry(sphere), new T.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.35 })));
      globe.add(new T.Points(sphere, new T.PointsMaterial({ color: 0x67e8f9, size: 0.035, transparent: true, opacity: 0.9 })));

      const resize = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      let raf = 0;
      let visible = true;
      const tick = () => {
        globe.rotation.y += 0.0035;
        globe.rotation.x = Math.sin(performance.now() / 4000) * 0.12;
        renderer.render(scene, camera);
        raf = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
      };
      const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
      io.observe(el);
      document.addEventListener("visibilitychange", start);
      start();

      stop = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", start);
        sphere.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => {}); // WebGL tidak tersedia: hero tetap tampil tanpa globe

    return () => { dead = true; stop(); };
  }, []);

  return <div ref={host} className="h-full w-full" />;
}
