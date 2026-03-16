import type { MovePoint } from "./types";

/* ── Heatmap Canvas Renderer ── */
export function drawHeatmap(
  canvas: HTMLCanvasElement, points: { x: number; y: number }[],
  iframeRect: { width: number; height: number }, referenceVpW: number,
  _docH: number, scrollOffset: number, radius: number = 30, intensity: number = 0.6,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = iframeRect.width; canvas.height = iframeRect.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!points.length) return;

  const scale = iframeRect.width / referenceVpW;
  points.forEach((p) => {
    const x = p.x * scale;
    const y = (p.y - scrollOffset) * scale;
    if (y < -radius || y > canvas.height + radius) return;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * scale);
    gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity})`);
    gradient.addColorStop(0.4, `rgba(255, 165, 0, ${intensity * 0.6})`);
    gradient.addColorStop(0.7, `rgba(255, 255, 0, ${intensity * 0.3})`);
    gradient.addColorStop(1, "rgba(0, 0, 255, 0)");
    ctx.beginPath(); ctx.fillStyle = gradient;
    ctx.arc(x, y, radius * scale, 0, Math.PI * 2); ctx.fill();
  });

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    const ratio = alpha / 255;
    if (ratio > 0.7) { data[i] = 255; data[i + 1] = Math.round(255 * (1 - ratio) * 3); data[i + 2] = 0; }
    else if (ratio > 0.4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 0; }
    else if (ratio > 0.2) { data[i] = 0; data[i + 1] = 255; data[i + 2] = Math.round(255 * (1 - ratio * 2)); }
    else { data[i] = 0; data[i + 1] = Math.round(100 + 155 * ratio * 5); data[i + 2] = 255; }
    data[i + 3] = Math.min(alpha * 1.5, 200);
  }
  ctx.putImageData(imageData, 0, 0);
}

/* ── Draw Move Trails ── */
export function drawMoveTrails(
  canvas: HTMLCanvasElement, sessions: { points: MovePoint[]; color: string }[],
  iframeRect: { width: number; height: number }, referenceVpW: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = iframeRect.width; canvas.height = iframeRect.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scale = iframeRect.width / referenceVpW;

  sessions.forEach(({ points, color }) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.5;

    const sx = points[0].x * scale, sy = points[0].y * scale;
    ctx.moveTo(sx, sy);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * scale, points[i].y * scale);
    }
    ctx.stroke();

    points.forEach((p, i) => {
      const px = p.x * scale, py = p.y * scale;
      ctx.globalAlpha = 0.3 + (i / points.length) * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  });

  const allPts = sessions.flatMap(s => s.points);
  if (allPts.length > 10) {
    ctx.globalAlpha = 0.3;
    allPts.forEach((p) => {
      const x = p.x * scale, y = p.y * scale;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20 * scale);
      gradient.addColorStop(0, "rgba(255, 100, 0, 0.15)");
      gradient.addColorStop(1, "rgba(255, 100, 0, 0)");
      ctx.beginPath(); ctx.fillStyle = gradient;
      ctx.arc(x, y, 20 * scale, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}
