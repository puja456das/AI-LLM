from io import BytesIO
from pathlib import Path

from docx import Document
from pypdf import PdfReader


def extract_resume_text(filename: str, content: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    try:
        if suffix == ".pdf":
            reader = PdfReader(BytesIO(content), strict=False)
            if reader.is_encrypted:
                raise ValueError("Password-protected PDFs are not supported yet.")
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif suffix == ".docx":
            document = Document(BytesIO(content))
            paragraphs = [paragraph.text for paragraph in document.paragraphs]
            table_text = [cell.text for table in document.tables for row in table.rows for cell in row.cells]
            text = "\n".join(paragraphs + table_text)
        else:
            raise ValueError("Upload a PDF or DOCX resume.")
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("The file could not be read. Try exporting the resume again as PDF or DOCX.") from exc

    text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    if len(text) < 40:
        raise ValueError("Not enough selectable text was found. Scanned-image PDFs need OCR and are not supported yet.")
    return text[:200_000]
