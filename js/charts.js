/* =========================================================
   Gráficos SVG leves (sem bibliotecas externas)
   Tooltips via atributo data-tip (tratado em core.js)
   ========================================================= */
const Charts = (() => {
  const esc = s => String(s).replace(/"/g, '&quot;');
  const niceMax = v => {
    if (v <= 0) return 10;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return m * p;
  };
  const fmt = v => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  function axes(W, H, pad, yMax, ticks, unit) {
    let g = '';
    for (let i = 0; i <= ticks; i++) {
      const y = pad.t + (H - pad.t - pad.b) * (1 - i / ticks);
      const val = (yMax * i) / ticks;
      g += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" ${i === 0 ? 'style="stroke:#e2e8e5"' : ''}/>`;
      g += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${fmt(val)}${unit || ''}</text>`;
    }
    return g;
  }

  /* Linha / área com suporte a previsão (tracejado) e faixa de confiança */
  function line(opts) {
    const W = opts.width || 720, H = opts.height || 260;
    const pad = { t: 16, r: 16, b: 30, l: 44 };
    const n = opts.labels.length;
    const all = [];
    opts.series.forEach(s => s.values.forEach(v => v != null && all.push(v)));
    if (opts.band) opts.band.high.forEach(v => v != null && all.push(v));
    const yMax = opts.yMax || niceMax(Math.max(...all) * 1.08);
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const x = i => pad.l + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
    const y = v => pad.t + ih * (1 - v / yMax);
    let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
    svg += `<defs>${opts.series.map((s, k) => `<linearGradient id="lg${opts.id}${k}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${s.color}" stop-opacity=".22"/><stop offset="100%" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`).join('')}</defs>`;
    svg += axes(W, H, pad, yMax, 4, opts.unit);

    if (opts.split != null) {
      const sx = x(opts.split);
      svg += `<rect x="${sx}" y="${pad.t}" width="${W - pad.r - sx}" height="${ih}" fill="#8b5cf6" opacity=".045"/>`;
      svg += `<line x1="${sx}" x2="${sx}" y1="${pad.t}" y2="${pad.t + ih}" stroke="#8b5cf6" stroke-dasharray="4 4" stroke-width="1.5" opacity=".6"/>`;
      svg += `<text x="${sx + 6}" y="${pad.t + 12}" style="fill:#7c3aed;font-weight:700;font-size:10.5px">PREVISÃO DA IA →</text>`;
      svg += `<text x="${sx - 6}" y="${pad.t + 12}" text-anchor="end" style="fill:#94a39b;font-weight:600;font-size:10.5px">← HISTÓRICO</text>`;
    }
    if (opts.band) {
      const b = opts.band; let up = '', down = '';
      b.high.forEach((v, i) => { if (v != null) up += `${up ? 'L' : 'M'}${x(i)},${y(v)} `; });
      for (let i = b.low.length - 1; i >= 0; i--) if (b.low[i] != null) down += `L${x(i)},${y(b.low[i])} `;
      svg += `<path d="${up}${down}Z" fill="${b.color || '#8b5cf6'}" opacity=".12"/>`;
    }
    opts.series.forEach((s, k) => {
      let d = '', started = false, first = null, last = null;
      s.values.forEach((v, i) => {
        if (v == null) return;
        d += `${started ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
        if (!started) first = i;
        started = true; last = i;
      });
      if (s.area && started) svg += `<path d="${d}L${x(last)},${pad.t + ih} L${x(first)},${pad.t + ih} Z" fill="url(#lg${opts.id}${k})"/>`;
      svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.5}" stroke-linecap="round" stroke-linejoin="round" ${s.dashed ? 'stroke-dasharray="6 5"' : ''}/>`;
      if (s.dots !== false) s.values.forEach((v, i) => { if (v != null) svg += `<circle cx="${x(i)}" cy="${y(v)}" r="${s.dashed ? 3.5 : 3}" fill="#fff" stroke="${s.color}" stroke-width="2"/>`; });
    });
    const step = Math.ceil(n / (opts.maxLabels || 14));
    opts.labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" ${opts.highlight === i ? 'style="fill:#7c3aed;font-weight:700"' : ''}>${l}</text>`; });
    opts.labels.forEach((l, i) => {
      const rows = opts.series.map(s => s.values[i] != null ? `<span style="color:${s.color}">●</span> ${s.name}: <b style="display:inline">${fmt(s.values[i])}${opts.unit || ''}</b>` : '').filter(Boolean);
      if (opts.band && opts.band.low[i] != null) rows.push(`<span style="opacity:.7">Intervalo: ${fmt(opts.band.low[i])}–${fmt(opts.band.high[i])}</span>`);
      const tip = `<b>${opts.tipLabels ? opts.tipLabels[i] : l}</b>${rows.join('<br>')}`;
      const w = iw / Math.max(n - 1, 1);
      svg += `<rect x="${x(i) - w / 2}" y="${pad.t}" width="${w}" height="${ih}" fill="transparent" data-tip="${esc(tip)}"/>`;
    });
    return svg + '</svg>';
  }

  /* Barras agrupadas ou empilhadas */
  function bars(opts) {
    const W = opts.width || 720, H = opts.height || 260;
    const pad = { t: 16, r: 12, b: 30, l: 44 };
    const n = opts.labels.length, m = opts.series.length;
    const totals = opts.labels.map((_, i) => opts.stacked ? opts.series.reduce((a, s) => a + (s.values[i] || 0), 0) : Math.max(...opts.series.map(s => s.values[i] || 0)));
    const yMax = opts.yMax || niceMax(Math.max(...totals) * 1.1);
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const gw = iw / n, bw = opts.stacked ? Math.min(gw * 0.5, 44) : Math.min((gw * 0.7) / m, 26);
    const y = v => pad.t + ih * (1 - v / yMax);
    let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">` + axes(W, H, pad, yMax, 4, opts.unit);
    opts.labels.forEach((l, i) => {
      const cx = pad.l + gw * i + gw / 2;
      let acc = 0;
      const tipRows = [];
      opts.series.forEach((s, k) => {
        const v = s.values[i] || 0;
        tipRows.push(`<span style="color:${s.color}">●</span> ${s.name}: <b style="display:inline">${fmt(v)}${opts.unit || ''}</b>`);
        let bx, by, bh;
        if (opts.stacked) { bx = cx - bw / 2; by = y(acc + v); bh = y(acc) - y(acc + v); acc += v; }
        else { bx = cx - (bw * m) / 2 + bw * k + 1; by = y(v); bh = pad.t + ih - by; }
        const r = Math.min(5, bw / 2, bh);
        const top = opts.stacked ? k === m - 1 : true;
        if (bh > 0) svg += top
          ? `<path d="M${bx},${by + bh} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + bw - 2 - r} Q${bx + bw - 2},${by} ${bx + bw - 2},${by + r} V${by + bh} Z" fill="${s.color}" ${opts.highlight === i ? '' : `opacity="${opts.highlight != null ? .55 : 1}"`}/>`
          : `<rect x="${bx}" y="${by}" width="${bw - 2}" height="${bh}" fill="${s.color}" ${opts.highlight != null && opts.highlight !== i ? 'opacity=".55"' : ''}/>`;
      });
      svg += `<text x="${cx}" y="${H - 8}" text-anchor="middle" ${opts.highlight === i ? 'style="fill:#14532d;font-weight:700"' : ''}>${l}</text>`;
      svg += `<rect x="${cx - gw / 2}" y="${pad.t}" width="${gw}" height="${ih}" fill="transparent" data-tip="${esc(`<b>${opts.tipLabels ? opts.tipLabels[i] : l}</b>${tipRows.join('<br>')}`)}"/>`;
    });
    return svg + '</svg>';
  }

  /* Rosca */
  function donut(opts) {
    const size = opts.size || 160, th = opts.thickness || 22, r = (size - th) / 2, c = 2 * Math.PI * r;
    const total = opts.values.reduce((a, v) => a + v.value, 0) || 1;
    let off = 0;
    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="rotate(-90 ${size / 2} ${size / 2})">`;
    svg += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#eef2f0" stroke-width="${th}"/>`;
    opts.values.forEach(v => {
      const len = (v.value / total) * c;
      svg += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${v.color}" stroke-width="${th}" stroke-dasharray="${Math.max(len - 2, 0)} ${c}" stroke-dashoffset="${-off}" data-tip="${esc(`<b>${v.label}</b>${fmt(v.value)}${opts.unit || ''} (${Math.round((v.value / total) * 100)}%)`)}" style="cursor:pointer"/>`;
      off += len;
    });
    svg += `</g>`;
    if (opts.center) svg += `<text x="50%" y="${size / 2 - 2}" text-anchor="middle" style="font-family:Inter;font-size:${size / 7}px;font-weight:800;fill:#141a17">${opts.center}</text><text x="50%" y="${size / 2 + 16}" text-anchor="middle" style="font-family:Inter;font-size:11px;fill:#67766e">${opts.centerSub || ''}</text>`;
    return svg + '</svg>';
  }

  function sparkline(values, color = '#16a34a', w = 90, h = 30) {
    const max = Math.max(...values), min = Math.min(...values), rng = max - min || 1;
    const pts = values.map((v, i) => `${(i * w) / (values.length - 1)},${h - 3 - ((v - min) / rng) * (h - 6)}`).join(' ');
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  /* Medidor semicircular */
  function gauge(pct, color = '#16a34a', size = 180, label = '') {
    const r = size / 2 - 14, cx = size / 2, cy = size / 2, c = Math.PI * r;
    return `<svg width="${size}" height="${size / 2 + 20}" viewBox="0 0 ${size} ${size / 2 + 20}">
      <path d="M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}" fill="none" stroke="#eef2f0" stroke-width="16" stroke-linecap="round"/>
      <path d="M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${(c * pct) / 100} ${c}"/>
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" style="font-family:Inter;font-size:28px;font-weight:800;fill:#141a17">${Math.round(pct)}%</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" style="font-family:Inter;font-size:11px;fill:#67766e">${label}</text>
    </svg>`;
  }

  return { line, bars, donut, sparkline, gauge };
})();