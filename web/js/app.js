/**
 * Main Application Router and Controller
 */

import { fetchHealth, searchEntities } from './api.js';
import { renderHome } from './views/home.js';
import { renderFir } from './views/fir.js';
import { renderGraphExplorer } from './views/graph-explorer.js';
import { renderDiscovery } from './views/discovery.js';
import { renderAnalytics } from './views/analytics.js';
import { renderMethodology } from './views/methodology.js';
import { renderAbout } from './views/about.js';
import { renderCaseDetail } from './views/case-detail.js';
import { renderEntityDetail } from './views/entity-detail.js';

class App {
  constructor() {
    this.mainEl = document.getElementById('appMain');
    this.statusDot = document.querySelector('#systemStatusBadge .status-dot');
    this.statusLabel = document.getElementById('statusLabel');
    this.navLinks = document.querySelectorAll('.nav-link');
    this.breadcrumbBar = document.getElementById('breadcrumbBar');
    this.breadcrumbContainer = document.getElementById('breadcrumbContainer');
    this.searchInput = document.getElementById('globalSearchInput');
    this.searchClearBtn = document.getElementById('searchClearBtn');
    this.searchDropdown = document.getElementById('searchDropdown');

    this.searchDebounceTimer = null;

    this._init();
  }

  async _init() {
    this._attachEvents();
    await this._checkSystemHealth();
    this._handleRoute();
  }

  async _checkSystemHealth() {
    try {
      const health = await fetchHealth();
      if (health.neo4j_connected) {
        this.statusDot.className = 'status-dot live';
        this.statusLabel.innerText = 'Neo4j Live (1,670 nodes / 5,639 rels)';
      } else {
        this.statusDot.className = 'status-dot offline';
        this.statusLabel.innerText = 'Knowledge Graph Snapshot (1,530 nodes)';
      }
    } catch (e) {
      this.statusDot.className = 'status-dot offline';
      this.statusLabel.innerText = 'Backend Offline';
    }
  }

