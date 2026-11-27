"use client";

import { useEffect, useRef } from "react";

/**
 * Latar 3D ringan untuk hero (three.js): ikosahedron kawat + titik, berputar pelan.
 * - Hanya dipasang di desktop, saat idle, dan tanpa "kurangi gerakan" / "hemat data" (lihat HeroSceneLoader)
 * - Impor bernama agar tree-shaking membuang sisa three.js
 * - Berhenti menggambar saat di luar layar atau tab disembunyikan; semua resource di-dispose saat unmount
 */
export default function HeroScene() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let raf = 0;
    let visible = true;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const T = await import("three");
      if (disposed) return;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const color = dark ? 0xb8c4d6 : 0x1b4670;

      const renderer = new T.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
      el.appendChild(renderer.domElement);

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(45, 1, 0.1, 50);
      camera.position.z = 6;

      const geo = new T.IcosahedronGeometry(2, 1);
      const edges = new T.EdgesGeometry(geo);
      const lineMat = new T.LineBasicMaterial({ color, transparent: true, opacity: 0.55 });
      const mesh = new T.LineSegments(edges, lineMat);
      const pts = new T.Points(geo, new T.PointsMaterial({ color: 0x06b6d4, size: 0.07 }));
      const group = new T.Group();
      group.add(mesh, pts);
      scene.add(group);

      const resize = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
      io.observe(el);

      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!visible || document.hidden) return;
        group.rotation.y += 0.0035;
        group.rotation.x += 0.0015;
        renderer.render(scene, camera);
      };
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        geo.dispose(); edges.dispose(); lineMat.dispose(); (pts.material as { dispose: () => void }).dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => { /* WebGL tidak tersedia: hero tetap tampil tanpa latar 3D */ });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={host} className="h-full w-full" aria-hidden />;
}
