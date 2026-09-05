import { fetchCase } from '../api.js';
import { GraphCanvas } from '../graph-canvas.js';

export async function renderCaseDetail(container, caseNumber) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <div class="spinner" style="margin: 0 auto 12px;"></div>
      <p style="color: var(--color-text-secondary); font-size: 13.5px;">Retrieving Case #${caseNumber} dossier and graph context...</p>
    </div>
  `;

  try {
    const c = await fetchCase(caseNumber);
    if (!c) {
      container.innerHTML = `
        <div style="background: white; padding: 40px; text-align: center; border-radius: 6px; border: 1px solid var(--color-border-subtle);">
          <h2 style="color: var(--color-status-alert);">Case #${caseNumber} Not Found</h2>
          <p style="margin: 12px 0 20px; color: var(--color-text-secondary);">The requested case number is not recorded in the available crime records.</p>
          <a href="#graph" class="btn btn-primary">Return to Knowledge Graph</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-muted);">
            Crime Incident Record
          </div>
          <h1 class="serif-text" style="font-size: 28px; color: var(--color-primary-navy);">Case #${c.case_number}</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <a href="#graph?q=${encodeURIComponent(c.case_number)}" class="btn btn-secondary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Explore in Full Graph
          </a>
          <button class="btn btn-primary btn-sm" onclick="window.print()">Print Dossier</button>
        </div>
      </div>

      <div class="dossier-sections-grid">
        <!-- 1. Incident Details -->
        <div class="dossier-section">
          <div class="dossier-section-title">Incident Particulars</div>
          <div class="field-pair"><span class="field-label">Date & Time</span><span class="field-value mono">${c.date || 'N/A'}</span></div>
          <div class="field-pair"><span class="field-label">Crime Classification</span><span class="field-value"><span class="badge badge-blue">${c.primary_type}</span></span></div>
          <div class="field-pair"><span class="field-label">Offense Subtype</span><span class="field-value">${c.description || 'N/A'}</span></div>
          <div class="field-pair"><span class="field-label">IUCR Code</span><span class="field-value mono">${c.iucr || 'N/A'}</span></div>
          <div class="field-pair"><span class="field-label">FBI Code</span><span class="field-value mono">${c.fbi_code || 'N/A'}</span></div>
          <div class="field-pair"><span class="field-label">Arrest Made</span><span class="field-value">${c.arrest ? '<span class="badge badge-success">YES</span>' : '<span class="badge" style="background:#E2E8F0;">NO</span>'}</span></div>
          <div class="field-pair"><span class="field-label">Domestic Dispute</span><span class="field-value">${c.domestic ? '<span class="badge badge-warning">YES</span>' : 'NO'}</span></div>
        </div>

        <!-- 2. Involved Entities -->
        <div class="dossier-section">
          <div class="dossier-section-title">Associated Entities</div>
          <div class="field-pair">
            <span class="field-label">Suspect Entity</span>
            <span class="field-value">
              ${c.suspect_name ? `<a href="#entities/${encodeURIComponent(c.suspect_name)}" style="color: var(--color-muted-teal); font-weight: 700;">${c.suspect_name}</a>` : '<span class="missing">Unknown in report</span>'}
            </span>
          </div>
          <div class="field-pair">
            <span class="field-label">Vehicle Plate</span>
            <span class="field-value">
              ${c.vehicle_plate ? `<a href="#entities/${encodeURIComponent(c.vehicle_plate)}" class="badge badge-gold">${c.vehicle_plate}</a>` : '<span class="missing" title="Intentional missing value preserved">Not available in submitted record</span>'}
            </span>
          </div>
          <div class="field-pair"><span class="field-label">Location Block</span><span class="field-value mono">${c.block || 'N/A'}</span></div>
          <div class="field-pair"><span class="field-label">Premise Type</span><span class="field-value">${c.location_description || 'N/A'}</span></div>
        </div>

        <!-- 3. Jurisdiction -->
        <div class="dossier-section">
          <div class="dossier-section-title">Jurisdiction</div>
          <div class="field-pair"><span class="field-label">Police District</span><span class="field-value mono">${c.district ? `District ${c.district}` : 'N/A'}</span></div>
          <div class="field-pair"><span class="field-label">Police Beat</span><span class="field-value mono">${c.beat ? `Beat ${c.beat}` : 'N/A'}</span></div>
          <div class="field-pair"><span class="field-label">Ward</span><span class="field-value mono">${c.ward ? `Ward ${c.ward}` : 'N/A'}</span></div>
          <div class="field-pair"><span class="field-label">Community Area</span><span class="field-value mono">${c.community_area ? `Area ${c.community_area}` : 'N/A'}</span></div>
        </div>
      </div>

      <!-- Focused Graph Canvas centered on this case -->
      <div style="margin-bottom: 28px;">
        <div class="section-header">
          <div>
            <h3 class="section-title">Focused Knowledge Graph Subgraph</h3>
            <div class="section-subtitle">Local 1-hop semantic relationships centered around Case #${c.case_number}</div>
          </div>
        </div>
        <div class="graph-canvas-container" style="height: 420px; min-height: 420px;">
          <canvas id="caseGraphCanvas" class="interactive-canvas" style="min-height: 420px;"></canvas>
          <div class="graph-legend-overlay">
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-case);"></span> Case</div>
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-suspect);"></span> Suspect</div>
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-vehicle);"></span> Vehicle</div>
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-location);"></span> Location</div>
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-crimetype);"></span> Crime Type</div>
            <div class="legend-item"><span class="legend-swatch" style="background: var(--node-beat);"></span> Police Beat</div>
          </div>
        </div>
      </div>

      <!-- Connected Cases through shared entities -->
      <div>
        <div class="section-header">
          <div>
            <h3 class="section-title">Cross-Connected Crime Incidents (${(c.connected_records || []).length})</h3>
            <div class="section-subtitle">Cases sharing common suspects, vehicles, or location blocks</div>
          </div>
        </div>
        ${(c.connected_records || []).length > 0 ? `
          <div class="table-container">
            <table class="gov-table">
              <thead>
                <tr>
                  <th>Case Number</th>
                  <th>Date</th>
                  <th>Classification</th>
                  <th>Suspect</th>
                  <th>Vehicle Plate</th>
                  <th>Location</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${c.connected_records.map(r => `
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
            No direct cross-case linkages detected in current dataset for this incident.
          </div>
        `}
      </div>

      <!-- Legal Notice -->
      <div class="observation-callout" style="margin-top: 24px;">
        <strong>Investigative Notice:</strong> The connections presented above are analytical associations derived from documented crime records and Knowledge Graph relationships. They do not constitute a legal determination of guilt.
      </div>
    `;

    // Mount canvas
    const canvasEl = container.querySelector('#caseGraphCanvas');
    if (canvasEl && c.graph) {
      const gCanvas = new GraphCanvas(canvasEl, {
        onNodeSelect: (node) => {
          if (node.type === 'CASE' && node.id !== c.case_number) {
            window.location.hash = `#cases/${encodeURIComponent(node.id)}`;
          } else if (node.type !== 'CASE') {
            window.location.hash = `#entities/${encodeURIComponent(node.id)}`;
          }
        }
      });
      gCanvas.setData(c.graph);
      gCanvas.focusNode(c.case_number);
    }
  } catch (err) {
    container.innerHTML = `<div style="color: var(--color-status-alert);">Error loading case: ${err.message}</div>`;
  }
}
