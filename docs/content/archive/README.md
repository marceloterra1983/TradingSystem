# Archive Workspace

This directory collects documentation that has moved out of the active TradingSystem knowledge base but must remain available for governance, audits, or historical context.

## Policy
- Archive only content that has been superseded, deprecated, or formally retired from production workflows.
- Every archived file needs `archived_date` (YYYY-MM-DD) and `archive_reason` in the frontmatter while retaining the original authoring metadata.
- Items removed from here must follow the deletion checklist in `governance/`.

## Structure
- Quarterly folders (`YYYY-Q#`) provide predictable drop points. Keep empty folders in place so the structure is always ready for the next migration.
- Mirror the original directory hierarchy inside each quarter to make it easy to trace where a document lived before being archived.
- Reference maintenance or cleanup tickets in the body of the archived article when available.

## Usage
1. Identify candidates during maintenance audits or documentation reviews.
2. Move the file into the current-quarter folder, keeping any sub-directory path the same.
3. Update frontmatter and in-body links, then add an entry in the quarterly cleanup report under `docs/reports/`.
4. Remove the document from active sidebars or navigation configs once the archive move is complete.
