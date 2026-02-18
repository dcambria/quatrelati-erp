'use client';

/**
 * ===========================================
 * Quatrelati - Bureau Footer Component
 * Footer com logo do Bureau de Tecnologia
 * v1.5.1 - logo 34px + hover animation CLI-CK sound (login page)
 * ===========================================
 */

import { useRef, useEffect } from 'react';

function useBureauAnimation(linkRef) {
  useEffect(() => {
    let audioCtx = null;
    let isAnimating = false;
    const link = linkRef.current;
    if (!link) return;

    const arrow = link.querySelector('.bureau-arrow');
    const underscore = link.querySelector('.bureau-underscore');

    function ensureAudioCtx() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }

    function unlockAudio() { ensureAudioCtx(); }
    document.addEventListener('click', unlockAudio, { once: true });

    function playTone(type, freq, dur, vol) {
      const ctx = ensureAudioCtx();
      if (ctx.state !== 'running') return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(); osc.stop(ctx.currentTime + dur);
    }

    function animate() {
      if (isAnimating) return;
      isAnimating = true;
      underscore.classList.add('animate-blink');
      setTimeout(() => {
        underscore.classList.remove('animate-blink');
        arrow.classList.add('animate-click');
        setTimeout(() => playTone('square', 2000, 0.015, 0.120), 120);
        setTimeout(() => playTone('square', 1200, 0.02, 0.096), 210);
        setTimeout(() => { arrow.classList.remove('animate-click'); isAnimating = false; }, 300);
      }, 600);
    }

    link.addEventListener('mouseenter', animate);

    return () => {
      link.removeEventListener('mouseenter', animate);
      document.removeEventListener('click', unlockAudio);
      if (audioCtx) audioCtx.close();
    };
  }, [linkRef]);
}

export default function BureauFooter({ className = '', variant = 'dark', compact = false }) {
  const isDark = variant === 'dark';
  const linkRef = useRef(null);
  useBureauAnimation(linkRef);

  if (compact) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <a
          ref={linkRef}
          href="https://bureau-it.com"
          target="_blank"
          rel="noopener noreferrer"
          className="footer__developed-by-link flex items-center gap-2 transition-all duration-300 group"
        >
          <span className="text-[10px] text-gray-400">Desenvolvido por</span>
          <svg
            className="bureau-logo h-[34px] w-auto"
            viewBox="0 0 123.81 123.81"
            xmlns="http://www.w3.org/2000/svg"
          >
            <polygon
              className="bureau-arrow fill-gray-400 group-hover:fill-quatrelati-gold-500 transition-colors duration-300"
              points="16.59 44.68 16.59 87.58 28.69 71.86 45.68 71.86 16.59 44.68"
            />
            <path
              className="fill-gray-400 group-hover:fill-quatrelati-gold-500 transition-colors duration-300"
              d="M67.86,72.32q-5,0-7.55-2.33c-1.72-1.55-2.58-3.95-2.58-7.22v-9.2H54.59V45h3.14V38.29H68.89V45h6.17v8.57H68.89v6.72a2.73,2.73,0,0,0,.69,2.12,2.93,2.93,0,0,0,2,.61A8.43,8.43,0,0,0,75,62.23V70.8a12.7,12.7,0,0,1-3.18,1.1A17.78,17.78,0,0,1,67.86,72.32Z"
            />
            <rect
              className="fill-gray-400 group-hover:fill-quatrelati-gold-500 transition-colors duration-300"
              x="41.13" y="36.23" width="11.16" height="6.86"
            />
            <polygon
              className="fill-gray-400 group-hover:fill-quatrelati-gold-500 transition-colors duration-300"
              points="41.13 45 41.13 64.03 49.44 71.73 52.29 71.73 52.29 45 41.13 45"
            />
            <path
              className="bureau-underscore fill-gray-400 group-hover:fill-quatrelati-gold-500 transition-colors duration-300"
              d="M78.18,73.48h29v5.58h-29Z"
            />
          </svg>
        </a>
        <p className="text-[9px] text-gray-400 mt-1">v1.5.0</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <a
        ref={linkRef}
        href="https://bureau-it.com"
        target="_blank"
        rel="noopener noreferrer"
        className={`footer__developed-by-link flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 group ${
          isDark
            ? 'bg-gray-900/90 hover:bg-gray-800 backdrop-blur-sm'
            : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
        }`}
      >
        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-white/80'}`}>
          Desenvolvido por
        </span>
        <svg
          className="bureau-logo h-[34px] w-auto"
          viewBox="0 0 123.81 123.81"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            className={`bureau-arrow transition-colors duration-300 ${
              isDark
                ? 'fill-gray-100 group-hover:fill-quatrelati-gold-400'
                : 'fill-white group-hover:fill-quatrelati-gold-400'
            }`}
            points="16.59 44.68 16.59 87.58 28.69 71.86 45.68 71.86 16.59 44.68"
          />
          <path
            className={`transition-colors duration-300 ${
              isDark
                ? 'fill-gray-100 group-hover:fill-quatrelati-gold-400'
                : 'fill-white group-hover:fill-quatrelati-gold-400'
            }`}
            d="M67.86,72.32q-5,0-7.55-2.33c-1.72-1.55-2.58-3.95-2.58-7.22v-9.2H54.59V45h3.14V38.29H68.89V45h6.17v8.57H68.89v6.72a2.73,2.73,0,0,0,.69,2.12,2.93,2.93,0,0,0,2,.61A8.43,8.43,0,0,0,75,62.23V70.8a12.7,12.7,0,0,1-3.18,1.1A17.78,17.78,0,0,1,67.86,72.32Z"
          />
          <rect
            className={`transition-colors duration-300 ${
              isDark
                ? 'fill-gray-100 group-hover:fill-quatrelati-gold-400'
                : 'fill-white group-hover:fill-quatrelati-gold-400'
            }`}
            x="41.13" y="36.23" width="11.16" height="6.86"
          />
          <polygon
            className={`transition-colors duration-300 ${
              isDark
                ? 'fill-gray-100 group-hover:fill-quatrelati-gold-400'
                : 'fill-white group-hover:fill-quatrelati-gold-400'
            }`}
            points="41.13 45 41.13 64.03 49.44 71.73 52.29 71.73 52.29 45 41.13 45"
          />
          <path
            className={`bureau-underscore transition-colors duration-300 ${
              isDark
                ? 'fill-gray-100 group-hover:fill-quatrelati-gold-400'
                : 'fill-white group-hover:fill-quatrelati-gold-400'
            }`}
            d="M78.18,73.48h29v5.58h-29Z"
          />
        </svg>
        <span className={`text-sm font-semibold ${
          isDark
            ? 'text-white group-hover:text-quatrelati-gold-400'
            : 'text-white group-hover:text-quatrelati-gold-400'
        } transition-colors duration-300`}>
          Bureau de Tecnologia
        </span>
      </a>
      <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-white/50'}`}>v1.5.0</p>
    </div>
  );
}
