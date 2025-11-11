"use client";

export default function Docs() {
  return (
    <div className="prose prose-sm max-w-none">
      <h2>BatchMail Documentation</h2>
      <p>BatchMail lets you upload a CSV, craft a Jinja-style HTML email template, preview personalization, and send mails via your sender credentials.</p>

      <h3>1. Prepare Environment Variables</h3>
      <p>Create a <code>.env.local</code> file or upload/paste one in the Preview &amp; Export tab. Required keys:</p>
      <pre><code>SENDER_EMAIL=you@example.com
SENDER_APP_PASSWORD=your-app-password
SENDER_NAME=Your Display Name</code></pre>
      <ul>
        <li><strong>SENDER_EMAIL</strong>: The mailbox you will send from.</li>
        <li><strong>SENDER_APP_PASSWORD</strong>: Provider app password (e.g. Gmail App Password).</li>
        <li><strong>SENDER_NAME</strong>: Friendly from name displayed to recipients.</li>
      </ul>

      <h3>2. CSV Format</h3>
      <p>Your CSV must contain a recipient column (email address) and a name column. You can add any additional columns for personalization (e.g. <code>first_name</code>, <code>amount</code>, <code>custom_source</code>).</p>
      <p>Upload the CSV in the CSV tab. Then map the required columns. You can edit cells inline and add/remove columns or rows.</p>

      <h3>3. Template Authoring</h3>
      <p>In the Template tab, upload or edit an HTML file. You can reference CSV headers using Jinja syntax:</p>
  <pre><code>{`<p>Hello {{ name }}, your invoice total is {{ amount }}.</p>`}</code></pre>
      <p>Available built-in aliases:</p>
      <ul>
  <li><code>{`{{ name }}`}</code></li>
  <li><code>{`{{ recipient }}`}</code></li>
  <li>All CSV headers (<code>{`{{ first_name }}`}</code>, <code>{`{{ amount_tax }}`}</code>, etc.)</li>
      </ul>

      <h3>4. Subject Line</h3>
      <p>In Preview &amp; Export you can craft a dynamic subject line using the same variables:</p>
  <pre><code>{`Invoice for {{ name }} - Amount {{ amount }}`}</code></pre>

      <h3>5. Variable Insertion & Validation</h3>
  <p>Use the &quot;Insert variable&quot; picker to insert tokens. The app highlights unknown variables so you can fix typos before sending.</p>

      <h3>6. Sending Emails</h3>
      <ol>
        <li>Ensure env badge shows <em>Sender env OK</em>.</li>
        <li>Review recipients list.</li>
        <li>Click <strong>Send Emails</strong>. A progress view (coming soon) will display per-email status.</li>
      </ol>
      <p>For bulk sending at scale, consider batching and delays to avoid provider rate limits.</p>

      <h3>7. Export Payload (JSON)</h3>
      <p>If you want to integrate with an external service, click <strong>Export JSON</strong> to download a structured payload of rendered emails.</p>

      <h3>8. Safety & Sanitization</h3>
      <p>WYSIWYG content is sanitized via DOMPurify. External user-provided HTML is cleaned; avoid embedding inline scripts.</p>

      <h3>9. Troubleshooting</h3>
      <ul>
        <li><strong>Missing env variables</strong>: Re-upload or paste .env and ensure all three keys are present.</li>
        <li><strong>Emails not sending</strong>: Confirm the app password is valid; Gmail requires App Passwords with 2FA enabled.</li>
        <li><strong>Unknown variables</strong>: Check spelling; ensure header exists in the CSV.</li>
      </ul>

      <h3>10. Example CSV</h3>
      <pre><code>recipient,name,amount,custom_source
alice@example.com,Alice,125,referral
bob@example.com,Bob,300,retargeting</code></pre>

      <h3>11. Example Template</h3>
  <pre><code>{`<html>\n  <body>\n    <p>Hello {{ name }},</p>\n    <p>Thank you for your purchase of \${{ amount }} via {{ custom_source }}.</p>\n  </body>\n</html>`}</code></pre>

      <h3>12. Notes on Security</h3>
      <p>Uploaded env values are stored in-memory only. Restarting the server clears overrides. Do not use this demo for production secrets without adding secure storage.</p>

      <h3>13. Roadmap</h3>
      <ul>
        <li>Streaming progress bar & log (in development)</li>
        <li>Dry-run mode with HTML preview per recipient</li>
        <li>Rate limiting and retry logic</li>
      </ul>
    </div>
  );
}
