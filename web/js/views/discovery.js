import {
  fetchRepeatSuspects,
  fetchVehicleConnections,
  fetchLocationConnections,
  fetchDistrictPatterns,
  findMultiHopPath,
  predictLink
} from '../api.js';

export async function renderDiscovery(container) {
  container.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h1 class="serif-text" style="font-size: 26px; color: var(--color-primary-navy);">Investigative Relationship Discovery</h1>
      <p style="font-size: 14px; color: var(--color-text-secondary);">
        Graph analytics for cross-case recurrence, multi-hop indirect paths, vehicle coordination, and link prediction.
      </p>
    </div>

    <!-- Sub-tab Navigation -->
    <div class="discovery-tabs-header">
      <button class="sub-tab-btn active" data-tab="repeat-suspects">Repeat Suspects (61)</button>
      <button class="sub-tab-btn" data-tab="vehicle-connections">Vehicle Cross-Links (104)</button>
      <button class="sub-tab-btn" data-tab="location-hotspots">Location Hotspots</button>
      <button class="sub-tab-btn" data-tab="district-patterns">District Patterns</button>
      <button class="sub-tab-btn" data-tab="multi-hop">Multi-Hop Pathfinder</button>
      <button class="sub-tab-btn" data-tab="link-prediction">ML Link Prediction</button>
    </div>

    <!-- Tab Content Panes -->
    <div id="discoveryTabContent">
      <div style="text-align: center; padding: 40px;">
        <div class="spinner" style="margin: 0 auto 12px;"></div>
        <p style="color: var(--color-text-muted); font-size: 13px;">Computing cross-case relationships...</p>
      </div>
    </div>
  `;

  const tabs = container.querySelectorAll('.sub-tab-btn');
  const contentEl = container.querySelector('#discoveryTabContent');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.getAttribute('data-tab');
      loadTabContent(tabName, contentEl);
    });
  });

  // Default tab
  await loadTabContent('repeat-suspects', contentEl);
}

async function loadTabContent(tabName, container) {
  container.innerHTML = `<div style="text-align: center; padding: 30px;"><div class="spinner" style="margin: 0 auto 10px;"></div></div>`;

  try {
    if (tabName === 'repeat-suspects') {
      const data = await fetchRepeatSuspects();
      const list = data.repeat_suspects || [];
      container.innerHTML = `
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 18px; color: var(--color-primary-navy);">Recurring Suspect Entities (${list.length})</h3>
          <p style="font-size: 13px; color: var(--color-text-secondary);">
            Identifies individuals appearing across multiple distinct CrimeIncident records in the dataset.
          </p>
        </div>
        <div class="cards-grid-discovery">
          ${list.map(s => `
            <div class="discovery-card">
              <div>
                <div class="discovery-card-header">
                  <div>
                    <span class="badge badge-teal">SUSPECT</span>
                    <h4 style="font-size: 17px; margin-top: 4px; color: var(--color-primary-navy);">${s.suspect_name}</h4>
                  </div>
                  <span class="badge badge-alert" style="font-size: 12px;">${s.incident_count} Incidents</span>
                </div>
                <div class="observation-callout">
                  ${s.observation} Connected cases: <strong>${s.case_numbers.join(', ')}</strong>
                </div>
                <div style="font-size: 12px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;">
                  <div><strong>Crime Classifications:</strong> ${s.crime_types.join(', ')}</div>
                  <div><strong>Districts:</strong> ${s.districts.map(d => `District ${d}`).join(', ')}</div>
                  <div><strong>Associated Vehicles:</strong> ${s.vehicles.length > 0 ? s.vehicles.map(v => `<span class="badge badge-gold">${v}</span>`).join(' ') : '<span style="color:var(--color-text-muted);font-style:italic;">None recorded</span>'}</div>
                </div>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 12px;">
                <a href="#entities/${encodeURIComponent(s.suspect_name)}" class="btn btn-primary btn-sm" style="flex:1;">Inspect Profile</a>
                <a href="#graph?q=${encodeURIComponent(s.suspect_name)}" class="btn btn-secondary btn-sm">Graph View</a>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (tabName === 'vehicle-connections') {
      const data = await fetchVehicleConnections();
      const list = data.vehicle_connections || [];
      container.innerHTML = `
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 18px; color: var(--color-primary-navy);">Vehicle Plate Connections (${list.length})</h3>
          <p style="font-size: 13px; color: var(--color-text-secondary);">
            Identifies vehicles linking multiple suspects or recurring across separate incidents.
          </p>
        </div>
        <div class="cards-grid-discovery">
          ${list.map(v => `
            <div class="discovery-card" style="${v.multi_suspect ? 'border-left: 4px solid var(--color-institutional-gold);' : ''}">
              <div>
                <div class="discovery-card-header">
                  <div>
                    <span class="badge badge-gold">VEHICLE PLATE</span>
                    <h4 class="mono-code" style="font-size: 18px; margin-top: 4px; color: var(--color-primary-navy);">${v.vehicle_plate}</h4>
                  </div>
                  <span class="badge ${v.multi_suspect ? 'badge-alert' : 'badge-blue'}">
                    ${v.suspect_count} Suspect(s) &bull; ${v.incident_count} Case(s)
                  </span>
                </div>
                <div class="observation-callout">
                  ${v.observation}
                </div>
                <div style="font-size: 12px; margin-bottom: 12px;">
                  <div style="margin-bottom: 4px;"><strong>Linked Suspects:</strong></div>
                  <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    ${v.suspects.map(s => `<a href="#entities/${encodeURIComponent(s)}" class="badge badge-teal">${s}</a>`).join('')}
                  </div>
                  <div style="margin-top: 8px;"><strong>Cases:</strong> <span class="mono-code">${v.case_numbers.join(', ')}</span></div>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <a href="#entities/${encodeURIComponent(v.vehicle_plate)}" class="btn btn-primary btn-sm" style="flex:1;">Inspect Vehicle</a>
                <a href="#graph?q=${encodeURIComponent(v.vehicle_plate)}" class="btn btn-secondary btn-sm">Graph View</a>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (tabName === 'location-hotspots') {
      const data = await fetchLocationConnections();
      const list = data.location_connections || [];
      container.innerHTML = `
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 18px; color: var(--color-primary-navy);">Recurring Location Hotspots (${list.length})</h3>
          <p style="font-size: 13px; color: var(--color-text-secondary);">
            Specific street blocks associated with 2 or more separate reported crime incidents.
          </p>
        </div>
        <div class="cards-grid-discovery">
          ${list.map(l => `
            <div class="discovery-card">
              <div>
                <div class="discovery-card-header">
                  <div>
                    <span class="badge" style="background:#F4E8EA; color: var(--node-location);">LOCATION BLOCK</span>
                    <h4 class="mono-code" style="font-size: 15px; margin-top: 4px; color: var(--color-primary-navy);">${l.block}</h4>
                  </div>
                  <span class="badge badge-alert">${l.incident_count} Crimes</span>
                </div>
                <div class="observation-callout">
                  ${l.observation}
                </div>
                <div style="font-size: 12px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;">
                  <div><strong>Crime Classifications:</strong> ${l.crime_types.join(', ')}</div>
                  <div><strong>Premise Types:</strong> ${l.premises.filter(p => p !== 'None').join(', ') || 'Unspecified'}</div>
                  <div><strong>Case Numbers:</strong> <span class="mono-code">${l.cases.join(', ')}</span></div>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <a href="#entities/${encodeURIComponent(l.block)}" class="btn btn-primary btn-sm" style="flex:1;">Inspect Block</a>
                <a href="#graph?q=${encodeURIComponent(l.block)}" class="btn btn-secondary btn-sm">Graph View</a>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (tabName === 'district-patterns') {
      const data = await fetchDistrictPatterns();
      const list = data.district_patterns || [];
      container.innerHTML = `
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 18px; color: var(--color-primary-navy);">District Jurisdictional Concentrations (${list.length} Districts)</h3>
          <p style="font-size: 13px; color: var(--color-text-secondary);">
            Crime volume, beat distribution, and predominant classifications per police district.
          </p>
        </div>
        <div class="table-container">
          <table class="gov-table">
            <thead>
              <tr>
                <th>District</th>
                <th>Total Incidents</th>
                <th>Active Police Beats</th>
                <th>Predominant Crime Classifications</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(d => `
                <tr>
                  <td class="mono-code" style="font-weight:700; color: var(--color-primary-navy);">District ${d.district}</td>
                  <td><strong>${d.incident_count}</strong> cases</td>
                  <td>${d.beat_count} beats (<span class="mono-code">${d.beats.join(', ')}</span>)</td>
                  <td>
                    ${d.top_crimes.map(c => `<span class="badge badge-blue" style="margin-right:4px;">${c.type}: ${c.count}</span>`).join('')}
                  </td>
                  <td>
                    <a href="#graph?district=${encodeURIComponent(d.district)}" class="btn btn-secondary btn-sm">Filter Graph</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (tabName === 'multi-hop') {
      container.innerHTML = `
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 18px; color: var(--color-primary-navy);">Multi-Hop Indirect Relationship Finder</h3>
          <p style="font-size: 13px; color: var(--color-text-secondary);">
            Discover indirect paths linking any two suspects, vehicles, cases, or locations across the Knowledge Graph.
          </p>
        </div>

        <div class="pathfinder-form">
          <div class="control-group">
            <label class="control-label">Source Entity ID</label>
            <input type="text" id="pathStartInput" class="control-input" placeholder="e.g. Deandre Allen or JC100113" value="Deandre Allen" />
          </div>
          <div class="control-group">
            <label class="control-label">Target Entity ID</label>
            <input type="text" id="pathEndInput" class="control-input" placeholder="e.g. Tyler Wilson or IL-2133-ZN" value="Tyler Wilson" />
          </div>
          <div class="control-group">
            <label class="control-label">Max Depth</label>
            <select id="pathDepthSelect" class="control-select">
              <option value="2">2 Hops</option>
              <option value="4" selected>4 Hops</option>
              <option value="6">6 Hops</option>
            </select>
          </div>
          <button class="btn btn-primary" id="runPathfinderBtn">Trace Graph Path</button>
        </div>

        <div id="pathResultsArea"></div>
      `;

      const startInput = container.querySelector('#pathStartInput');
      const endInput = container.querySelector('#pathEndInput');
      const depthSelect = container.querySelector('#pathDepthSelect');
      const runBtn = container.querySelector('#runPathfinderBtn');
      const resultsArea = container.querySelector('#pathResultsArea');

      runBtn.addEventListener('click', async () => {
        const start = startInput.value.trim();
        const end = endInput.value.trim();
        const depth = parseInt(depthSelect.value, 10) || 4;

        if (!start || !end) {
          alert("Please specify both source and target entity IDs.");
          return;
        }

        resultsArea.innerHTML = `<div style="text-align: center; padding: 20px;"><div class="spinner" style="margin: 0 auto 8px;"></div>Tracing graph paths...</div>`;

        try {
          const pathRes = await findMultiHopPath(start, end, depth);
          if (pathRes.found && pathRes.path.length > 0) {
            resultsArea.innerHTML = `
              <div style="background-color: var(--color-bg-white); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: 20px;">
                <div style="margin-bottom: 14px; font-weight: 700; color: var(--color-primary-navy);">
                  &bull; Indirect Relationship Path (${pathRes.length} hops):
                </div>
                <div class="path-chain-view">
                  ${pathRes.path.map((step, idx) => `
                    <div class="path-step-node">
                      <span class="badge" style="font-size: 10px;">${step.type}</span>
                      <div style="font-weight: 700; font-size: 13px; margin-top: 4px;">
                        <a href="#entities/${encodeURIComponent(step.node_id)}">${step.label}</a>
                      </div>
                    </div>
                    ${idx < pathRes.path.length - 1 ? `
                      <div class="path-step-rel">
                        <span>&rarr;</span>
                        <span>${pathRes.path[idx + 1].via_relationship || 'CONNECTED'}</span>
                        <span>&rarr;</span>
                      </div>
                    ` : ''}
                  `).join('')}
                </div>
                <div class="observation-callout" style="margin-top: 16px;">
                  ${pathRes.observation}
                </div>
              </div>
            `;
          } else {
            resultsArea.innerHTML = `
              <div style="background-color: var(--color-bg-white); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: 24px; text-align: center; color: var(--color-text-muted);">
                ${pathRes.observation || 'No connected relationship path discovered between the selected entities within specified depth.'}
              </div>
            `;
          }
        } catch (err) {
          resultsArea.innerHTML = `<div style="color: var(--color-status-alert);">Path query failed: ${err.message}</div>`;
        }
      });

    } else if (tabName === 'link-prediction') {
      container.innerHTML = `
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 18px; color: var(--color-primary-navy);">Machine Learning Graph Link Prediction</h3>
          <p style="font-size: 13px; color: var(--color-text-secondary);">
            Computes candidate relationship likelihood based on the 20 pair-level topological graph features (Degree, Common Neighbors, Jaccard, Adamic-Adar, Resource Allocation).
          </p>
        </div>

        <div class="pathfinder-form" style="grid-template-columns: 1fr 1fr 180px auto;">
          <div class="control-group">
            <label class="control-label">Entity A (Source)</label>
            <input type="text" id="mlSourceInput" class="control-input" value="JC100113" />
          </div>
          <div class="control-group">
            <label class="control-label">Entity B (Target)</label>
            <input type="text" id="mlTargetInput" class="control-input" value="4700XX S STATE ST" />
          </div>
          <div class="control-group">
            <label class="control-label">Candidate Relation</label>
            <select id="mlRelSelect" class="control-select">
              <option value="OCCURRED_AT" selected>OCCURRED_AT</option>
              <option value="PERPETRATED_BY">PERPETRATED_BY</option>
              <option value="OFFENSE_TYPE">OFFENSE_TYPE</option>
              <option value="OCCURRED_IN_BEAT">OCCURRED_IN_BEAT</option>
              <option value="DRIVES_VEHICLE">DRIVES_VEHICLE</option>
            </select>
          </div>
          <button class="btn btn-primary" id="runMlPredictBtn">Compute Link Score</button>
        </div>

        <div id="mlPredictionResults"></div>

        <div class="observation-callout" style="margin-top: 24px;">
          <strong>Model Performance Context:</strong> Logistic Regression link prediction was evaluated on 426 positive + 426 negative held-out test pairs from an older 2,127-edge snapshot (Accuracy: 73.71%, ROC-AUC: 81.41%, Best Relationship F1: OCCURRED_AT 88.26%). Metrics reflect research prototype evaluation.
        </div>
      `;

      const srcInput = container.querySelector('#mlSourceInput');
      const tgtInput = container.querySelector('#mlTargetInput');
      const relSelect = container.querySelector('#mlRelSelect');
      const runBtn = container.querySelector('#runMlPredictBtn');
      const resArea = container.querySelector('#mlPredictionResults');

      runBtn.addEventListener('click', async () => {
        const src = srcInput.value.trim();
        const tgt = tgtInput.value.trim();
        const rel = relSelect.value;

        if (!src || !tgt) {
          alert("Please enter both source and target entities.");
          return;
        }

        resArea.innerHTML = `<div style="text-align: center; padding: 20px;"><div class="spinner" style="margin: 0 auto 8px;"></div>Evaluating graph link features...</div>`;

        try {
          const pred = await predictLink(src, tgt, rel);
          if (pred.error) {
            resArea.innerHTML = `<div style="color: var(--color-status-alert); padding: 16px; background: var(--color-status-alert-bg); border-radius: 4px;">${pred.error}</div>`;
            return;
          }

          const feat = pred.graph_features || {};
          const pct = Math.round(pred.predicted_link_score * 100);

          resArea.innerHTML = `
            <div style="background-color: var(--color-bg-white); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: 24px; box-shadow: var(--shadow-sm);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 12px;">
                <div>
                  <span class="badge badge-gold">Candidate Relationship Prediction</span>
                  <h4 style="font-size: 19px; color: var(--color-primary-navy); margin-top: 4px;">
                    ${pred.source_label} <span style="color: var(--color-primary-blue);">&rarr; ${pred.relationship} &rarr;</span> ${pred.target_label}
                  </h4>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--color-text-muted);">Analytical Link Score</div>
                  <div style="font-size: 28px; font-weight: 700; color: ${pct > 60 ? 'var(--color-status-warning)' : 'var(--color-primary-navy)'}; font-family: var(--font-heading);">
                    ${pct}%
                  </div>
                </div>
              </div>

              <!-- Feature Breakdown Grid -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div style="background: var(--color-bg-warm); padding: 10px; border-radius: 4px;">
                  <div style="font-size: 10.5px; color: var(--color-text-muted);">Common Neighbors</div>
                  <div style="font-size: 16px; font-weight: 700;">${feat.common_neighbors_count || 0}</div>
                </div>
                <div style="background: var(--color-bg-warm); padding: 10px; border-radius: 4px;">
                  <div style="font-size: 10.5px; color: var(--color-text-muted);">Jaccard Similarity</div>
                  <div style="font-size: 16px; font-weight: 700; font-family: var(--font-mono);">${feat.jaccard_similarity || 0}</div>
                </div>
                <div style="background: var(--color-bg-warm); padding: 10px; border-radius: 4px;">
                  <div style="font-size: 10.5px; color: var(--color-text-muted);">Adamic-Adar Index</div>
                  <div style="font-size: 16px; font-weight: 700; font-family: var(--font-mono);">${feat.adamic_adar_index || 0}</div>
                </div>
                <div style="background: var(--color-bg-warm); padding: 10px; border-radius: 4px;">
                  <div style="font-size: 10.5px; color: var(--color-text-muted);">Resource Allocation</div>
                  <div style="font-size: 16px; font-weight: 700; font-family: var(--font-mono);">${feat.resource_allocation || 0}</div>
                </div>
              </div>

              <!-- Legal Disclaimer Box -->
              <div style="background-color: var(--color-status-warning-bg); border-left: 3px solid var(--color-status-warning); padding: 10px 14px; font-size: 12px; color: #8C590E;">
                <strong>Mandatory Legal Notice:</strong> ${pred.disclaimer}
              </div>
            </div>
          `;
        } catch (err) {
          resArea.innerHTML = `<div style="color: var(--color-status-alert);">Link prediction failed: ${err.message}</div>`;
        }
      });
    }
  } catch (err) {
    container.innerHTML = `<div style="color: var(--color-status-alert);">Failed to load tab data: ${err.message}</div>`;
  }
}
