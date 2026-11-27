/* Atlas of Nations — canvas charts drawn by hand, no libraries.
   Two chart types: a horizontal bar chart for ranking one indicator
   across countries, and a line chart for one indicator over years. */

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(280, Math.floor(rect.width));
  const height = Number(canvas.dataset.height || 320);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function niceMax(value) {
  if (value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const scaled = value / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * power;
}

function formatAxis(value, unit) {
  if (unit === 'people') {
    if (value >= 1e9) return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (value >= 1e6) return Math.round(value / 1e6) + 'M';
    if (value >= 1e3) return Math.round(value / 1e3) + 'k';
    return String(Math.round(value));
  }
  if (unit === 'US$ (current)') return '$' + Math.round(value).toLocaleString('en-US');
  return String(Math.round(value * 10) / 10);
}

/* Horizontal bar chart: rows = [{ label, value, color, note }].
   Rows with null values are shown greyed with "no data". */
export function drawBarChart(canvas, rows, unit) {
  const { ctx, width, height } = setupCanvas(canvas);
  const left = 118;
  const right = 14;
  const top = 8;
  const rowHeight = Math.max(26, (height - top - 26) / rows.length);
  const chartWidth = width - left - right;
  const max = niceMax(Math.max(0, ...rows.map(r => r.value ?? 0)));
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  // gridlines
  ctx.strokeStyle = '#e3e8ef';
  ctx.fillStyle = '#6b7686';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 4; i++) {
    const x = left + (chartWidth * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, height - 26);
    ctx.stroke();
    ctx.fillText(formatAxis((max * i) / 4, unit), x, height - 12);
  }

  rows.forEach((row, i) => {
    const y = top + i * rowHeight + rowHeight / 2;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1d2b3a';
    ctx.fillText(row.label, left - 10, y);
    if (row.value == null) {
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText('no data', left + 4, y);
      return;
    }
    const barWidth = Math.max(2, (row.value / max) * chartWidth);
    ctx.fillStyle = row.color || '#2563eb';
    ctx.beginPath();
    ctx.roundRect(left, y - 9, barWidth, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#1d2b3a';
    ctx.textAlign = 'left';
    ctx.fillText(formatAxis(row.value, unit), left + barWidth + 6, y);
  });
}

/* Line chart: series = [{ label, color, points: [{year, value}] }].
   Null values break the line (a gap, not a zero). */
export function drawLineChart(canvas, series, unit, years) {
  const { ctx, width, height } = setupCanvas(canvas);
  const left = 52;
  const right = 16;
  const top = 16;
  const bottom = height - 30;
  const chartWidth = width - left - right;
  const chartHeight = bottom - top;
  const allValues = series.flatMap(s => s.points.map(p => p.value).filter(v => v != null));
  let min = Math.min(...allValues);
  let max = Math.max(...allValues);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.08;
  min -= pad; max += pad;
  const xFor = year => left + ((year - years[0]) / (years[years.length - 1] - years[0])) * chartWidth;
  const yFor = value => bottom - ((value - min) / (max - min)) * chartHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  // gridlines + y labels
  ctx.strokeStyle = '#e3e8ef';
  ctx.fillStyle = '#6b7686';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = min + ((max - min) * i) / 4;
    const y = yFor(v);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - right, y);
    ctx.stroke();
    ctx.fillText(formatAxis(v, unit), left - 8, y);
  }
  // x labels
  ctx.textAlign = 'center';
  years.forEach(year => {
    if (year % 2 === 0) ctx.fillText(String(year), xFor(year), height - 12);
  });

  series.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let penDown = false;
    s.points.forEach(p => {
      if (p.value == null) { penDown = false; return; }
      const x = xFor(p.year);
      const y = yFor(p.value);
      if (!penDown) { ctx.moveTo(x, y); penDown = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    s.points.forEach(p => {
      if (p.value == null) return;
      ctx.beginPath();
      ctx.arc(xFor(p.year), yFor(p.value), 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // legend
  ctx.textAlign = 'left';
  let lx = left;
  series.forEach(s => {
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, 2, 12, 12);
    ctx.fillStyle = '#1d2b3a';
    const w = ctx.measureText(s.label).width;
    ctx.fillText(s.label, lx + 17, 8);
    lx += 17 + w + 22;
  });
}
