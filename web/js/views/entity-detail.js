import { fetchEntity } from '../api.js';
import { GraphCanvas } from '../graph-canvas.js';

export async function renderEntityDetail(container, entityId) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <div class="spinner" style="margin: 0 auto 12px;"></div>
      <p style="color: var(--color-text-secondary); font-size: 13.5px;">Loading Entity profile for "${entityId}"...</p>
    </div>
  `;

  try {
    const entity = await fetchEntity(entityId);
    if (!entity) {
      container.innerHTML = `
        <div style="background: white; padding: 40px; text-align: center; border-radius: 6px; border: 1px solid var(--color-border-subtle);">
          <h2 style="color: var(--color-status-alert);">Entity Not Found</h2>
          <p style="margin: 12px 0 20px; color: var(--color-text-secondary);">The entity "${entityId}" could not be located in the Knowledge Graph.</p>
          <a href="#graph" class="btn btn-primary">Return to Knowledge Graph</a>
        </div>
      `;
      return;
    }

    const typeColor = {
      CASE: 'var(--node-case)',
      SUSPECT: 'var(--node-suspect)',
      VEHICLE: 'var(--node-vehicle)',
      LOCATION: 'var(--node-location)',
      CRIME_TYPE: 'var(--node-crimetype)',
      POLICE_BEAT: 'var(--node-beat)'
    }[entity.type] || 'var(--node-admin)';

    const records = entity.records || [];
    const rels = entity.relationships || [];

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
        <div>
          <div class="entity-badge-header">
            <span class="entity-type-tag" style="background-color: ${typeColor};">${entity.type}</span>
            <span style="font-size: 11.5px; font-family: var(--font-mono); color: var(--color-text-muted);">Entity Identifier: ${entity.id}</span>
          </div>
          <h1 class="serif-text" style="font-size: 28px; color: var(--color-primary-navy); margin-top: 4px;">${entity.label}</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <a href="#graph?q=${encodeURIComponent(entity.id)}" class="btn btn-secondary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Explore in Full Graph
          </a>
          <a href="#discovery" class="btn btn-primary btn-sm">
            Cross-Case Path Tracer
          </a>
        </div>
      </div>

      <!-- Quick Metrics Summary -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="metric-card">
          <div class="metric-label">Incident Appearances</div>
          <div class="metric-value">${entity.connected_incident_count || 0}</div>
          <div class="metric-note">Connected crime reports</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Direct Graph Degree</div>
          <div class="metric-value">${entity.relationship_count || 0}</div>
          <div class="metric-note">Relationships in network</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Entity Category</div>
          <div class="metric-value" style="font-size: 22px;">${entity.type}</div>
          <div class="metric-note">Domain ontology class</div>
        </div>
      </div>

      <!-- Neutrality Callout -->
      <div class="observation-callout" style="margin-bottom: 24px;">
        <strong>Investigative Observation:</strong> Entity appears in ${records.length} record(s) across available crime incident reports. This reflects documentary associations in submitted records and does not assert criminal culpability.
      </div>

      <!-- Graph & Properties Grid -->
      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 20px; margin-bottom: 28px;">
        <!-- Focused Canvas -->
        <div class="graph-canvas-container" style="height: 400px; min-height: 400px;">
          <canvas id="entityGraphCanvas" class="interactive-canvas" style="min-height: 400px;"></canvas>
          <div class="graph-legend-overlay">
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-case);"></span> Case</div>
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-suspect);"></span> Suspect</div>
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-vehicle);"></span> Vehicle</div>
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-location);"></span> Location</div>
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-crimetype);"></span> Crime Type</div>
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-beat);"></span> Police Beat</div>
          </div>
        </div>

        <!-- Direct Relationships Sidebar -->
        <div style="background: white; border: 1px solid var(--color-border-subtle); border-radius: 6px; padding: 18px; box-shadow: var(--shadow-sm); overflow-y: auto; max-height: 400px;">
          <h4 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--color-primary-navy); margin-bottom: 12px;">
            Direct Connections (${rels.length})
          </h4>
          <div class="connected-relations-list">
            ${rels.map(r => `
              <div class="relation-item" onclick="window.location.hash='#entities/${encodeURIComponent(r.target_id)}'">
                <div>
                  <div style="font-weight: 600; font-size: 12px;">${r.target_label}</div>
                  <div style="font-size: 10px; color: var(--color-text-muted); font-family: var(--font-mono);">${r.relationship}</div>
                </div>
                <span class="badge" style="background: #E2E8F0; font-size: 9.5px;">${r.target_type}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Associated Records Table -->
      <div>
        <div class="section-header">
          <div>
            <h3 class="section-title">Crime Incident Records Mentioning Entity (${records.length})</h3>
            <div class="section-subtitle">Full documentary records linking ${entity.label}</div>
          </div>
        </div>
        ${records.length > 0 ? `
          <div class="table-container">
            <table class="gov-table">
              <thead>
                <tr>
                  <th>Case Number</th>
                  <th>Date</th>
                  <th>Classification</th>
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
                      ${r.suspect_name ? `<a href="#entities/${encodeURIComponent(r.suspect_name)}">${r.suspect_name}</a>` : 'Unknown'}
                    </td>
                    <td>
                      ${r.vehicle_plate ? `<span class="badge badge-gold">${r.vehicle_plate}</span>` : '<span style="color:var(--color-text-muted);font-style:italic;">None</span>'}
                    </td>
                    <td>${r.block || 'N/A'}</td>
                    <td class="mono-code">D:${r.district || '-'} / B:${r.beat || '-'}</td>
                    <td>
                      <a href="#cases/${encodeURIComponent(r.case_number)}" class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 11px;">View Case</a>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="background: white; padding: 24px; text-align: center; border-radius: 4px; border: 1px solid var(--color-border-subtle); color: var(--color-text-muted); font-size: 13px;">
            No direct incident records recorded.
          </div>
        `}
      </div>
    `;

    // Render Canvas
    const canvasEl = container.querySelector('#entityGraphCanvas');
    if (canvasEl && entity.graph) {
      const gCanvas = new GraphCanvas(canvasEl, {
        onNodeSelect: (node) => {
          if (node.type === 'CASE') {
            window.location.hash = `#cases/${encodeURIComponent(node.id)}`;
          } else if (node.id !== entity.id) {
            window.location.hash = `#entities/${encodeURIComponent(node.id)}`;
          }
        }
      });
      gCanvas.setData(entity.graph);
      gCanvas.focusNode(entity.id);
    }
  } catch (err) {
    container.innerHTML = `<div style="color: var(--color-status-alert);">Error loading entity: ${err.message}</div>`;
  }
}
