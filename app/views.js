/* Atlas of Nations — view renderers. Each view returns HTML into #app and
   then draws its charts. Views are plain functions of (state, actions). */
import { COUNTRIES, INDICATORS, YEARS, SOURCE_NOTE } from './data.js';
import { drawBarChart, drawLineChart } from './charts.js';

export const PALETTE = ['#2563eb', '#d97706', '#059669', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#475569'];
export const LATEST_YEAR = 2023;

export function formatValue(key, value) {
  if (value == null) return '–';
  if (key === 'population') return Math.round(value).toLocaleString('en-US');
  if (key === 'gdpPerCapita') return '$' + Math.round(value).toLocaleString('en-US');
  if (key === 'lifeExpectancy') return value.toFixed(1) + ' yrs';
  if (key === 'unemployment') return value.toFixed(1) + '%';
  if (key === 'infantMortality') return value.toFixed(1) + ' / 1,000';
  if (key === 'gdpGrowth') return (value > 0 ? '+' : '') + value.toFixed(1) + '%';
  return String(value);
}

function indicatorOptions(selectedKey) {
  return INDICATORS.map(ind => `<option value="${ind.key}"${ind.key === selectedKey ? ' selected' : ''}>${ind.label}</option>`).join('');
}

function countryOptions(selectedCode) {
  return Object.entries(COUNTRIES)
    .map(([code, c]) => `<option value="${code}"${code === selectedCode ? ' selected' : ''}>${c.name}</option>`)
    .join('');
}

function latestValue(code, key) {
  const series = COUNTRIES[code].series[key];
  for (let y = LATEST_YEAR; y >= YEARS[0]; y--) {
    if (series[y] != null) return { year: y, value: series[y] };
  }
  return { year: null, value: null };
}

function changeSince(code, key, fromYear) {
  const series = COUNTRIES[code].series[key];
  const now = latestValue(code, key);
  if (now.value == null || series[fromYear] == null) return null;
  return { delta: now.value - series[fromYear], pct: ((now.value - series[fromYear]) / Math.abs(series[fromYear])) * 100 };
}

/* ---------------- Home ---------------- */

export function renderHome(app, state) {
  const ind = INDICATORS.find(i => i.key === state.homeIndicator);
  const rows = Object.entries(COUNTRIES)
    .map(([code, c], i) => ({ code, name: c.name, value: latestValue(code, ind.key).value, color: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));

  app.innerHTML = `
    <section class="hero">
      <h1>National statistics, in plain sight.</h1>
      <p class="lede">Real figures for ten countries — population, wealth, health and work — from the World Bank, 2014–2023. Pick a country, follow an indicator over a decade, or put countries side by side.</p>
      <div class="hero-actions">
        <a class="btn primary" href="#/country/USA">Explore a country</a>
        <a class="btn" href="#/compare">Compare countries</a>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>Ranking — ${ind.label} (${LATEST_YEAR})</h2>
        <label class="inline-label">Indicator
          <select id="home-indicator" aria-label="Choose indicator to rank">${indicatorOptions(ind.key)}</select>
        </label>
      </div>
      <p class="card-note">${ind.description} · Unit: ${ind.unit} · World Bank code ${ind.worldBankCode}</p>
      <canvas id="home-chart" data-height="340" role="img" aria-label="Bar chart ranking countries by ${ind.label}"></canvas>
      <ol class="rank-list">
        ${rows.map((r, i) => `<li><a href="#/country/${r.code}"><span class="rank-num">${i + 1}</span> ${r.name} <strong>${formatValue(ind.key, r.value)}</strong></a></li>`).join('')}
      </ol>
    </section>

    <section class="card">
      <h2>At a glance — ${LATEST_YEAR}</h2>
      <p class="card-note">Latest published value for each country. Click a country for its full profile.</p>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Country</th><th>Population</th><th>GDP per capita</th><th>Life expectancy</th><th>Unemployment</th></tr></thead>
        <tbody>
          ${Object.entries(COUNTRIES).map(([code, c]) => `<tr>
            <td><a href="#/country/${code}">${c.name}</a></td>
            <td>${formatValue('population', latestValue(code, 'population').value)}</td>
            <td>${formatValue('gdpPerCapita', latestValue(code, 'gdpPerCapita').value)}</td>
            <td>${formatValue('lifeExpectancy', latestValue(code, 'lifeExpectancy').value)}</td>
            <td>${formatValue('unemployment', latestValue(code, 'unemployment').value)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <p class="card-note">${SOURCE_NOTE}</p>
    </section>`;

  drawBarChart(app.querySelector('#home-chart'), rows.map(r => ({ label: r.name, value: r.value, color: r.color })), ind.unit);
  app.querySelector('#home-indicator').addEventListener('change', e => {
    state.homeIndicator = e.target.value;
    renderHome(app, state);
  });
}

/* ---------------- Country profile ---------------- */

export function renderCountry(app, state) {
  const code = state.country;
  const country = COUNTRIES[code];
  const ind = INDICATORS.find(i => i.key === state.countryIndicator);

  const cards = INDICATORS.map(ind2 => {
    const latest = latestValue(code, ind2.key);
    const chg = changeSince(code, ind2.key, 2014);
    const chgText = chg == null ? 'change n/a'
      : (ind2.key === 'population' || ind2.key === 'gdpPerCapita'
        ? `${chg.pct >= 0 ? '+' : ''}${chg.pct.toFixed(1)}% since 2014`
        : `${chg.delta >= 0 ? '+' : ''}${chg.delta.toFixed(1)} ${ind2.unit} since 2014`);
    return `<button class="stat-card${ind2.key === ind.key ? ' active' : ''}" data-indicator="${ind2.key}">
      <span class="stat-label">${ind2.label}</span>
      <span class="stat-value">${formatValue(ind2.key, latest.value)}</span>
      <span class="stat-meta">${latest.year ? latest.year : '—'} · ${chgText}</span>
    </button>`;
  }).join('');

  const tableRows = YEARS.map(y => {
    const v = country.series[ind.key][y];
    return `<tr><td>${y}</td><td>${formatValue(ind.key, v)}</td></tr>`;
  }).join('');

  app.innerHTML = `
    <section class="page-head">
      <p class="crumb"><a href="#/home">Home</a> › Countries</p>
      <div class="country-head">
        <h1>${country.name}</h1>
        <label class="inline-label">Switch country
          <select id="country-picker" aria-label="Choose country">${countryOptions(code)}</select>
        </label>
      </div>
      <p class="lede">Six headline indicators for ${country.name}, 2014–2023. Tap any card to chart that indicator below.</p>
    </section>

    <section class="stat-grid" aria-label="Headline indicators">${cards}</section>

    <section class="card">
      <div class="card-head">
        <h2>${ind.label} in ${country.name}, 2014–2023</h2>
        <a class="btn small" href="#/compare?add=${code}">Compare ${country.name} with others</a>
      </div>
      <p class="card-note">${ind.description} · Unit: ${ind.unit} · World Bank code ${ind.worldBankCode}</p>
      <canvas id="country-chart" data-height="300" role="img" aria-label="Line chart of ${ind.label} in ${country.name} from 2014 to 2023"></canvas>
      <div class="table-wrap"><table class="data-table narrow">
        <thead><tr><th>Year</th><th>${ind.label} (${ind.unit})</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table></div>
      <p class="card-note">${SOURCE_NOTE}</p>
    </section>

    <section class="card">
      <h2>Other countries</h2>
      <p class="country-links">${Object.entries(COUNTRIES).filter(([c]) => c !== code)
        .map(([c, cc]) => `<a href="#/country/${c}">${cc.name}</a>`).join(' · ')}</p>
    </section>`;

  drawLineChart(app.querySelector('#country-chart'),
    [{ label: country.name, color: '#2563eb', points: YEARS.map(y => ({ year: y, value: country.series[ind.key][y] })) }],
    ind.unit, YEARS);

  app.querySelector('#country-picker').addEventListener('change', e => {
    location.hash = '#/country/' + e.target.value;
  });
  app.querySelectorAll('.stat-card').forEach(btn => {
    btn.addEventListener('click', () => {
      state.countryIndicator = btn.dataset.indicator;
      renderCountry(app, state);
    });
  });
}

/* ---------------- Compare ---------------- */

export function renderCompare(app, state) {
  const selected = state.compare.filter(c => COUNTRIES[c]);
  const ind = INDICATORS.find(i => i.key === state.compareIndicator);

  const checkboxes = Object.entries(COUNTRIES).map(([code, c], i) => `
    <label class="check"><input type="checkbox" value="${code}"${selected.includes(code) ? ' checked' : ''}>
      <span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span>${c.name}</label>`).join('');

  const tableRows = INDICATORS.map(ind2 => `<tr>
    <th scope="row">${ind2.label}<span class="unit">${ind2.unit}</span></th>
    ${selected.map(code => `<td>${formatValue(ind2.key, latestValue(code, ind2.key).value)}</td>`).join('')}
  </tr>`).join('');

  const chartSeries = selected.map((code, i) => ({
    label: COUNTRIES[code].name,
    color: PALETTE[Object.keys(COUNTRIES).indexOf(code) % PALETTE.length],
    points: YEARS.map(y => ({ year: y, value: COUNTRIES[code].series[ind.key][y] })),
  }));

  app.innerHTML = `
    <section class="page-head">
      <p class="crumb"><a href="#/home">Home</a> › Compare</p>
      <h1>Compare countries</h1>
      <p class="lede">Pick two or three countries and see them side by side — latest values in a table, and the trend over 2014–2023 in a chart.</p>
    </section>

    <section class="card">
      <h2>Choose countries (2–3)</h2>
      <div class="check-grid" id="compare-picks">${checkboxes}</div>
      <p class="card-note" id="compare-hint">${selected.length < 2 ? 'Pick at least two countries to compare.' : selected.length > 3 ? 'Three at most — uncheck one to keep the chart readable.' : ''}</p>
    </section>

    ${selected.length >= 2 ? `
    <section class="card">
      <div class="card-head">
        <h2>Side by side — latest values (${LATEST_YEAR})</h2>
        <label class="inline-label">Chart indicator
          <select id="compare-indicator" aria-label="Choose indicator to chart">${indicatorOptions(ind.key)}</select>
        </label>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Indicator</th>${selected.map(code => `<th>${COUNTRIES[code].name}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table></div>
      <p class="card-note">Each cell shows the latest published value (2023 unless noted). ${SOURCE_NOTE}</p>
    </section>

    <section class="card">
      <h2>${ind.label}, 2014–2023</h2>
      <p class="card-note">${ind.description} · Unit: ${ind.unit}</p>
      <canvas id="compare-chart" data-height="320" role="img" aria-label="Line chart comparing ${ind.label} across selected countries"></canvas>
    </section>` : ''}`;

  app.querySelectorAll('#compare-picks input').forEach(box => {
    box.addEventListener('change', () => {
      const picked = [...app.querySelectorAll('#compare-picks input:checked')].map(b => b.value);
      if (picked.length > 3) {
        box.checked = false; // three at most — keep the chart readable
        app.querySelector('#compare-hint').textContent = 'Three at most — uncheck one first to add another.';
        return;
      }
      state.compare = picked;
      renderCompare(app, state);
    });
  });
  const sel = app.querySelector('#compare-indicator');
  if (sel) {
    sel.addEventListener('change', e => {
      state.compareIndicator = e.target.value;
      renderCompare(app, state);
    });
    drawLineChart(app.querySelector('#compare-chart'), chartSeries, ind.unit, YEARS);
  }
}

/* ---------------- About ---------------- */

export function renderAbout(app) {
  app.innerHTML = `
    <section class="page-head">
      <p class="crumb"><a href="#/home">Home</a> › About</p>
      <h1>About the data</h1>
    </section>
    <section class="card prose">
      <h2>Where the numbers come from</h2>
      <p>${SOURCE_NOTE}</p>
      <p>Every figure on this site is a value published by the World Bank for the year shown. Nothing is estimated by this site, and no figure is invented. Where the Bank publishes no value for a country and year, the site shows a dash (–) instead of guessing.</p>
      <h2>The six indicators</h2>
      <ul>
        ${INDICATORS.map(ind => `<li><strong>${ind.label}</strong> — ${ind.description} (${ind.unit}). World Bank code ${ind.worldBankCode}.</li>`).join('')}
      </ul>
      <h2>The ten countries</h2>
      <p>${Object.values(COUNTRIES).map(c => c.name).join(', ')} — chosen as the ten largest economies and most-looked-up countries in world statistics, spanning North America, South America, Europe, Asia and Oceania.</p>
      <h2>How to use this site</h2>
      <ul>
        <li><strong>Home</strong> ranks all ten countries on any indicator and gives a latest-values table.</li>
        <li><strong>Countries</strong> opens a profile: six headline cards, a ten-year chart and a year-by-year table.</li>
        <li><strong>Compare</strong> puts two or three countries side by side, in a table and on one chart.</li>
      </ul>
      <h2>About this site</h2>
      <p>Atlas of Nations is an original site built for the make.fun “best national statistics site” bounty. It is a static site: all data, charts and styles ship with the page, and it makes no network requests. Charts are drawn on canvas by the site’s own code.</p>
    </section>`;
}
