export type LandscapeViewport = {
  rotated: boolean;
  scale: number;
  width: number;
  height: number;
  physicalWidth: number;
};

let appliedViewport: LandscapeViewport | null = null;
export function setAppliedLandscapeViewport(viewport: LandscapeViewport | null) { appliedViewport = viewport; }
export function getAppliedLandscapeViewport() { return appliedViewport; }

export function getLandscapeViewport(width: number, height: number, coarsePointer: boolean): LandscapeViewport | null {
  if (width <= 0 || height <= 0 || (width > 1024 && !(coarsePointer && Math.min(width, height) <= 1024))) return null;
  const rotated = height > width;
  const availableWidth = rotated ? height : width;
  const logicalWidth = Math.max(1280, availableWidth);
  const scale = availableWidth / logicalWidth;
  return { rotated, scale, width: logicalWidth, height: (rotated ? width : height) / scale, physicalWidth: width };
}

// Portal menus use CSS coordinates inside the transformed body, not screen coordinates.
export function getCanvasRect(rect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'>, viewport: LandscapeViewport | null) {
  if (!viewport) return { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width };
  const { scale, rotated, physicalWidth } = viewport;
  const top = rotated ? (physicalWidth - rect.right) / scale : rect.top / scale;
  return { left: (rotated ? rect.top : rect.left) / scale, top, bottom: top + (rotated ? rect.width : rect.height) / scale, width: (rotated ? rect.height : rect.width) / scale };
}

export function readLandscapeViewport(): LandscapeViewport | null {
  if (typeof window === 'undefined') return null;
  return getLandscapeViewport(document.documentElement.clientWidth, window.innerHeight, window.matchMedia('(pointer: coarse)').matches);
}
