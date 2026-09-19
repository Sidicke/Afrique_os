"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { heroFrames } from "@/constants/theme";
import { useTranslation } from "@/lib/i18n";

/* ─── FRAME PRELOADER ─── */
function useFramePreloader(frames: typeof heroFrames) {
  const [ready, setReady] = useState(false);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    let cancelled = false;
    const imgs: HTMLImageElement[] = [];

    // Priority: preload first 5 frames eagerly
    const priorityCount = Math.min(5, frames.length);
    let loadedCount = 0;

    frames.forEach((f, i) => {
      const img = new window.Image();
      img.decoding = "async";
      if (i < priorityCount) {
        img.fetchPriority = "high";
      }
      img.src = f.src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= priorityCount && !cancelled) {
          setReady(true);
        }
      };
      imgs.push(img);
    });

    imagesRef.current = imgs;
    return () => { cancelled = true; };
  }, [frames]);

  return { ready, images: imagesRef };
}

/* ─── CANVAS RENDERER ─── */
function useCanvasRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  images: React.RefObject<HTMLImageElement[]>,
  frameIndex: number,
  isVisible: boolean,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Use devicePixelRatio for crisp Retina rendering
    const dpr = Math.max(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => { ro.disconnect(); };
  }, [canvasRef]);

  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    let raf = 0;
    const draw = () => {
      const img = images.current?.[frameIndex];
      if (!img || !img.complete || img.naturalWidth === 0) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      // Cover fit calculations
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.drawImage(img, dx, dy, dw, dh);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); };
  }, [canvasRef, images, frameIndex, isVisible]);
}



/* ─── MAIN HERO ─── */
export default function Hero() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { ready, images } = useFramePreloader(heroFrames);

  // Intersection observer — pause off-screen
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Film playback
  useEffect(() => {
    if (!ready || !isVisible || prefersReducedMotion) return;

    const fps = 10;
    const interval = 1000 / fps;
    let lastTime = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const delta = now - lastTime;
      if (delta >= interval) {
        lastTime = now - (delta % interval);
        setFrameIndex((prev) => {
          const next = prev + 1;
          // Loop back after reaching end, with a 2s pause
          if (next >= heroFrames.length) {
            timerRef.current = setTimeout(() => {
              setFrameIndex(0);
            }, 2000);
            return heroFrames.length - 1;
          }
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ready, isVisible, prefersReducedMotion]);

  // Canvas drawing
  useCanvasRenderer(canvasRef, images, frameIndex, isVisible && ready);

  // Text animation variants
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.9,
        delay,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="hero-viewport relative flex items-end overflow-hidden bg-midnight-950"
      aria-label={t.hero.srDescription}
    >
      {/* ── Layer 1: Film Canvas ── */}
      <div className="absolute inset-0" aria-hidden="true">
        {prefersReducedMotion ? (
          /* Reduced-motion: static first frame with elegant treatment */
          <Image
            src={heroFrames[0].src}
            alt=""
            fill
            sizes="100vw"
            priority
            quality={80}
            className="object-cover"
          />
        ) : (
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            aria-hidden="true"
          />
        )}
      </div>

      {/* ── Layer 2: Cinematic overlays (Lighter for vivid image clarity) ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Bottom gradient — ensures text contrast without darkening the film */}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-midnight-950/50 via-[50%] to-transparent" />
        {/* Left gradient — subtle text backdrop */}
        <div className="absolute inset-0 bg-gradient-to-r from-midnight-950/75 via-midnight-950/25 via-[45%] to-transparent" />
      </div>

      {/* ── Layer 3: Film grain ── */}
      <div
        className="film-grain pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        aria-hidden="true"
      />

      {/* ── Layer 4: Gold atmospheric halo ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/3 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(196,182,151,0.06) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Layer 5: Content ── */}
      <div className="hero-text relative z-10 mx-auto w-full max-w-screen-2xl px-5 pb-12 pt-28 sm:px-8 sm:pb-16 lg:pb-20">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="hero-badge mb-5"
          >
            <span className="inline-flex items-center gap-2.5 rounded-full border border-gold-400/25 bg-gold-400/8 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-gold-300 shadow-sm shadow-gold-400/5 backdrop-blur-sm">
              <span
                className="relative flex h-1.5 w-1.5 rounded-full bg-gold-300"
                aria-hidden="true"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-300 opacity-60" />
              </span>
              {t.hero.badgeAfrique}
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.12}
            className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ivory-50 sm:text-5xl md:text-6xl lg:text-[4.2rem] xl:text-7xl"
          >
            {t.hero.title}
            <br />
            <span className="text-gold-gradient">{t.hero.titleGold}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.24}
            className="hero-subline mt-5 max-w-xl text-base leading-relaxed text-ivory-50/65 sm:text-lg sm:leading-relaxed lg:text-xl"
          >
            {t.hero.subtitleFull}{" "}
            <span className="font-medium text-ivory-50/85">
              {t.hero.subtitleStrong}
            </span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.36}
            className="hero-cta mt-8 flex flex-wrap items-center gap-3.5 sm:gap-4"
          >
            <Link
              href="/inscription"
              id="hero-cta-primary"
              className="group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-gold-400 px-7 py-3.5 font-display text-[15px] font-semibold text-midnight-950 shadow-lg shadow-gold-400/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-300 hover:shadow-xl hover:shadow-gold-400/30 active:scale-[0.98] sm:px-8"
            >
              {t.hero.ctaCreate}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#comment-ca-marche"
              id="hero-cta-secondary"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-ivory-50/20 bg-ivory-50/5 px-6 py-3.5 font-display text-[15px] font-semibold text-ivory-50/90 backdrop-blur-sm transition-all duration-300 hover:border-gold-400/40 hover:bg-gold-400/10 hover:text-gold-200 active:scale-[0.98] sm:px-7"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
              </svg>
              {t.hero.ctaHowItWorks}
            </a>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.48}
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-ivory-50/45 sm:mt-10"
          >
            {[
              {
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.2 0-2.4-.25-3.5-.7L3 21l1.7-6A8.5 8.5 0 1 1 21 11.5z" />
                  </svg>
                ),
                text: t.hero.trust_whatsapp,
              },
              {
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <path d="M1 10h22" />
                  </svg>
                ),
                text: t.hero.trust_mobilemoney,
              },
              {
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                ),
                text: t.hero.trust_free,
              },
            ].map((item) => (
              <span
                key={item.text}
                className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em]"
              >
                {item.icon}
                {item.text}
              </span>
            ))}
          </motion.div>
        </div>


      </div>

      {/* ── Accessible description ── */}
      <div className="sr-only" role="img" aria-label={t.hero.srDescription}>
        {t.hero.srDescription}
      </div>
    </section>
  );
}