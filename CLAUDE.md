# File-handling toolbelt

This environment has the following parsers pre-installed. Prefer them when reading user-supplied files — no `npm install` / `pip install` needed:

- **PDF (text layer):** `pdftotext file.pdf -`
- **PDF (scanned / image-only):** `pdftoppm file.pdf out -png && tesseract out-1.png stdout`
- **DOCX, RTF, ODT, EPUB, HTML, etc.:** `pandoc file.docx -t plain`
- **XLSX, XLSM:** `python3 -c "from openpyxl import load_workbook; wb = load_workbook('file.xlsx'); ..."`
- **Images:** the Read tool ingests them directly via vision
- **Plain text, CSV, JSON, Markdown, source code:** the Read tool reads them directly

For uncommon formats, `npm install <pkg>` and `pip install --user <pkg>` are permitted in this environment (writes go to per-user caches).
