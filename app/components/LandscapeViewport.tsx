'use client';

import { useLayoutEffect } from 'react';
import { readLandscapeViewport, setAppliedLandscapeViewport } from '@/app/lib/landscapeViewport';

export default function LandscapeViewport() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const coarse = window.matchMedia('(pointer: coarse)');
    let previousWidth = 0;
    const update = () => {
      // Opening the on-screen keyboard must not rotate or rescale the form again.
      const focused = document.activeElement;
      if (document.documentElement.clientWidth === previousWidth && focused instanceof HTMLElement
        && (focused.matches('input, textarea') || focused.isContentEditable)) return;
      previousWidth = document.documentElement.clientWidth;
      const viewport = readLandscapeViewport();
      setAppliedLandscapeViewport(viewport);
      if (!viewport) {
        delete root.dataset.landscapeViewport;
        return;
      }
      root.dataset.landscapeViewport = 'true';
      root.style.setProperty('--p3-viewport-width', `${viewport.width}px`);
      root.style.setProperty('--p3-viewport-height', `${viewport.height}px`);
      root.style.setProperty('--p3-viewport-transform', viewport.rotated
        ? `matrix(0, ${viewport.scale}, ${-viewport.scale}, 0, ${viewport.physicalWidth}, 0)`
        : `scale(${viewport.scale})`);
    };
    update();
    window.addEventListener('resize', update);
    coarse.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      coarse.removeEventListener('change', update);
      delete root.dataset.landscapeViewport;
      setAppliedLandscapeViewport(null);
      for (const name of ['width', 'height', 'transform']) root.style.removeProperty(`--p3-viewport-${name}`);
    };
  }, []);
  return null;
}
