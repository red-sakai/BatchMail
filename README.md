## BatchMail UI

BatchMail provides an interface for generating personalized email HTML bodies from a CSV file and a Jinja-style HTML template (rendered client-side with Nunjucks).

### Features

1. Upload CSV (with headers) and auto-detect recipient and name columns.
2. Map columns manually if auto-detection is wrong.
3. Create or upload an HTML template containing variables like `{{ name }}` or any header (e.g. `{{ company }}`).
4. Preview the first few rendered emails safely in sandboxed iframes.
5. Export a JSON payload: `[ { to, name, html }, ... ]` for further processing / sending via your backend.

### Expected CSV Format

The CSV must include a header row. Common column names auto-detected:

- Recipient/email: `email`, `recipient`, `to`, `address`
- Name: `name`, `full_name`, `first_name`

Other columns are available as template variables automatically.

Example:

```csv
email,name,company
alice@example.com,Alice,Wonder Corp
bob@example.com,Bob,Builder LLC
```

### Template Syntax

Uses Nunjucks (close to Jinja):

- Variables: `{{ name }}`, `{{ company }}`
- Conditionals: `{% if company %}...{% endif %}`
- Loops: `{% for r in rows %}...{% endfor %}` (You typically won't loop here; each render is per row.)

Minimal example:

```html
<html>
	<body>
		<p>Hello {{ name }},</p>
		<p>We love working with {{ company }}.</p>
	</body>
</html>
```

### Running Locally

```powershell
npm install
npm run dev
```

Open http://localhost:3000

### Exported JSON

Click "Export JSON" to download `batchmail-payload.json`:

```jsonc
[
	{
		"to": "alice@example.com",
		"name": "Alice",
		"html": "<html>... personalized ...</html>"
	}
]
```

### Next Steps (Backend Integration)

You can POST the exported JSON to a backend that sends emails (e.g. using Nodemailer, AWS SES, SendGrid). Ensure you sanitize or trust the template source before sending.

### Development Notes

- Client-only rendering; no data is sent server-side during preview.
- If your CSV is large, consider implementing pagination/virtualization.
- For security, the preview iframes are sandboxed; remove sandbox restrictions only if you trust the template content.

### License

MIT
