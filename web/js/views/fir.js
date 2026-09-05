import { analyzeFir, fetchSampleFirs } from '../api.js';

export async function renderFir(container) {
  container.innerHTML = `
    <div class="fir-container">
      <div class="fir-input-card">
        <div style="margin-bottom: 18px;">
          <h1 class="serif-text" style="font-size: 26px; color: var(--color-primary-navy);">FIR Analysis</h1>
          <p style="font-size: 14px; color: var(--color-text-secondary);">Extract structured intelligence and semantic triples from an unstructured police report narrative.</p>
        </div>

        <div class="sample-selector-bar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--color-text-secondary);">Load Verified Sample FIR:</span>
            <div class="fir-sample-pills" id="samplePillsContainer">
              <button class="fir-pill-btn" data-index="0">JC100113 (Armed Robbery + Vehicle)</button>
              <button class="fir-pill-btn" data-index="1">JC100226 (Theft + State St)</button>
              <button class="fir-pill-btn" data-index="2">JC100339 (Robbery, No Vehicle)</button>
              <button class="fir-pill-btn" data-index="3">JC100791 (Battery + Arrest Made)</button>
            </div>
          </div>
          <div>
            <label class="btn btn-secondary btn-sm" style="cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Text File
              <input type="file" id="firFileInput" accept=".txt,.text,.json" style="display: none;" />
            </label>
          </div>
        </div>

        <textarea 
          id="firTextInput" 
          class="fir-textarea" 
          placeholder="Paste unstructured FIR narrative text here (e.g., 'On 06/04/2026 at approximately 09:27 hours, responding officers documented Case Number JC100113. An incident of ROBBERY involving ARMED: HANDGUN was reported at 0100XX W FULLERTON AVE...')"
        ></textarea>

        <div class="fir-form-actions">
          <button class="btn btn-secondary btn-sm" id="clearFirBtn">Clear Input</button>
          <button class="btn btn-primary btn-lg" id="submitFirBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Analyze FIR
          </button>
        </div>
      </div>

      <!-- Stepped Processing Progress (Hidden by default) -->
      <div class="processing-steps-card" id="processingCard" style="display: none;">
        <h4 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-primary-navy); margin-bottom: 14px;">
          Processing Extraction Pipeline
        </h4>
        <ul class="steps-list" id="stepsList">
          <li class="step-item" id="stepDoc"><span class="step-indicator"></span> Document received & validated</li>
          <li class="step-item" id="stepNer"><span class="step-indicator"></span> Extracting named entities & identifiers</li>
          <li class="step-item" id="stepRel"><span class="step-indicator"></span> Identifying semantic relationships</li>
          <li class="step-item" id="stepOnt"><span class="step-indicator"></span> Mapping entities to 13-class Stanford Protégé Ontology</li>
          <li class="step-item" id="stepKg"><span class="step-indicator"></span> Querying Knowledge Graph for cross-case recurrence</li>
          <li class="step-item" id="stepDone"><span class="step-indicator"></span> Extraction & analytical indexing complete</li>
        </ul>
      </div>

      <!-- Structured Results Dossier Container -->
      <div id="extractionResultsContainer"></div>
    </div>
  `;

  const firTextInput = document.getElementById('firTextInput');
  const samplePills = document.querySelectorAll('.fir-pill-btn');
  const fileInput = document.getElementById('firFileInput');
  const submitBtn = document.getElementById('submitFirBtn');
  const clearBtn = document.getElementById('clearFirBtn');
  const processingCard = document.getElementById('processingCard');
  const resultsContainer = document.getElementById('extractionResultsContainer');

  const DEFAULT_SAMPLES = [
    "On 06/04/2026 at approximately 09:27 hours, responding officers documented Case Number JC100113. An incident of ROBBERY involving ARMED: HANDGUN was reported at 0100XX W FULLERTON AVE, situated within Chicago Police Department District 014, Beat 1431, Ward 32, Community Area 22. The offense occurred on/at a SIDEWALK. The suspect was identified as James Bennett, who fled the vicinity in a vehicle bearing license plate IL-391-9281. The primary statutory classification corresponds to IUCR code 031A (Robbery - Armed: Handgun) under FBI Code 03. No immediate arrest was made on scene. Domestic dispute: NO.",
    "On 05/18/2026 at approximately 14:15 hours, responding officers documented Case Number JC100226. An incident of THEFT involving $500 AND UNDER was reported at 0020XX N STATE ST, situated within Chicago Police Department District 018, Beat 1833, Ward 42, Community Area 8. The offense occurred on/at a DEPARTMENT STORE. The suspect was identified as Marcus Reynolds. The primary statutory classification corresponds to IUCR code 0820 under FBI Code 06. No immediate arrest was made on scene. Domestic dispute: NO.",
    "On 04/22/2026 at approximately 21:40 hours, responding officers documented Case Number JC100339. An incident of ROBBERY involving STRONGARM - NO WEAPON was reported at 0070XX S CICERO AVE, situated within Chicago Police Department District 008, Beat 0834, Ward 13, Community Area 65. The offense occurred on/at a PARKING LOT / GARAGE(NON.RESID.). The suspect was identified as Travis Washington. The primary statutory classification corresponds to IUCR code 0320 under FBI Code 03. No immediate arrest was made on scene. Domestic dispute: NO.",
    "On 03/11/2026 at approximately 18:05 hours, responding officers documented Case Number JC100791. An incident of BATTERY involving DOMESTIC BATTERY SIMPLE was reported at 0340XX W MADISON ST, situated within Chicago Police Department District 011, Beat 1124, Ward 28, Community Area 26. The offense occurred in an APARTMENT. The suspect was identified as Devon Vance. The primary statutory classification corresponds to IUCR code 0486 under FBI Code 08B. ARREST MADE on scene. Domestic dispute: YES."
  ];

  // Initialize samples immediately from client cache for zero latency
  let samples = [...DEFAULT_SAMPLES];
  firTextInput.value = samples[0];

  // Refresh samples from backend asynchronously if available
  fetchSampleFirs().then(data => {
    if (data && data.sample_firs && data.sample_firs.length > 0) {
      samples = data.sample_firs;
    }
  }).catch(e => console.warn("Using default FIR samples:", e));

  samplePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const idx = parseInt(pill.getAttribute('data-index'), 10);
      if (samples[idx]) {
        firTextInput.value = samples[idx];
        firTextInput.focus();
      }
    });
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        firTextInput.value = event.target.result;
      };
      reader.readAsText(file);
    }
  });

  clearBtn.addEventListener('click', () => {
    firTextInput.value = '';
    resultsContainer.innerHTML = '';
    processingCard.style.display = 'none';
  });

  submitBtn.addEventListener('click', async () => {
    const text = firTextInput.value.trim();
    if (!text) {
      alert("Please enter or load FIR narrative text to analyze.");
      return;
    }

    // Start Step Animation immediately
    processingCard.style.display = 'block';
    resultsContainer.innerHTML = '';
    submitBtn.disabled = true;

    const stepIds = ['stepDoc', 'stepNer', 'stepRel', 'stepOnt', 'stepKg', 'stepDone'];
    stepIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'step-item';
    });

    const setStep = (id, state) => {
      const el = document.getElementById(id);
      if (el) el.className = `step-item ${state}`;
    };

    setStep('stepDoc', 'done');
    setStep('stepNer', 'active');

    try {
      // Execute analysis without artificial sleeping
      const resultPromise = analyzeFir(text);
      
      setStep('stepNer', 'done');
      setStep('stepRel', 'active');
      await new Promise(r => setTimeout(r, 40));
      setStep('stepRel', 'done');
      setStep('stepOnt', 'active');
      await new Promise(r => setTimeout(r, 40));
      setStep('stepOnt', 'done');
      setStep('stepKg', 'active');

      const result = await resultPromise;

      setStep('stepKg', 'done');
      setStep('stepDone', 'done');

      renderStructuredDossier(resultsContainer, result);
    } catch (err) {
      setStep('stepOnt', 'active');
      resultsContainer.innerHTML = `
        <div style="background-color: var(--color-status-alert-bg); border: 1px solid var(--color-status-alert); padding: 16px; border-radius: 4px; color: var(--color-status-alert);">
          <strong>Analysis could not be completed:</strong> ${err.message}
          <div style="margin-top: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('submitFirBtn').click()">Try again</button>
          </div>
        </div>
      `;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function renderStructuredDossier(container, res) {
  const isVehicleMissing = !res.vehicle_plate;
  const graphMatches = res.graph_matches || {};
  const hasHistory = graphMatches.connected_case_count > 0;

  container.innerHTML = `
    <div class="extraction-results-card">
      <div class="dossier-header">
        <div class="dossier-title-block">
          <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--color-text-secondary); margin-bottom: 4px;">
            Structured Intelligence Dossier
          </div>
          <h3>Case #${res.case_number || 'UNKNOWN'} &bull; ${res.primary_type || 'INCIDENT'}</h3>
          <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">
            Reported: <span class="mono-code">${res.date || 'Date not recorded'}</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${res.case_number ? `
            <a href="#cases/${encodeURIComponent(res.case_number)}" class="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="6" cy="6" r="3"></circle>
                <circle cx="18" cy="18" r="3"></circle>
                <circle cx="18" cy="6" r="3"></circle>
                <line x1="8.5" y1="7.5" x2="15.5" y2="16.5"></line>
              </svg>
              View In Knowledge Graph
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Recurrence Alert if entity already in KG -->
      ${hasHistory ? `
        <div style="background-color: var(--color-status-warning-bg); border-left: 4px solid var(--color-status-warning); padding: 12px 16px; margin-bottom: 20px; border-radius: 3px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: #8C590E;">Cross-Case Recurrence Detected:</strong>
              <span style="font-size: 13px; color: #69430B;">
                Suspect or vehicle linked to <strong>${graphMatches.connected_case_count} other incident(s)</strong> in the Knowledge Graph.
              </span>
            </div>
            ${res.suspect_name ? `<a href="#entities/${encodeURIComponent(res.suspect_name)}" class="btn btn-secondary btn-sm" style="font-size: 11px;">Inspect Suspect History</a>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Dossier Sections Grid -->
      <div class="dossier-sections-grid">
        <!-- 1. Incident Classification -->
        <div class="dossier-section">
          <div class="dossier-section-title">Incident Details</div>
          <div class="field-pair">
            <span class="field-label">Case Number</span>
            <span class="field-value mono">${res.case_number || '<span class="missing">Not available</span>'}</span>
          </div>
          <div class="field-pair">
            <span class="field-label">Crime Classification</span>
            <span class="field-value"><span class="badge badge-blue">${res.primary_type || 'Unspecified'}</span></span>
          </div>
          <div class="field-pair">
            <span class="field-label">Subtype Description</span>
            <span class="field-value">${res.description || '<span class="missing">Not available</span>'}</span>
          </div>
          <div class="field-pair">
            <span class="field-label">IUCR Code</span>
            <span class="field-value mono">${res.iucr || '<span class="missing">Not available in record</span>'}</span>
          </div>
          <div class="field-pair">
            <span class="field-label">FBI Code</span>
            <span class="field-value mono">${res.fbi_code || '<span class="missing">Not available in record</span>'}</span>
          </div>
          <div class="field-pair">
            <span class="field-label">Arrest Made</span>
            <span class="field-value">${res.arrest ? '<span class="badge badge-success">ARREST MADE</span>' : '<span class="badge" style="background:#ECECEC;">NO ARREST</span>'}</span>
          </div>
          <div class="field-pair">
            <span class="field-label">Domestic Dispute</span>
            <span class="field-value">${res.domestic ? '<span class="badge badge-warning">YES</span>' : 'NO'}</span>
          </div>
        </div>

        <!-- 2. Person & Vehicle Entities -->
        <div class="dossier-section">
          <div class="dossier-section-title">Involved Entities</div>
          <div class="field-pair">
            <span class="field-label">Suspect Name</span>
            <span class="field-value">
              ${res.suspect_name ? `
                <a href="#entities/${encodeURIComponent(res.suspect_name)}" style="color: var(--color-muted-teal); font-weight:700;">
                  ${res.suspect_name}
                </a>
              ` : '<span class="missing">Not identified in report</span>'}
            </span>
          </div>
          <div class="field-pair">
            <span class="field-label">Vehicle Plate</span>
            <span class="field-value">
              ${res.vehicle_plate ? `
                <a href="#entities/${encodeURIComponent(res.vehicle_plate)}" class="badge badge-gold">
                  ${res.vehicle_plate}
                </a>
              ` : '<span class="missing" title="Intentional missing value preserved">Not available in submitted record</span>'}
            </span>
          </div>
          <div class="field-pair">
            <span class="field-label">Location Block</span>
            <span class="field-value mono">${res.block || '<span class="missing">Not recorded</span>'}</span>
          </div>
          <div class="field-pair">
            <span class="field-label">Premise Type</span>
            <span class="field-value">${res.location_description || '<span class="missing">Unspecified premise</span>'}</span>
          </div>
        </div>

        <!-- 3. Administrative Jurisdiction -->
        <div class="dossier-section">
          <div class="dossier-section-title">Administrative Jurisdiction</div>
          <div class="field-pair">
            <span class="field-label">Police District</span>
            <span class="field-value mono">${res.district ? `District ${res.district}` : '<span class="missing">Not recorded</span>'}</span>
          </div>
          <div class="field-pair">
            <span class="field-label">Police Beat</span>
            <span class="field-value mono">${res.beat ? `Beat ${res.beat}` : '<span class="missing">Not recorded</span>'}</span>
          </div>
          <div class="field-pair">
            <span class="field-label">Ward</span>
            <span class="field-value mono">${res.ward ? `Ward ${res.ward}` : '<span class="missing">Not recorded</span>'}</span>
          </div>
          <div class="field-pair">
            <span class="field-label">Community Area</span>
            <span class="field-value mono">${res.community_area ? `Area ${res.community_area}` : '<span class="missing">Not recorded</span>'}</span>
          </div>
        </div>
      </div>

      <!-- Extracted Relationships Table -->
      <div style="margin-top: 24px;">
        <h4 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--color-primary-navy); margin-bottom: 10px;">
          Extracted Ontology Relationships (${res.extracted_relationships ? res.extracted_relationships.length : 0} Triples)
        </h4>
        <div class="table-container">
          <table class="gov-table">
            <thead>
              <tr>
                <th>Source Entity</th>
                <th>Source Type</th>
                <th>Relationship (Property)</th>
                <th>Target Entity</th>
                <th>Target Type</th>
              </tr>
            </thead>
            <tbody>
              ${(res.extracted_relationships || []).map(rel => `
                <tr>
                  <td class="mono-code"><strong>${rel.source}</strong></td>
                  <td><span class="badge badge-blue">${rel.source_type}</span></td>
                  <td class="mono-code" style="color: var(--color-primary-blue); font-weight: 600;">&rarr; ${rel.relationship} &rarr;</td>
                  <td class="mono-code"><strong>${rel.target}</strong></td>
                  <td><span class="badge badge-teal">${rel.target_type}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Legal Disclaimer Banner -->
      <div class="observation-callout" style="margin-top: 24px;">
        <strong>Investigative Notice:</strong> ${res.legal_disclaimer}
      </div>
    </div>
  `;
}
