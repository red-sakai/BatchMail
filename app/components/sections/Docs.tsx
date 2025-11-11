"use client";

export default function Docs() {
  return (
    <div className="prose max-w-none">
      <h1>BatchMail Documentation</h1>
      <p>BatchMail helps you bulk‑send personalized HTML emails: upload a CSV, author a Jinja‑style template, preview & validate, then send or export JSON.</p>

      <h2 className="mt-8">Quick Start</h2>
      <ol>
        <li><strong>CSV Tab:</strong> Upload your CSV (first row must be headers). Map required columns.</li>
        <li><strong>Template Tab:</strong> Upload or edit HTML. Insert variables using <code>{"{{ variable }}"}</code>.</li>
        <li><strong>Preview &amp; Export Tab:</strong> Provide a dynamic subject, verify environment, export or send.</li>
      </ol>
      <hr className="my-6" />

  <h2 className="mt-8">Environment Variables</h2>
  <p>Create or upload a <strong>.env</strong> (or paste text) containing:</p>
  <pre className="whitespace-pre-wrap break-words"><code># .env
SENDER_EMAIL=you@example.com
SENDER_APP_PASSWORD=your-app-password
SENDER_NAME=Your Display Name</code></pre>
      <ul>
    <li><strong>SENDER_EMAIL</strong> – Mailbox you will send from.</li>
    <li><strong>SENDER_APP_PASSWORD</strong> – Provider generated app password (e.g. Gmail).</li>
    <li><strong>SENDER_NAME</strong> – Friendly display name.</li>
      </ul>
  <p><strong>Note:</strong> Uploaded env values are stored in memory only; restarting the server clears them.</p>

      <h2 className="mt-8">CSV Requirements</h2>
      <p>Required headers: an email address column and a name column. Add any number of extra personalization columns (e.g. <code>amount</code>, <code>company</code>, <code>plan</code>).</p>
      <p>You can edit any cell inline by double‑clicking, add/remove columns, and insert/delete rows. Download the modified CSV at any time.</p>
  <h3>Example CSV</h3>
  <pre className="whitespace-pre-wrap break-words"><code># recipient,name,... headers on first row
recipient,name,amount,segment
alice@example.com,Alice,125,referral
bob@example.com,Bob,300,retargeting</code></pre>

      <h2 className="mt-8">Template Authoring</h2>
      <p>Write standard HTML. Use Jinja/Handlebars‑like syntax for variables:</p>
  <pre className="whitespace-pre-wrap break-words"><code>{`<p>Hello {{ name }}, your invoice total is {{ amount }}.</p>`}</code></pre>
      <p>Available variables:</p>
      <ul>
        <li><code>{"{{ name }}"}</code>, <code>{"{{ recipient }}"}</code></li>
        <li>Every CSV header (e.g. <code>{"{{ amount }}"}</code>, <code>{"{{ segment }}"}</code>)</li>
      </ul>
      <p>Logic, filters, loops, etc. supported by Nunjucks can be added if needed (<code>{`{% if amount > 200 %}VIP{% endif %}`}</code>).</p>

      <h2 className="mt-8">Subject Line</h2>
      <p>Set a dynamic subject in Preview using the same variable syntax. If the subject template is blank, and a mapped subject column exists in the CSV, that column’s value is used.</p>
  <pre className="whitespace-pre-wrap break-words"><code>{`Invoice for {{ name }} - Total {{ amount }}`}</code></pre>

      <h2 className="mt-8">Validation & Variable Checks</h2>
      <p>Unknown variables are flagged so you can correct typos. Keep variable names exactly matching CSV headers.</p>

      <h2 className="mt-8">Export JSON</h2>
      <p>Generates an array of rendered objects:</p>
      <pre className="whitespace-pre-wrap break-words"><code>{`[
  {
    "to": "alice@example.com",
    "name": "Alice",
    "subject": "Invoice for Alice - Total 125",
    "html": "<p>Hello Alice...</p>"
  }
]`}</code></pre>

      <h2 className="mt-8">Sending Emails</h2>
      <ol>
        <li>Upload/paste env and ensure the status badge shows success.</li>
        <li>Review recipient count and any warnings.</li>
        <li>Click <strong>Send Emails</strong>. Progress and logs stream live.</li>
      </ol>
      <p>For large lists, consider batching (future roadmap) to reduce rate‑limit risk.</p>

      <h2 className="mt-8">Safety & Sanitization</h2>
      <p>HTML edited in the WYSIWYG is sanitized via DOMPurify to strip scripts and dangerous attributes. Avoid inline event handlers or script tags.</p>

      <h2 className="mt-8">Troubleshooting</h2>
      <ul>
        <li><strong>Missing env:</strong> Reupload/paste ensuring all three keys exist.</li>
        <li><strong>Auth failures:</strong> Verify correct app password & provider requirements (e.g. Gmail App Password with 2FA).</li>
        <li><strong>Unknown variable:</strong> Check spelling; confirm the header exists in the CSV.</li>
      </ul>

      <h2 className="mt-8">Advanced Template Example</h2>
  <pre className="whitespace-pre-wrap break-words"><code>{`<html>\n  <body>\n    <h2>Account Summary for {{ name }}</h2>\n    {% if amount %}<p>Your total due: \${{ amount }}.</p>{% endif %}\n    <p>Segment: {{ segment | default('n/a') }}</p>\n    {% if amount and amount > 250 %}<p><strong>VIP Thank You!</strong></p>{% endif %}\n  </body>\n</html>`}</code></pre>

      <h2 className="mt-8">Security Notes</h2>
      <p>No secrets are persisted beyond memory. For production use, add encrypted storage, audit logging, and rate limiting.</p>

      <h2 className="mt-8">Roadmap</h2>
      <ul>
        <li>Template versioning & server persistence</li>
        <li>Batch sending + retry / backoff</li>
        <li>Dry‑run full preview per recipient</li>
        <li>Role‑based access & audit logs</li>
      </ul>
    </div>
  );
}
