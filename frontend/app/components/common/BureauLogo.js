'use client';

/**
 * ===========================================
 * Quatrelati - Bureau IT Footer Disclosure
 * Hover Animation + CLI-CK Sound
 * Timbre: digital | Pitch: +12
 * ===========================================
 */

import { useRef, useEffect } from 'react';

export default function BureauLogo({ className = '' }) {
  const linkRef = useRef(null);

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

    function unlockAudio() {
      ensureAudioCtx();
    }

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
  }, []);

  return (
    <a
      ref={linkRef}
      href="https://bureau-it.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`footer__developed-by-link flex items-center justify-center gap-2 py-4 transition-colors duration-300 ${className}`}
      title="Bureau de Tecnologia"
    >
      <span style={{ fontSize: '0.75rem', transform: 'translateY(-8px)' }}>
        Desenvolvido por
      </span>
      <svg
        className="bureau-logo h-[34px] w-auto"
        style={{ transform: 'translateY(-8px)' }}
        viewBox="0 0 123.81 123.81"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Seta */}
        <polygon
          className="bureau-arrow"
          points="16.59 44.68 16.59 87.58 28.69 71.86 45.68 71.86 16.59 44.68"
        />

        {/* Letra t */}
        <path
          d="M67.86,72.32q-5,0-7.55-2.33c-1.72-1.55-2.58-3.95-2.58-7.22v-9.2H54.59V45h3.14V38.29H68.89V45h6.17v8.57H68.89v6.72a2.73,2.73,0,0,0,.69,2.12,2.93,2.93,0,0,0,2,.61A8.43,8.43,0,0,0,75,62.23V70.8a12.7,12.7,0,0,1-3.18,1.1A17.78,17.78,0,0,1,67.86,72.32Z"
        />

        {/* Ponto do i */}
        <rect x="41.13" y="36.23" width="11.16" height="6.86" />

        {/* Corpo do i */}
        <polygon points="41.13 45 41.13 64.03 49.44 71.73 52.29 71.73 52.29 45 41.13 45" />

        {/* Underline _ */}
        <path
          className="bureau-underscore"
          d="M78.18,73.48h29v5.58h-29Z"
        />
      </svg>
    </a>
  );
}

/**
 * Componente para uso em relatórios/PDFs
 */
export function BureauReportFooter({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <span className="text-xs text-gray-500 dark:text-gray-400">Desenvolvido por</span>
      <svg
        className="h-5 w-auto"
        viewBox="0 0 123.81 123.81"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="none" width="123.81" height="123.81" />
        <polygon fill="#374151" points="16.59 44.68 16.59 87.58 28.69 71.86 45.68 71.86 16.59 44.68" />
        <path fill="#D4A017" d="M67.86,72.32q-5,0-7.55-2.33c-1.72-1.55-2.58-3.95-2.58-7.22v-9.2H54.59V45h3.14V38.29H68.89V45h6.17v8.57H68.89v6.72a2.73,2.73,0,0,0,.69,2.12,2.93,2.93,0,0,0,2,.61A8.43,8.43,0,0,0,75,62.23V70.8a12.7,12.7,0,0,1-3.18,1.1A17.78,17.78,0,0,1,67.86,72.32Z" />
        <rect fill="#D4A017" x="41.13" y="36.23" width="11.16" height="6.86" />
        <polygon fill="#D4A017" points="41.13 45 41.13 64.03 49.44 71.73 52.29 71.73 52.29 45 41.13 45" />
        <path fill="#D4A017" d="M78.18,73.48h29v5.58h-29Z" />
      </svg>
    </div>
  );
}
