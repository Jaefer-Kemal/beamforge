/**
 * Zero-dependency lightweight HTML5 Canvas Confetti emitter
 * Celebrates 100% verification pass with crisp glassmorphic particles.
 */

export function triggerCelebrationConfetti(): void {
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

  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];
  const particleCount = 70;

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

  const particles: Particle[] = [];
  const startX = window.innerWidth * 0.5;
  const startY = window.innerHeight * 0.45;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5);
    const speed = 4 + Math.random() * 8;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 1,
    });
  }

  let animationFrameId: number;
  const startTime = performance.now();
  const duration = 2500; // 2.5 seconds

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
      p.vy += 0.22; // gravity
      p.vx *= 0.98; // air drag
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.opacity * globalAlpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    animationFrameId = requestAnimationFrame(render);
  };

  animationFrameId = requestAnimationFrame(render);
}

