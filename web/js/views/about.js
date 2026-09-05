export async function renderAbout(container) {
  container.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h1 class="serif-text" style="font-size: 28px; color: var(--color-primary-navy);">About the Project</h1>
        <p style="font-size: 14px; color: var(--color-text-secondary);">
          Smart India Hackathon 2026 &bull; Problem Statement SIH26189 &bull; AI Criminal Network Analysis
        </p>
      </div>

      <div style="background: white; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: 32px; box-shadow: var(--shadow-sm); margin-bottom: 28px;">
        <h3 style="font-size: 20px; color: var(--color-primary-navy); margin-bottom: 12px;">Project Identity & Team</h3>
        <table class="gov-table" style="margin-bottom: 20px;">
          <tbody>
            <tr><td style="width: 30%;"><strong>Competition</strong></td><td>Smart India Hackathon 2026</td></tr>
            <tr><td><strong>Problem Statement ID</strong></td><td class="mono-code">SIH26189 — AI Criminal Network Analysis</td></tr>
            <tr><td><strong>Team Name</strong></td><td>banDds</td></tr>
            <tr><td><strong>Theme</strong></td><td>Blockchain and Cybersecurity</td></tr>
            <tr><td><strong>Prototype Type</strong></td><td>Investigative Crime-Record Intelligence Platform</td></tr>
          </tbody>
        </table>

        <h3 style="font-size: 20px; color: var(--color-primary-navy); margin-bottom: 12px;">Core Mission</h3>
        <p style="font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px;">
          Traditional police records and First Information Reports (FIRs) are typically stored as siloed text narratives or isolated relational database rows. This makes it challenging for investigating officers to detect recurring suspects operating across jurisdictional boundaries, vehicles associated with multiple crimes, or covert syndicates.
        </p>
        <p style="font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 20px;">
          This platform bridges that gap by transforming unstructured narratives into a high-fidelity semantic Knowledge Graph. By combining ontological modeling (13 Stanford Protégé classes), graph algorithms, and machine learning, the system surfaces hidden multi-hop connections while maintaining full evidential transparency and human-in-the-loop oversight.
        </p>

        <h3 style="font-size: 20px; color: var(--color-primary-navy); margin-bottom: 12px;">Ethical & Legal Neutrality Framework</h3>
        <div style="background-color: var(--color-bg-warm); border-left: 4px solid var(--color-primary-blue); padding: 16px; border-radius: 4px; font-size: 13.5px; color: var(--color-text-primary); line-height: 1.6;">
          <p style="margin-bottom: 8px;"><strong>Strict Investigative Principle:</strong></p>
          <ul style="margin-left: 20px; display: flex; flex-direction: column; gap: 6px;">
            <li>AI outputs and graph links are analytical signals derived from submitted records; they do not establish guilt or legal liability.</li>
            <li>Evidence fidelity: When data is missing from an FIR (such as an absent vehicle plate), the system preserves the null value and never fabricates placeholder entities.</li>
            <li>Language neutrality: The platform employs objective terminology such as <em>"Entity appears in multiple records"</em> and <em>"Potential relationship detected"</em> rather than accusatory labels.</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}
