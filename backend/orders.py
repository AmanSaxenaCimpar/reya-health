"""Store a visit order and build a requisition when the patient has none."""

import base64
import json
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "data" / "orders"
MAX_BYTES = 8_000_000
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
}


class OrderError(Exception):
    pass


def prepare_order(booking: dict) -> dict:
    """Attach the visit order and return fields for SharePoint."""
    choice = str(booking.get("order") or "").strip().lower()
    if choice == "yes":
        raw = booking.get("order_content") or ""
        content_type = str(booking.get("order_content_type") or "").split(";")[0].strip().lower()
        try:
            data = base64.b64decode(raw, validate=True)
        except Exception as error:
            raise OrderError("The uploaded order could not be read. Upload a PDF or image.") from error
        name = _safe_name(booking.get("order_file") or "order", content_type)
    elif choice == "no":
        name, data = requisition_pdf(booking)
        content_type = "application/pdf"
    else:
        raise OrderError("Choose whether you have a physician order.")
    if not data or len(data) > MAX_BYTES:
        raise OrderError("The order file must be a PDF or image under 8 MB.")
    if choice == "yes" and content_type not in ALLOWED_TYPES and not _looks_known(data):
        raise OrderError("Upload a PDF or an image of the order.")
    if choice == "yes" and content_type not in ALLOWED_TYPES:
        content_type = _sniff(data)
        name = _safe_name(name, content_type)
    stored = _write(name, data, content_type, booking)
    encoded = base64.b64encode(data).decode("ascii")
    return {
        "order_file": name,
        "order_content": encoded,
        "order_content_type": content_type,
        "order_id": stored["id"],
    }


def read_order(order_id: str):
    folder = _folder(order_id)
    meta_path = folder / "meta.json"
    if not meta_path.is_file():
        return None
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    path = folder / "file"
    if not path.is_file():
        return None
    return path, meta.get("name") or "order.pdf", meta.get("content_type") or "application/octet-stream"


def requisition_pdf(booking: dict) -> tuple[str, bytes]:
    info = booking.get("info") or {}
    first = str(info.get("first") or "").strip()
    last = str(info.get("last") or "").strip()
    service = "Imaging" if booking.get("service") == "imaging" else "Laboratory"
    company = booking.get("company") or f"Reya {service}"
    tests = booking.get("imaging") if booking.get("service") == "imaging" else booking.get("labs")
    lines = [
        company.upper(),
        f"{service.upper()} REQUISITION",
        "",
        "This order was created because the patient did not have a physician order.",
        "It is ready for provider review.",
        "",
        f"Order created: {_now()}",
        f"Appointment: {booking.get('appointment_date') or '—'} {booking.get('appointment_time') or ''}".strip(),
        f"Service location: At home",
        f"Address: {booking.get('address') or booking.get('zip') or '—'}",
        "",
        "PATIENT",
        f"Legal name: {' '.join(part for part in (first, last) if part) or '—'}",
        f"Preferred name: {info.get('preferred') or '—'}",
        f"Date of birth: {info.get('dob') or '—'}",
        f"Sex: {info.get('gender') or '—'}",
        f"Phone: {info.get('phone') or '—'}",
        f"Email: {info.get('email') or '—'}",
        "",
        "TESTS ORDERED",
    ]
    if not tests:
        lines.append("No tests were selected.")
    for test in tests or []:
        lines.append(f"{test.get('name') or 'Test'}    Code {test.get('code') or '—'}    CPT {test.get('cpt') or '—'}")
    lines.extend(["", "CLINICAL INFORMATION"])
    notes = _clinical_notes(booking.get("questions") or [])
    lines.extend(notes or ["No questionnaire answers were provided."])
    lines.extend(["", "Provider signature: ________________________    Date: ______________"])
    slug = re.sub(r"[^A-Za-z0-9]+", "-", last or "patient").strip("-") or "patient"
    return f"Reya-Order-{slug}.pdf", _pdf_bytes(lines)


def _clinical_notes(sections: list) -> list[str]:
    notes = []
    for section in sections:
        for item in section.get("items") or []:
            answer = str(item.get("answer") or "").strip()
            prompt = str(item.get("prompt") or "").strip()
            if not answer or answer.lower() in {"no", "unsure", "n/a"}:
                continue
            notes.append(f"{prompt}: {answer}")
            if len(notes) >= 12:
                return notes
    return notes


def _write(name: str, data: bytes, content_type: str, booking: dict) -> dict:
    order_id = secrets.token_urlsafe(18)
    folder = _folder(order_id)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "file").write_bytes(data)
    info = booking.get("info") or {}
    meta = {
        "id": order_id,
        "name": name,
        "content_type": content_type,
        "created": _now(),
        "patient": " ".join(part for part in (info.get("first"), info.get("last")) if part),
        "company": booking.get("company") or "",
        "service": booking.get("service") or "",
    }
    (folder / "meta.json").write_text(json.dumps(meta), encoding="utf-8")
    return meta


def _folder(order_id: str) -> Path:
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", order_id or ""):
        return ROOT / "missing"
    return ROOT / order_id


def _safe_name(name: str, content_type: str) -> str:
    base = Path(str(name or "order")).name
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip(".-") or "order"
    suffix = ALLOWED_TYPES.get(content_type, "")
    if suffix and not base.lower().endswith(suffix):
        base = f"{base}{suffix}"
    return base[:80]


def _looks_known(data: bytes) -> bool:
    return _sniff(data) in ALLOWED_TYPES


def _sniff(data: bytes) -> str:
    if data.startswith(b"%PDF"):
        return "application/pdf"
    if data.startswith(b"\x89PNG"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"GIF8"):
        return "image/gif"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    return ""


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _pdf_bytes(lines: list[str]) -> bytes:
    wrapped = []
    for line in lines:
        text = _plain(line)
        while len(text) > 90:
            wrapped.append(text[:90])
            text = text[90:]
        wrapped.append(text)
    commands = ["BT", "/F1 11 Tf", "50 760 Td", "14 TL"]
    for line in wrapped[:48]:
        commands.append(f"({_pdf_text(line)}) Tj")
        commands.append("T*")
    commands.append("ET")
    stream = "\n".join(commands).encode("latin-1", errors="replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    body = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(body))
        body.extend(f"{number} 0 obj\n".encode())
        body.extend(obj)
        body.extend(b"\nendobj\n")
    xref = len(body)
    body.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    body.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        body.extend(f"{offset:010d} 00000 n \n".encode())
    body.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return bytes(body)


def _plain(value: str) -> str:
    return "".join(ch if 32 <= ord(ch) < 127 else " " for ch in str(value))


def _pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
