export async function renderMethodology(container) {
  container.innerHTML = `
    <div style="margin-bottom: 24px;">
      <h1 class="serif-text" style="font-size: 26px; color: var(--color-primary-navy);">Methodology & Architecture</h1>
      <p style="font-size: 14px; color: var(--color-text-secondary);">
        How unstructured police records and First Information Reports are converted into actionable, explainable graph intelligence.
      </p>
    </div>

    <!-- 5-Step Process Cards -->
    <div style="margin-bottom: 36px;">
      <div class="methodology-step-card">
        <div class="step-num-large">01</div>
        <div class="methodology-content">
          <h3>Submit — Document Ingestion</h3>
          <p>
            Investigators input First Information Report (FIR) narratives via text paste, batch text files, or direct incident feeds. The system handles unstructured reports and respects intentional missing values (e.g. absent vehicle plates are strictly left as null rather than fabricated).
          </p>
        </div>
      </div>

      <div class="methodology-step-card">
        <div class="step-num-large">02</div>
        <div class="methodology-content">
          <h3>Extract — NLP Entity Recognition</h3>
          <p>
            Domain-specific NLP rules and regular expressions extract core legal and situational entities: Case Number (e.g. JC100113), Suspect Names, Offense Primary Classification, Crime Subtype, Exact Street Block, Location Premise Type, Vehicle Registration Plates, Police District, Police Beat, Ward, Community Area, IUCR, and FBI Classification Codes.
          </p>
        </div>
      </div>

      <div class="methodology-step-card">
        <div class="step-num-large">03</div>
        <div class="methodology-content">
          <h3>Connect — Semantic Ontology & RDF Representation</h3>
          <p>
            Extracted entities are mapped to a 13-class OWL ontology developed in Stanford Protégé and populated as RDF/TTL triples. Conceptual relationships include <code>CrimeIncident &rarr; hasSuspect &rarr; Suspect</code>, <code>Suspect &rarr; drivesVehicle &rarr; Vehicle</code>, <code>CrimeIncident &rarr; occurredAt &rarr; Location</code>, and jurisdictional ties.
          </p>
        </div>
      </div>

      <div class="methodology-step-card">
        <div class="step-num-large">04</div>
        <div class="methodology-content">
          <h3>Analyze — Graph Algorithms & Machine Learning</h3>
          <p>
            Graph analysis identifies repeat suspects, shared vehicle coordination, location hotspots, and indirect multi-hop connections across cases. Machine learning experiments (Logistic Regression for topological link prediction using 20 graph pair features, and GraphSAGE for node classification) score candidate relationships.
          </p>
        </div>
      </div>

      <div class="methodology-step-card">
        <div class="step-num-large">05</div>
        <div class="methodology-content">
          <h3>Explore — Human-in-the-Loop Investigation</h3>
          <p>
            Investigators interact with cases, people, vehicles, and geographic jurisdictions through the unified Knowledge Graph interface. AI outputs provide analytical signals and candidate patterns to accelerate investigative workflows without replacing human judgment.
          </p>
        </div>
      </div>
    </div>

    <!-- Ontology Classes Overview -->
    <section style="margin-bottom: 36px;">
      <div class="section-header">
        <div>
          <h2 class="section-title">Stanford Protégé Domain Ontology Classes (13 Classes)</h2>
          <div class="section-subtitle">Formal schema definitions governing semantic Knowledge Graph triples</div>
        </div>
      </div>

      <div class="table-container">
        <table class="gov-table">
          <thead>
            <tr>
              <th>Class Name</th>
              <th>Category</th>
              <th>Sample Entities</th>
              <th>Primary Associated Properties</th>
            </tr>
          </thead>
          <tbody>
            <tr><td class="mono-code"><strong>CrimeIncident</strong></td><td>Core Event</td><td>Case #JC100113, #JC100226</td><td>hasSuspect, occurredAt, hasCrimeType, occurredInBeat</td></tr>
            <tr><td class="mono-code"><strong>Suspect</strong></td><td>Actor</td><td>Deandre Allen, Tyler Wilson</td><td>perpetratedBy, drivesVehicle</td></tr>
            <tr><td class="mono-code"><strong>Vehicle</strong></td><td>Physical Asset</td><td>IL-4258-DT, IL-2133-ZN</td><td>drivesVehicle (only when plate present)</td></tr>
            <tr><td class="mono-code"><strong>Location</strong></td><td>Geography</td><td>0100XX W FULLERTON AVE</td><td>occurredAt, hasPremiseType</td></tr>
            <tr><td class="mono-code"><strong>CrimeType</strong></td><td>Legal Category</td><td>ROBBERY, THEFT, BATTERY</td><td>hasCrimeType</td></tr>
            <tr><td class="mono-code"><strong>CrimeDescription</strong></td><td>Sub-Classification</td><td>ARMED: HANDGUN, OVER $500</td><td>hasDescription</td></tr>
            <tr><td class="mono-code"><strong>PoliceBeat</strong></td><td>Jurisdiction</td><td>Beat 0914, Beat 1013</td><td>occurredInBeat, occurredInDistrict</td></tr>
            <tr><td class="mono-code"><strong>PoliceDistrict</strong></td><td>Jurisdiction</td><td>District 009, District 010</td><td>occurredInDistrict</td></tr>
            <tr><td class="mono-code"><strong>Ward</strong></td><td>Civic Region</td><td>Ward 15, Ward 24</td><td>occurredInWard</td></tr>
            <tr><td class="mono-code"><strong>CommunityArea</strong></td><td>Civic Region</td><td>Area 61 (New City), Area 29</td><td>occurredInCommunityArea</td></tr>
            <tr><td class="mono-code"><strong>PremiseType</strong></td><td>Environment</td><td>RESTAURANT, RESIDENCE, ALLEY</td><td>hasPremiseType</td></tr>
            <tr><td class="mono-code"><strong>IUCRCode</strong></td><td>Legal Code</td><td>031A, 0820, 1310, 0460</td><td>hasIUCRCode</td></tr>
            <tr><td class="mono-code"><strong>FBICode</strong></td><td>Legal Code</td><td>03, 06, 14, 08B</td><td>hasFBICode</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Machine Learning Context & Evaluation -->
    <section style="margin-bottom: 36px;">
      <div class="section-header">
        <div>
          <h2 class="section-title">Machine Learning Experiments</h2>
          <div class="section-subtitle">Evaluation benchmarks documented in project notebooks</div>
        </div>
      </div>

      <div class="analytics-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">Logistic Regression — Graph Link Prediction</h3>
            <span class="badge badge-success">Evaluated</span>
          </div>
          <p style="font-size: 13px; color: var(--color-text-secondary); margin-bottom: 14px;">
            Predicts candidate graph edges using 20 pair-level topological features (Node Degree, Common Neighbors, Jaccard Similarity, Adamic-Adar, Resource Allocation, and Node/Relationship Indicators).
          </p>
          <table class="gov-table">
            <tbody>
              <tr><td>Held-out Evaluation Set</td><td class="mono-code">426 positive + 426 negative pairs</td></tr>
              <tr><td>Overall Accuracy</td><td class="mono-code"><strong>73.71%</strong></td></tr>
              <tr><td>Precision</td><td class="mono-code"><strong>80.42%</strong></td></tr>
              <tr><td>Recall</td><td class="mono-code"><strong>62.68%</strong></td></tr>
              <tr><td>F1 Score</td><td class="mono-code"><strong>70.45%</strong></td></tr>
              <tr><td>ROC-AUC Score</td><td class="mono-code"><strong>81.41%</strong></td></tr>
              <tr><td>Best Relationship F1</td><td class="mono-code">OCCURRED_AT &bull; <strong>88.26%</strong></td></tr>
            </tbody>
          </table>
          <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 10px;">
            * Measured on a 2,127-edge graph snapshot as documented in <code>MLModel.ipynb</code>.
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">GraphSAGE — Experimental Node Scoring</h3>
            <span class="badge badge-warning">Experimental</span>
          </div>
          <p style="font-size: 13px; color: var(--color-text-secondary); margin-bottom: 14px;">
            Graph Neural Network built with PyTorch Geometric to investigate node-level recurrence scoring.
          </p>
          <div style="background: var(--color-bg-warm); padding: 14px; border-radius: 4px; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6;">
            <strong>Scope & Limitations:</strong>
            <ul style="margin-left: 20px; margin-top: 8px;">
              <li>Trained on inductive graph neighborhoods across 1,530 nodes.</li>
              <li>Validation F1 varied across training epochs; therefore treated as an analytical signal rather than a production-grade guarantee.</li>
              <li>Under legal neutrality standards, ML scores are surfaced strictly as analytical recurrence indicators and never as determinations of guilt.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  `;
}
