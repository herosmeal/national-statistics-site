/* Atlas of Nations — app bootstrap and routing.
   Routes are hash links (#/home, #/country/USA, #/compare, #/about) so every
   page is reached by a link. A ?view=home|country|compare query parameter
   deterministically shows that view on load (used for screenshots). */
import { COUNTRIES, SOURCE_NOTE } from './data.js';
import { renderHome, renderCountry, renderCompare, renderAbout } from './views.js';

const app = document.getElementById('app');
document.getElementById('source-note').textContent = SOURCE_NOTE;

const state = {
  homeIndicator: 'population',
  country: 'USA',
  countryIndicator: 'population',
  compare: ['USA', 'CHN', 'JPN'],
  compareIndicator: 'gdpPerCapita',
};

function routeFromHash() {
  const hash = location.hash || '#/home';
  const parts = hash.replace(/^#\//, '').split('/');
  if (parts[0] === 'country' && COUNTRIES[parts[1]]) return { view: 'country', country: parts[1] };
  if (parts[0] === 'compare') return { view: 'compare' };
  if (parts[0] === 'about') return { view: 'about' };
  return { view: 'home' };
}

function render(keepScroll = false) {
  const params = new URLSearchParams(location.search);
  const staged = params.get('view');
  let route = routeFromHash();
  if (staged === 'home' || staged === 'country' || staged === 'compare') {
    route = { view: staged };
    if (staged === 'country' && !COUNTRIES[state.country]) state.country = 'USA';
  }
  if (route.view === 'country' && route.country) state.country = route.country;
  if (route.view === 'compare') {
    const add = params.get('add');
    if (add && COUNTRIES[add] && !state.compare.includes(add) && state.compare.length < 3) {
      state.compare = [...state.compare, add];
    }
  }

  document.querySelectorAll('[data-nav]').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === route.view);
  });

  if (route.view === 'country') renderCountry(app, state);
  else if (route.view === 'compare') renderCompare(app, state);
  else if (route.view === 'about') renderAbout(app);
  else renderHome(app, state);

  if (!keepScroll) window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => render());
window.addEventListener('resize', () => {
  // Redraw the visible view so charts fit the new width.
  render(true);
});
render();
