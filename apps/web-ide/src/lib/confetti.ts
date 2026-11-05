/**
 * Zero-dependency lightweight HTML5 Canvas Confetti emitter
 * Celebrates verification pass with crisp Apple-grade glassmorphic particles.
 * Supports Tier 1 (micro flow-state spark) and Tier 2 (major milestone dual cannon).
 */

export type ConfettiTier = 'micro' | 'milestone';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
}

export function triggerCelebrationConfetti(tier: ConfettiTier = 'micro'): void {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const particles: Particle[] = [];
  const duration = tier === 'milestone' ? 3400 : 2200;

  if (tier === 'micro') {
    // Symmetrical dual-cannon celebratory burst for standard lesson pass
    const microColors = ['#10B981', '#34D399', '#059669', '#38BDF8', '#F59E0B', '#8B5CF6'];
    const countPerSide = 38;

    // Left emitter (bottom-left, shooting up-right towards center)
    for (let i = 0; i < countPerSide; i++) {
      const angle = -Math.PI * 0.32 + (Math.random() - 0.5) * 0.7;
      const speed = 5 + Math.random() * 7;
      particles.push({
        x: window.innerWidth * 0.18,
        y: window.innerHeight * 0.88,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: microColors[Math.floor(Math.random() * microColors.length)],
        size: 4 + Math.random() * 5,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        opacity: 0.95,
      });
    }

    // Right emitter (bottom-right, shooting up-left towards center)
    for (let i = 0; i < countPerSide; i++) {
      const angle = -Math.PI * 0.68 + (Math.random() - 0.5) * 0.7;
      const speed = 5 + Math.random() * 7;
      particles.push({
        x: window.innerWidth * 0.82,
        y: window.innerHeight * 0.88,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: microColors[Math.floor(Math.random() * microColors.length)],
        size: 4 + Math.random() * 5,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        opacity: 0.95,
      });
    }
  } else {
    // Grand triple-cannon burst for Problem Sets, Incident Triages & Capstone
    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#F43F5E'];
    const countPerCannon = 70;

    // Left Cannon
    for (let i = 0; i < countPerCannon; i++) {
      const angle = -Math.PI * 0.25 + (Math.random() - 0.5) * 0.8;
      const speed = 8 + Math.random() * 10;
      particles.push({
        x: window.innerWidth * 0.08,
        y: window.innerHeight * 0.88,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      });
    }

    // Right Cannon
    for (let i = 0; i < countPerCannon; i++) {
      const angle = -Math.PI * 0.75 + (Math.random() - 0.5) * 0.8;
      const speed = 8 + Math.random() * 10;
      particles.push({
        x: window.innerWidth * 0.92,
        y: window.innerHeight * 0.88,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      });
    }

    // Center Vertical Fountain
    for (let i = 0; i < 30; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.5;
      const speed = 9 + Math.random() * 9;
      particles.push({
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.92,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 5,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      });
    }
  }

  let animationFrameId: number;
  const startTime = performance.now();

  const render = (time: number) => {
    const elapsed = time - startTime;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const progress = elapsed / duration;
    const globalAlpha = 1 - Math.pow(progress, 2);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += tier === 'milestone' ? 0.24 : 0.18; // gravity
      p.vx *= 0.98; // air drag
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.opacity * globalAlpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(render);
  };

  animationFrameId = requestAnimationFrame(render);
}
