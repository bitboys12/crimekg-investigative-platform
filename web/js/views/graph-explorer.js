import { fetchFilteredGraph, fetchEntity } from '../api.js';
import { GraphCanvas } from '../graph-canvas.js';

let activeCanvas = null;

export async function renderGraphExplorer(container, initialQuery = '') {
  container.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h1 class="serif-text" style="font-size: 26px; color: var(--color-primary-navy);">Knowledge Graph Explorer</h1>
      <p style="font-size: 14px; color: var(--color-text-secondary);">
        Explore how crime incidents, suspects, vehicles, locations, and administrative jurisdictions are connected.
      </p>
    </div>

    <!-- 3-Column Layout: Controls | Canvas | Inspector -->
    <div class="graph-explorer-layout">
      <!-- Left Controls Panel -->
      <aside class="graph-controls-panel">
        <div class="control-group">
          <label class="control-label" for="graphSearchInput">Focus Entity / Query</label>
          <input type="text" id="graphSearchInput" class="control-input" placeholder="e.g. Allen, IL-4258-DT, 009" value="${initialQuery}" />
        </div>

        <div class="control-group">
          <label class="control-label">Entity Types</label>
          <div class="filter-checkbox-list">
            <label class="filter-checkbox-item">
              <input type="checkbox" name="entityType" value="CASE" checked />
              <span class="filter-badge-dot" style="background-color: var(--node-case);"></span>
              <span>Crime Incident</span>
            </label>
            <label class="filter-checkbox-item">
              <input type="checkbox" name="entityType" value="SUSPECT" checked />
              <span class="filter-badge-dot" style="background-color: var(--node-suspect);"></span>
              <span>Suspect</span>
            </label>
            <label class="filter-checkbox-item">
              <input type="checkbox" name="entityType" value="VEHICLE" checked />
              <span class="filter-badge-dot" style="background-color: var(--node-vehicle);"></span>
              <span>Vehicle</span>
            </label>
            <label class="filter-checkbox-item">
              <input type="checkbox" name="entityType" value="LOCATION" checked />
              <span class="filter-badge-dot" style="background-color: var(--node-location);"></span>
              <span>Location (Block)</span>
            </label>
            <label class="filter-checkbox-item">
              <input type="checkbox" name="entityType" value="CRIME_TYPE" checked />
              <span class="filter-badge-dot" style="background-color: var(--node-crimetype);"></span>
              <span>Crime Type</span>
            </label>
            <label class="filter-checkbox-item">
              <input type="checkbox" name="entityType" value="POLICE_BEAT" checked />
              <span class="filter-badge-dot" style="background-color: var(--node-beat);"></span>
              <span>Police Beat</span>
            </label>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label" for="crimeTypeSelect">Crime Type Filter</label>
          <select id="crimeTypeSelect" class="control-select">
            <option value="">All Crime Types</option>
            <option value="ROBBERY">ROBBERY</option>
            <option value="THEFT">THEFT</option>
            <option value="BATTERY">BATTERY</option>
            <option value="BURGLARY">BURGLARY</option>
            <option value="ASSAULT">ASSAULT</option>
            <option value="NARCOTICS">NARCOTICS</option>
            <option value="MOTOR VEHICLE THEFT">MOTOR VEHICLE THEFT</option>
            <option value="CRIMINAL DAMAGE">CRIMINAL DAMAGE</option>
          </select>
        </div>

        <div class="control-group">
          <label class="control-label" for="districtSelect">Police District</label>
          <select id="districtSelect" class="control-select">
            <option value="">All Districts</option>
            <option value="001">District 001</option>
            <option value="002">District 002</option>
            <option value="003">District 003</option>
            <option value="004">District 004</option>
            <option value="005">District 005</option>
            <option value="006">District 006</option>
            <option value="007">District 007</option>
            <option value="008">District 008</option>
            <option value="009">District 009</option>
            <option value="010">District 010</option>
            <option value="011">District 011</option>
            <option value="012">District 012</option>
            <option value="014">District 014</option>
            <option value="015">District 015</option>
            <option value="016">District 016</option>
            <option value="017">District 017</option>
            <option value="018">District 018</option>
            <option value="019">District 019</option>
            <option value="020">District 020</option>
            <option value="022">District 022</option>
            <option value="024">District 024</option>
            <option value="025">District 025</option>
          </select>
        </div>

        <div class="control-group">
          <label class="control-label" for="nodeLimitSelect">Max Display Nodes</label>
          <select id="nodeLimitSelect" class="control-select">
            <option value="120">120 nodes (Fastest)</option>
            <option value="250" selected>250 nodes (Recommended)</option>
            <option value="400">400 nodes (Dense)</option>
          </select>
        </div>

        <div style="display: flex; gap: 8px; margin-top: auto;">
          <button class="btn btn-primary btn-sm" style="flex:1;" id="applyFiltersBtn">Apply Filters</button>
          <button class="btn btn-secondary btn-sm" id="resetFiltersBtn">Reset</button>
        </div>
      </aside>

      <!-- Center Interactive Canvas -->
      <main class="graph-canvas-container">
        <!-- Floating Toolbar -->
        <div class="graph-top-toolbar">
          <button class="toolbar-btn" id="zoomInBtn" title="Zoom In">+</button>
          <button class="toolbar-btn" id="zoomOutBtn" title="Zoom Out">&minus;</button>
          <button class="toolbar-btn" id="fitScreenBtn" title="Fit to Screen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
          </button>
          <button class="toolbar-btn" id="resetViewBtn" title="Reset View">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
          </button>
        </div>

        <canvas id="explorerCanvas" class="interactive-canvas"></canvas>

        <!-- Node Category Legend Overlay -->
        <div class="graph-legend-overlay">
          <div class="legend-item"><span class="legend-swatch" style="background: var(--node-case);"></span> Case</div>
          <div class="legend-item"><span class="legend-swatch" style="background: var(--node-suspect);"></span> Suspect</div>
          <div class="legend-item"><span class="legend-swatch" style="background: var(--node-vehicle);"></span> Vehicle</div>
          <div class="legend-item"><span class="legend-swatch" style="background: var(--node-location);"></span> Location</div>
          <div class="legend-item"><span class="legend-swatch" style="background: var(--node-crimetype);"></span> Crime Type</div>
          <div class="legend-item"><span class="legend-swatch" style="background: var(--node-beat);"></span> Police Beat</div>
        </div>
      </main>

      <!-- Right Entity Inspector Drawer -->
      <aside class="graph-detail-panel" id="graphDetailPanel">
        <div style="color: var(--color-text-muted); text-align: center; padding: 40px 10px;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; color: var(--color-border-strong);">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <h4 style="font-size: 15px; color: var(--color-text-secondary); margin-bottom: 6px;">No Entity Selected</h4>
          <p style="font-size: 12.5px;">Click any node on the graph canvas to inspect its attributes, relationships, and connected records.</p>
        </div>
      </aside>
    </div>

    <!-- Related Cases Data Table Below Graph -->
    <section style="margin-top: 24px;">
      <div class="section-header">
        <div>
          <h3 class="section-title">Contextual Crime Incident Records</h3>
          <div class="section-subtitle">Cases represented in current Knowledge Graph exploration</div>
        </div>
      </div>
      <div class="table-container" id="relatedCasesTableContainer">
        <div style="padding: 24px; text-align: center; color: var(--color-text-muted); font-size: 13px;">
          Select a node or apply filters above to populate contextual records.
        </div>
      </div>
    </section>
  `;

  const canvasEl = document.getElementById('explorerCanvas');
  const detailPanel = document.getElementById('graphDetailPanel');
  const relatedTableContainer = document.getElementById('relatedCasesTableContainer');
  const applyBtn = document.getElementById('applyFiltersBtn');
  const resetBtn = document.getElementById('resetFiltersBtn');
  const searchInput = document.getElementById('graphSearchInput');
  const crimeTypeSelect = document.getElementById('crimeTypeSelect');
  const districtSelect = document.getElementById('districtSelect');
  const nodeLimitSelect = document.getElementById('nodeLimitSelect');

  // Initialize Canvas
  activeCanvas = new GraphCanvas(canvasEl, {
    onNodeSelect: async (node) => {
      await loadEntityDetails(node.id, detailPanel, relatedTableContainer);
    },
    onNodeDoubleClick: (node) => {
      if (node.type === 'CASE') {
        window.location.hash = `#cases/${encodeURIComponent(node.id)}`;
      } else {
        window.location.hash = `#entities/${encodeURIComponent(node.id)}`;
      }
    }
  });

  // Toolbar Bindings
  document.getElementById('zoomInBtn').addEventListener('click', () => activeCanvas.zoomIn());
  document.getElementById('zoomOutBtn').addEventListener('click', () => activeCanvas.zoomOut());
  document.getElementById('fitScreenBtn').addEventListener('click', () => activeCanvas.fitToScreen());
  document.getElementById('resetViewBtn').addEventListener('click', () => activeCanvas.reset());

  // Load Graph Data based on current filter selections
  async function loadGraph() {
    const selectedTypes = Array.from(document.querySelectorAll('input[name="entityType"]:checked')).map(cb => cb.value);
    const ct = crimeTypeSelect.value ? [crimeTypeSelect.value] : [];
    const dist = districtSelect.value ? [districtSelect.value] : [];
    const q = searchInput.value.trim();
    const limit = parseInt(nodeLimitSelect.value, 10) || 250;

    try {
      const graphData = await fetchFilteredGraph({
        types: selectedTypes,
        crimeTypes: ct,
        districts: dist,
        query: q,
        limit: limit
      });

      activeCanvas.setData(graphData);

      // If query exactly matches a node, focus it immediately
      if (q && activeCanvas.nodeMap.has(q)) {
        activeCanvas.focusNode(q);
      }
    } catch (err) {
      console.error("Failed to fetch graph data:", err);
    }
  }

  applyBtn.addEventListener('click', loadGraph);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadGraph();
  });

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    crimeTypeSelect.value = '';
    districtSelect.value = '';
    document.querySelectorAll('input[name="entityType"]').forEach(cb => cb.checked = true);
    loadGraph();
  });

  window.addEventListener('resize', () => {
    if (activeCanvas) activeCanvas.resize();
  });

  // Initial load
  await loadGraph();
}

