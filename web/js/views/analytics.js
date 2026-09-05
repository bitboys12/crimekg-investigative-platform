import { fetchAnalyticsOverview } from '../api.js';

export async function renderAnalytics(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <div class="spinner" style="margin: 0 auto 12px;"></div>
      <p style="color: var(--color-text-secondary); font-size: 13.5px;">Compiling Crime Intelligence Overview...</p>
    </div>
  `;

  try {
    const data = await fetchAnalyticsOverview();

    const maxCrime = Math.max(...(data.crime_type_distribution || []).map(d => d.count), 1);
    const maxDistrict = Math.max(...(data.district_distribution || []).map(d => d.count), 1);
    const maxPremise = Math.max(...(data.top_premises || []).map(d => d.count), 1);
    const maxMonth = Math.max(...(data.monthly_distribution || []).map(d => d.count), 1);

    container.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h1 class="serif-text" style="font-size: 26px; color: var(--color-primary-navy);">Crime Intelligence Overview</h1>
        <p style="font-size: 14px; color: var(--color-text-secondary);">
          Aggregate cross-case patterns, jurisdictional concentrations, and Knowledge Graph structural metrics.
        </p>
      </div>

      <!-- Macro Summary Cards -->
      <div class="metrics-grid" style="margin-bottom: 28px;">
        <div class="metric-card">
          <div class="metric-label">Total Crime Incidents</div>
          <div class="metric-value">${data.total_incidents}</div>
          <div class="metric-note">Documented cases</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Repeat Suspects</div>
          <div class="metric-value" style="color: var(--color-status-warning);">${data.repeat_suspects_count}</div>
          <div class="metric-note">Appear in &ge;2 records</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Vehicle Plated Entities</div>
          <div class="metric-value">${data.total_vehicles}</div>
          <div class="metric-note">${data.shared_vehicles_count} cross-suspect linked</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Location Hotspots</div>
          <div class="metric-value">${data.repeat_locations_count}</div>
          <div class="metric-note">Blocks with &ge;2 crimes</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Arrests Effected</div>
          <div class="metric-value" style="color: var(--color-status-success);">${data.arrest_count}</div>
          <div class="metric-note">${Math.round((data.arrest_count / data.total_incidents) * 100)}% clearance rate</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Domestic Disputes</div>
          <div class="metric-value">${data.domestic_count}</div>
          <div class="metric-note">Domestic dispute flagged</div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="analytics-grid">
        <!-- 1. Crime Type Breakdown -->
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">Primary Crime Classification Distribution</h3>
            <span style="font-size: 11px; font-family: var(--font-mono); color: var(--color-text-muted);">8 Types</span>
          </div>
          <div>
            ${(data.crime_type_distribution || []).map(item => {
              const pct = Math.round((item.count / maxCrime) * 100);
              return `
                <div class="bar-chart-row">
                  <div class="bar-label">${item.type}</div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width: ${pct}%; background-color: var(--node-crimetype);"></div>
                  </div>
                  <div class="bar-val">${item.count}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 2. Top Premise Types -->
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">Incidents by Premise Type</h3>
            <span style="font-size: 11px; font-family: var(--font-mono); color: var(--color-text-muted);">Top Premises</span>
          </div>
          <div>
            ${(data.top_premises || []).map(item => {
              const pct = Math.round((item.count / maxPremise) * 100);
              return `
                <div class="bar-chart-row">
                  <div class="bar-label">${item.premise || 'Unspecified'}</div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width: ${pct}%; background-color: var(--node-location);"></div>
                  </div>
                  <div class="bar-val">${item.count}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 3. District Distribution -->
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">Crime Volume by Police District</h3>
            <span style="font-size: 11px; font-family: var(--font-mono); color: var(--color-text-muted);">22 Districts</span>
          </div>
          <div style="max-height: 280px; overflow-y: auto; padding-right: 6px;">
            ${(data.district_distribution || []).map(item => {
              const pct = Math.round((item.count / maxDistrict) * 100);
              return `
                <div class="bar-chart-row">
                  <div class="bar-label mono-code">${item.district}</div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width: ${pct}%; background-color: var(--node-case);"></div>
                  </div>
                  <div class="bar-val">${item.count}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 4. Monthly Trajectory Timeline -->
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">Monthly Crime Incident Timeline</h3>
            <span style="font-size: 11px; font-family: var(--font-mono); color: var(--color-text-muted);">2026 Trend</span>
          </div>
          <div>
            ${(data.monthly_distribution || []).map(item => {
              const pct = Math.round((item.count / maxMonth) * 100);
              return `
                <div class="bar-chart-row">
                  <div class="bar-label mono-code">${item.month}</div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width: ${pct}%; background-color: var(--color-muted-teal);"></div>
                  </div>
                  <div class="bar-val">${item.count}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Legal Disclaimer -->
      <div class="observation-callout">
        <strong>Investigative Notice:</strong> The statistical distributions and metrics above reflect data recorded within the current 500-incident crime Knowledge Graph dataset.
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: var(--color-status-alert);">Failed to load analytics dashboard: ${err.message}</div>`;
  }
}
