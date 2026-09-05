/**
 * REST API client for Crime Knowledge Graph Backend
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSampleFirs() {
  const res = await fetch(`${API_BASE}/sample-firs`);
  if (!res.ok) throw new Error(`Failed to load sample FIRs: ${res.statusText}`);
  return res.json();
}

export async function analyzeFir(firText) {
  const res = await fetch(`${API_BASE}/fir/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: firText })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `FIR analysis failed: ${res.statusText}`);
  }
  return res.json();
}

export async function searchEntities(query) {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
  return res.json();
}

export async function fetchCase(caseNumber) {
  const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseNumber)}`);
  if (!res.ok) throw new Error(`Failed to retrieve case: ${res.statusText}`);
  return res.json();
}

export async function fetchEntity(entityId) {
  const res = await fetch(`${API_BASE}/entities/${encodeURIComponent(entityId)}`);
  if (!res.ok) throw new Error(`Failed to retrieve entity: ${res.statusText}`);
  return res.json();
}

export async function fetchEntityGraph(entityId, depth = 1) {
  const res = await fetch(`${API_BASE}/entities/${encodeURIComponent(entityId)}/graph?depth=${depth}`);
  if (!res.ok) throw new Error(`Failed to retrieve entity graph: ${res.statusText}`);
  return res.json();
}

export async function fetchFilteredGraph(params = {}) {
  const q = new URLSearchParams();
  if (params.types && params.types.length) {
    params.types.forEach(t => q.append('type', t));
  }
  if (params.crimeTypes && params.crimeTypes.length) {
    params.crimeTypes.forEach(ct => q.append('crime_type', ct));
  }
  if (params.districts && params.districts.length) {
    params.districts.forEach(d => q.append('district', d));
  }
  if (params.query) {
    q.append('q', params.query);
  }
  if (params.limit) {
    q.append('limit', params.limit);
  }

  const res = await fetch(`${API_BASE}/graph?${q.toString()}`);
  if (!res.ok) throw new Error(`Failed to load graph: ${res.statusText}`);
  return res.json();
}

export async function fetchAnalyticsOverview() {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error(`Failed to retrieve analytics: ${res.statusText}`);
  return res.json();
}

export async function fetchRepeatSuspects() {
  const res = await fetch(`${API_BASE}/analysis/repeat-suspects`);
  if (!res.ok) throw new Error(`Failed to load repeat suspects: ${res.statusText}`);
  return res.json();
}

export async function fetchVehicleConnections() {
  const res = await fetch(`${API_BASE}/analysis/vehicle-connections`);
  if (!res.ok) throw new Error(`Failed to load vehicle connections: ${res.statusText}`);
  return res.json();
}

export async function fetchLocationConnections() {
  const res = await fetch(`${API_BASE}/analysis/location-connections`);
  if (!res.ok) throw new Error(`Failed to load location connections: ${res.statusText}`);
  return res.json();
}

export async function fetchDistrictPatterns() {
  const res = await fetch(`${API_BASE}/analysis/district-patterns`);
  if (!res.ok) throw new Error(`Failed to load district patterns: ${res.statusText}`);
  return res.json();
}

export async function findMultiHopPath(startId, endId, depth = 4) {
  const res = await fetch(`${API_BASE}/analysis/multi-hop?start=${encodeURIComponent(startId)}&end=${encodeURIComponent(endId)}&depth=${depth}`);
  if (!res.ok) throw new Error(`Pathfinder query failed: ${res.statusText}`);
  return res.json();
}

export async function predictLink(sourceId, targetId, relationship = 'OCCURRED_AT') {
  const res = await fetch(`${API_BASE}/ml/link-prediction?source=${encodeURIComponent(sourceId)}&target=${encodeURIComponent(targetId)}&rel=${encodeURIComponent(relationship)}`);
  if (!res.ok) throw new Error(`Prediction query failed: ${res.statusText}`);
  return res.json();
}

export async function fetchMlMetrics() {
  const res = await fetch(`${API_BASE}/ml/metrics`);
  if (!res.ok) throw new Error(`Failed to fetch ML metrics: ${res.statusText}`);
  return res.json();
}