  _attachEvents() {
    // Hash change routing
    window.addEventListener('hashchange', () => this._handleRoute());

    // Universal Search input handling
    this.searchInput.addEventListener('input', () => {
      const q = this.searchInput.value.trim();
      this.searchClearBtn.style.display = q ? 'block' : 'none';
      clearTimeout(this.searchDebounceTimer);
      if (q.length >= 2) {
        this.searchDebounceTimer = setTimeout(() => this._performSearch(q), 220);
      } else {
        this.searchDropdown.style.display = 'none';
      }
    });

    this.searchClearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchClearBtn.style.display = 'none';
      this.searchDropdown.style.display = 'none';
      this.searchInput.focus();
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = this.searchInput.value.trim();
        if (q) {
          this.searchDropdown.style.display = 'none';
          window.location.hash = `#graph?q=${encodeURIComponent(q)}`;
        }
      } else if (e.key === 'Escape') {
        this.searchDropdown.style.display = 'none';
      }
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.searchDropdown.contains(e.target)) {
        this.searchDropdown.style.display = 'none';
      }
    });
  }

  async _performSearch(query) {
    try {
      const data = await searchEntities(query);
      const totalResults = (data.cases?.length || 0) + (data.suspects?.length || 0) +
                           (data.vehicles?.length || 0) + (data.locations?.length || 0) +
                           (data.crime_types?.length || 0) + (data.police_beats?.length || 0);

      if (totalResults === 0) {
        this.searchDropdown.innerHTML = `
          <div style="padding: 16px; text-align: center; color: var(--color-text-muted); font-size: 13px;">
            No matching entities found for "${query}"
          </div>
        `;
        this.searchDropdown.style.display = 'block';
        return;
      }

      let html = '';

      const renderGroup = (title, items, badgeClass, routePrefix) => {
        if (!items || items.length === 0) return;
        html += `<div class="search-group-title">${title} (${items.length})</div>`;
        items.slice(0, 5).forEach(item => {
          html += `
            <div class="search-item" data-url="#${routePrefix}/${encodeURIComponent(item.id)}">
              <div class="search-item-main">
                <span class="search-item-label">${item.label}</span>
                <span class="search-item-sub">Degree: ${item.degree} relationships</span>
              </div>
              <span class="search-badge ${badgeClass}">${item.type}</span>
            </div>
          `;
        });
      };

      renderGroup('Crime Incidents', data.cases, 'badge-blue', 'cases');
      renderGroup('Suspect Entities', data.suspects, 'badge-teal', 'entities');
      renderGroup('Vehicles', data.vehicles, 'badge-gold', 'entities');
      renderGroup('Locations', data.locations, 'badge', 'entities');
      renderGroup('Crime Types', data.crime_types, 'badge', 'entities');
      renderGroup('Police Beats', data.police_beats, 'badge', 'entities');

      this.searchDropdown.innerHTML = html;
      this.searchDropdown.style.display = 'block';

      this.searchDropdown.querySelectorAll('.search-item').forEach(item => {
        item.addEventListener('click', () => {
          const url = item.getAttribute('data-url');
          this.searchDropdown.style.display = 'none';
          this.searchInput.value = '';
          this.searchClearBtn.style.display = 'none';
          window.location.hash = url;
        });
      });

    } catch (e) {
      console.error("Search failed:", e);
    }
  }

  _handleRoute() {
    const rawHash = window.location.hash.slice(1) || 'home';
    const [pathPart, queryPart] = rawHash.split('?');
    const segments = pathPart.split('/').filter(Boolean);
    const rootRoute = segments[0] || 'home';

    // Update active nav link
    this.navLinks.forEach(link => {
      const linkView = link.getAttribute('data-view');
      link.classList.toggle('active', linkView === rootRoute);
    });

    // Update breadcrumbs
    this._updateBreadcrumbs(rootRoute, segments);

    // Scroll to top
    window.scrollTo(0, 0);

    // Route dispatch
    if (rootRoute === 'home') {
      renderHome(this.mainEl);
    } else if (rootRoute === 'fir') {
      renderFir(this.mainEl);
    } else if (rootRoute === 'graph') {
      const qParams = new URLSearchParams(queryPart || '');
      const query = qParams.get('q') || '';
      renderGraphExplorer(this.mainEl, query);
    } else if (rootRoute === 'discovery') {
      renderDiscovery(this.mainEl);
    } else if (rootRoute === 'analytics') {
      renderAnalytics(this.mainEl);
    } else if (rootRoute === 'methodology') {
      renderMethodology(this.mainEl);
    } else if (rootRoute === 'about') {
      renderAbout(this.mainEl);
    } else if (rootRoute === 'cases' && segments[1]) {
      const caseNumber = decodeURIComponent(segments[1]);
      renderCaseDetail(this.mainEl, caseNumber);
    } else if (rootRoute === 'entities' && segments[1]) {
      const entityId = decodeURIComponent(segments[1]);
      renderEntityDetail(this.mainEl, entityId);
    } else {
      renderHome(this.mainEl);
    }
  }

  _updateBreadcrumbs(rootRoute, segments) {
    if (rootRoute === 'home') {
      this.breadcrumbBar.style.display = 'none';
      return;
    }

    this.breadcrumbBar.style.display = 'block';

    if (rootRoute === 'cases' && segments[1]) {
      this.breadcrumbContainer.innerHTML = `
        <a href="#home">Home</a>
        <span class="sep">/</span>
        <a href="#graph">Knowledge Graph</a>
        <span class="sep">/</span>
        <span class="current">Case #${decodeURIComponent(segments[1])}</span>
      `;
    } else if (rootRoute === 'entities' && segments[1]) {
      this.breadcrumbContainer.innerHTML = `
        <a href="#home">Home</a>
        <span class="sep">/</span>
        <a href="#graph">Knowledge Graph</a>
        <span class="sep">/</span>
        <span class="current">${decodeURIComponent(segments[1])}</span>
      `;
    } else {
      const titles = {
        fir: 'FIR Analysis',
        graph: 'Knowledge Graph Explorer',
        discovery: 'Investigative Relationship Discovery',
        analytics: 'Crime Intelligence Overview',
        methodology: 'Methodology & Ontology',
        about: 'About Project SIH26189'
      };
      this.breadcrumbContainer.innerHTML = `
        <a href="#home">Home</a>
        <span class="sep">/</span>
        <span class="current">${titles[rootRoute] || rootRoute}</span>
      `;
    }
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