async function loadEntityDetails(entityId, detailContainer, tableContainer) {
  detailContainer.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div class="spinner" style="margin: 0 auto 10px;"></div>
      <span style="font-size: 12px; color: var(--color-text-muted);">Inspecting entity profile...</span>
    </div>
  `;

  try {
    const entity = await fetchEntity(entityId);
    if (!entity) return;

    const typeColor = {
      CASE: 'var(--node-case)',
      SUSPECT: 'var(--node-suspect)',
      VEHICLE: 'var(--node-vehicle)',
      LOCATION: 'var(--node-location)',
      CRIME_TYPE: 'var(--node-crimetype)',
      POLICE_BEAT: 'var(--node-beat)'
    }[entity.type] || 'var(--node-admin)';

    detailContainer.innerHTML = `
      <div>
        <div class="entity-badge-header">
          <span class="entity-type-tag" style="background-color: ${typeColor};">${entity.type}</span>
          <span style="font-size: 11px; font-family: var(--font-mono); color: var(--color-text-muted);">ID: ${entity.id}</span>
        </div>
        <h3 class="entity-title-name">${entity.label}</h3>
      </div>

      <!-- Quick Metrics -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background-color: var(--color-bg-warm); padding: 10px; border-radius: 4px; border: 1px solid var(--color-border-subtle);">
        <div>
          <div style="font-size: 10px; text-transform: uppercase; color: var(--color-text-muted);">Incidents</div>
          <div style="font-size: 18px; font-weight: 700; color: var(--color-primary-navy);">${entity.connected_incident_count || 0}</div>
        </div>
        <div>
          <div style="font-size: 10px; text-transform: uppercase; color: var(--color-text-muted);">Relationships</div>
          <div style="font-size: 18px; font-weight: 700; color: var(--color-primary-navy);">${entity.relationship_count || 0}</div>
        </div>
      </div>

      <!-- Node Properties -->
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-text-secondary); margin-bottom: 6px;">
          Entity Properties
        </div>
        <table class="entity-properties-table">
          <tbody>
            ${Object.entries(entity.properties || {}).map(([k, v]) => `
              <tr>
                <td>${k}</td>
                <td>${v !== null && v !== '' ? v : '<span style="color:var(--color-text-muted);font-style:italic;">None</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Direct Connections -->
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--color-text-secondary); margin-bottom: 6px;">
          Direct Graph Relationships (${(entity.relationships || []).length})
        </div>
        <div class="connected-relations-list">
          ${(entity.relationships || []).map(rel => `
            <div class="relation-item" data-target="${rel.target_id}">
              <div>
                <div style="font-weight: 600; font-size: 12px;">${rel.target_label}</div>
                <div style="font-size: 10px; color: var(--color-text-muted); font-family: var(--font-mono);">${rel.relationship}</div>
              </div>
              <span class="badge" style="background:#E2E8F0; font-size: 9.5px;">${rel.target_type}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Actions -->
      <div style="display: flex; gap: 8px; margin-top: auto;">
        ${entity.type === 'CASE' ? `
          <a href="#cases/${encodeURIComponent(entity.id)}" class="btn btn-primary btn-sm" style="flex:1;">
            Open Case Dossier &rarr;
          </a>
        ` : `
          <a href="#entities/${encodeURIComponent(entity.id)}" class="btn btn-primary btn-sm" style="flex:1;">
            Open Entity Dossier &rarr;
          </a>
        `}
      </div>
    `;

    // Click handler for related neighbor items in inspector
    detailContainer.querySelectorAll('.relation-item').forEach(item => {
      item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        if (activeCanvas && targetId) {
          activeCanvas.focusNode(targetId);
        }
      });
    });

    // Populate Contextual Records Table
    const records = entity.records || [];
    if (records.length > 0) {
      tableContainer.innerHTML = `
        <table class="gov-table">
          <thead>
            <tr>
              <th>Case Number</th>
              <th>Date</th>
              <th>Crime Type</th>
              <th>Suspect</th>
              <th>Vehicle Plate</th>
              <th>Location Block</th>
              <th>District / Beat</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td class="mono-code"><strong>Case #${r.case_number}</strong></td>
                <td class="mono-code">${r.date || 'N/A'}</td>
                <td><span class="badge badge-blue">${r.primary_type}</span></td>
                <td>
                  ${r.suspect_name ? `<a href="#entities/${encodeURIComponent(r.suspect_name)}">${r.suspect_name}</a>` : '<span style="color:var(--color-text-muted);font-style:italic;">Unknown</span>'}
                </td>
                <td>
                  ${r.vehicle_plate ? `<span class="badge badge-gold">${r.vehicle_plate}</span>` : '<span style="color:var(--color-text-muted);font-style:italic;">None</span>'}
                </td>
                <td>${r.block || 'N/A'}</td>
                <td class="mono-code">D:${r.district || '-'} / B:${r.beat || '-'}</td>
                <td>
                  <a href="#cases/${encodeURIComponent(r.case_number)}" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 11px;">View</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      tableContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--color-text-muted); font-size: 13px;">
          No direct incident records associated with this entity.
        </div>
      `;
    }

  } catch (err) {
    console.error("Failed to load entity detail:", err);
  }
}
