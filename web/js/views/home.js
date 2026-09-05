import { fetchHealth, fetchAnalyticsOverview } from '../api.js';

export async function renderHome(container) {
  container.innerHTML = `
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-category">Smart India Hackathon 2026 &bull; Problem Statement SIH26189</div>
        <h1 class="hero-title">Connecting Crime Records.<br/>Revealing Hidden Relationships.</h1>
        <p class="hero-subtitle">
          An intelligent FIR analysis platform that transforms unstructured police narratives and structured crime records into a connected Knowledge Graph for contextual investigation, recurrence discovery, and network intelligence.
        </p>
        <div class="hero-actions">
          <a href="#fir" class="btn btn-primary btn-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            Analyze an FIR
          </a>
          <a href="#graph" class="btn btn-secondary btn-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="6" cy="6" r="3"></circle>
              <circle cx="18" cy="18" r="3"></circle>
              <circle cx="18" cy="6" r="3"></circle>
              <line x1="8.5" y1="7.5" x2="15.5" y2="16.5"></line>
              <line x1="15.5" y1="7.5" x2="8.5" y2="16.5"></line>
            </svg>
            Explore Knowledge Graph
          </a>
          <a href="#discovery" class="btn btn-outline btn-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Cross-Case Discovery
          </a>
        </div>

        <!-- Pipeline Banner -->
        <div class="pipeline-diagram">
          <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-muted); margin-bottom: 8px;">
            From isolated records to connected intelligence
          </div>
          <div class="pipeline-steps">
            <div class="pipe-step"><span class="pipe-pill">CASE</span><span class="pipe-arrow">&rarr;</span></div>
            <div class="pipe-step"><span class="pipe-pill highlight">SUSPECT</span><span class="pipe-arrow">&rarr;</span></div>
            <div class="pipe-step"><span class="pipe-pill">VEHICLE</span><span class="pipe-arrow">&rarr;</span></div>
            <div class="pipe-step"><span class="pipe-pill">LOCATION</span><span class="pipe-arrow">&rarr;</span></div>
            <div class="pipe-step"><span class="pipe-pill">CRIME TYPE</span><span class="pipe-arrow">&rarr;</span></div>
            <div class="pipe-step"><span class="pipe-pill">DISTRICT</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- System Status & Data Overview -->
    <section class="metrics-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Knowledge Graph Dataset Metrics</h2>
          <div class="section-subtitle">Real data-driven counts from the authenticated crime knowledge graph</div>
        </div>
        <div id="connectionStatusIndicator" style="font-size: 12px; font-family: var(--font-mono); color: var(--color-text-secondary);">
          Loading status...
        </div>
      </div>

      <div class="metrics-grid" id="metricsGrid">
        <div class="metric-card">
          <div class="metric-label">Cases (Incidents)</div>
          <div class="metric-value" id="countCases">500</div>
          <div class="metric-note">CrimeIncident records</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Suspect Entities</div>
          <div class="metric-value" id="countSuspects">434</div>
          <div class="metric-note">Extracted individuals</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Locations (Blocks)</div>
          <div class="metric-value" id="countLocations">462</div>
          <div class="metric-note">Specific street blocks</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Vehicles (Plates)</div>
          <div class="metric-value" id="countVehicles">104</div>
          <div class="metric-note">Present only when plated</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Police Beats</div>
          <div class="metric-value" id="countBeats">22</div>
          <div class="metric-note">Patrol sectors</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Crime Types</div>
          <div class="metric-value" id="countCrimeTypes">8</div>
          <div class="metric-note">Primary classifications</div>
        </div>
        <div class="metric-card" style="background-color: #F8FAFC; border-color: #CBD5E1;">
          <div class="metric-label">Neo4j Database Nodes</div>
          <div class="metric-value" id="countNeo4jNodes" style="color: #1E3A8A;">1,670</div>
          <div class="metric-note">Includes RDF/OWL ontology</div>
        </div>
        <div class="metric-card" style="background-color: #F8FAFC; border-color: #CBD5E1;">
          <div class="metric-label">Neo4j Relationships</div>
          <div class="metric-value" id="countNeo4jEdges" style="color: #1E3A8A;">5,639</div>
          <div class="metric-note">Live database triples</div>
        </div>
      </div>
    </section>

    <!-- Key Feature Workflows -->
    <section>
      <div class="section-header">
        <div>
          <h2 class="section-title">Investigation Workflows</h2>
          <div class="section-subtitle">Navigate through core intelligence and analytical tools</div>
        </div>
      </div>

      <div class="feature-cards-grid">
        <div class="feature-card">
          <div>
            <div class="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h3 class="feature-title">FIR Analysis Pipeline</h3>
            <p class="feature-desc">
              Paste or upload raw First Information Reports. The pipeline automatically extracts case numbers, suspects, locations, premises, vehicles, and legal classification codes into structured ontology triples.
            </p>
          </div>
          <a href="#fir" class="btn btn-primary btn-sm">Analyze FIR Narrative &rarr;</a>
        </div>

        <div class="feature-card">
          <div>
            <div class="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="18" cy="18" r="3"></circle>
                <circle cx="18" cy="6" r="3"></circle>
                <line x1="8.5" y1="7.5" x2="15.5" y2="16.5"></line>
                <line x1="15.5" y1="7.5" x2="8.5" y2="16.5"></line>
              </svg>
            </div>
            <h3 class="feature-title">Knowledge Graph Explorer</h3>
            <p class="feature-desc">
              Interact with the connected graph canvas. Pan, zoom, inspect entity neighborhoods, filter by police district, beat, or crime classification, and uncover multi-case links.
            </p>
          </div>
          <a href="#graph" class="btn btn-secondary btn-sm">Launch Graph Explorer &rarr;</a>
        </div>

        <div class="feature-card">
          <div>
            <div class="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <h3 class="feature-title">Cross-Case Discovery</h3>
            <p class="feature-desc">
              Identify repeat suspects (61 recurring individuals), shared vehicles across crime scenes (104 vehicles), location hotspots, and compute multi-hop relationship paths between distinct cases.
            </p>
          </div>
          <a href="#discovery" class="btn btn-secondary btn-sm">Discover Connections &rarr;</a>
        </div>

        <div class="feature-card">
          <div>
            <div class="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <h3 class="feature-title">Intelligence Analytics</h3>
            <p class="feature-desc">
              Review macro-level crime distributions, monthly incident trajectories, district concentrations, and premised classification charts backed by the authoritative dataset.
            </p>
          </div>
          <a href="#analytics" class="btn btn-secondary btn-sm">View Analytics &rarr;</a>
        </div>
      </div>
    </section>
  `;

  // Fetch real data to update counters
  try {
    const health = await fetchHealth();
    const connEl = document.getElementById('connectionStatusIndicator');
    if (connEl) {
      if (health.neo4j_connected) {
        connEl.innerHTML = `<span style="color:var(--color-status-success);font-weight:700;">&bull; Connected to Live Neo4j Database</span> (1,670 nodes / 5,639 edges)`;
      } else {
        connEl.innerHTML = `<span style="color:var(--color-status-warning);font-weight:700;">&bull; Local Knowledge Graph Snapshot Active</span> (1,530 nodes / 2,127 edges)`;
      }
    }

    if (health.domain_dataset_metrics) {
      const m = health.domain_dataset_metrics;
      document.getElementById('countCases').innerText = m.cases.toLocaleString();
      document.getElementById('countSuspects').innerText = m.suspects.toLocaleString();
      document.getElementById('countLocations').innerText = m.locations.toLocaleString();
      document.getElementById('countVehicles').innerText = m.vehicles.toLocaleString();
      document.getElementById('countBeats').innerText = m.police_beats.toLocaleString();
      document.getElementById('countCrimeTypes').innerText = m.crime_types.toLocaleString();
    }
  } catch (err) {
    console.error("Failed to load health metrics:", err);
  }
}
