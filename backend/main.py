import hashlib
import hmac
import os
import time
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from catalog import IMAGING_TESTS, LAB_TESTS, questionnaires_for
from portal_store import apply_prices, issue_invite, load, save, transport_fee
from sharepoint import SharePointError, configured, save_booking

DIST = Path(__file__).resolve().parent.parent / "hello-world" / "dist"

app = FastAPI(title="Reya Health API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

COMPANIES = [
    {
        "id": "reya-lab",
        "name": "Reya Lab",
        "services": ["lab"],
        "book": "flow",
        "url": None,
    },
    {
        "id": "reya-imaging",
        "name": "Reya Imaging",
        "services": ["imaging"],
        "book": "flow",
        "url": None,
    },
    {
        "id": "mygda",
        "name": "MYGDA",
        "services": ["psych"],
        "book": "iframe",
        "url": "https://secure.gethealthie.com/appointments/embed_appt?dietitian_id=11341114&provider_ids=%5B11341114%5D&appt_type_ids=%5B499925,503525%5D&insurance_step=true",
    },
    {
        "id": "cimpar-primary",
        "name": "CIMPAR Primary Care Televisit",
        "services": ["primary"],
        "book": "iframe",
        "url": "https://secure.gethealthie.com/appointments/embed_appt?dietitian_id=11341114&provider_ids=%5B11341114%5D&appt_type_ids=%5B499925,503525%5D&insurance_step=true",
    },
]

SERVICE_KEYS = {"lab", "imaging", "psych", "primary"}
SERVED_PREFIXES = {"600", "601", "602", "603", "604", "605", "606", "607", "608"}
AREA = "Chicago-area ZIP codes 60000–60899"


def zip_served(zip_code: str) -> bool:
    return len(zip_code) == 5 and zip_code.isdigit() and zip_code[:3] in SERVED_PREFIXES


def site_file(relative_path: str) -> Path | None:
    root = DIST.resolve()
    candidate = (root / relative_path).resolve()
    if root not in candidate.parents and candidate != root:
        return None
    if candidate.is_file():
        return candidate
    return None


@app.get("/")
def site_root():
    index = DIST / "index.html"
    if not index.is_file():
        raise HTTPException(status_code=503, detail="site build is missing")
    return FileResponse(index)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/coverage")
def coverage(zip: str = Query(...)):
    code = "".join(character for character in zip if character.isdigit())[:5]
    return {"zip": code, "served": zip_served(code), "area": AREA}


def all_companies():
    extra = []
    for business in load().get("businesses") or []:
        extra.append(
            {
                "id": business.get("id"),
                "name": business.get("name"),
                "services": business.get("services") or [],
                "book": "flow",
                "url": None,
            }
        )
    return COMPANIES + extra


@app.get("/companies")
def companies(service: Optional[str] = None):
    rows = all_companies()
    if service in SERVICE_KEYS:
        return [company for company in rows if service in company["services"]]
    return rows


@app.get("/labs")
def labs():
    return apply_prices(LAB_TESTS)


@app.get("/imaging")
def imaging():
    return apply_prices(IMAGING_TESTS)


@app.get("/pricing")
def pricing():
    rule = load()["transport"]
    return {"transport": rule, "example": transport_fee(rule.get("included_miles") or 0)}


class TransportInput(BaseModel):
    miles: float = 0


class OfficeLogin(BaseModel):
    email: str
    password: str


class TransportRule(BaseModel):
    base_fee: float
    included_miles: float
    per_mile: float


class PriceUpdate(BaseModel):
    code: str
    price: float


class BusinessSetup(BaseModel):
    name: str
    email: str
    services: List[str]


class InviteRequest(BaseModel):
    name: str = ""
    email: str
    role: str


def office_password() -> str:
    return os.environ.get("OFFICE_PASSWORD", "ReyaOffice2026")


def office_email() -> str:
    return os.environ.get("OFFICE_EMAIL", "office@reyahealth.com").strip().lower()


def office_token(email: str) -> str:
    expires = str(int(time.time()) + 60 * 60 * 12)
    payload = f"{email}|{expires}"
    signature = hmac.new(office_password().encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}|{signature}"


def require_office(token: str) -> None:
    parts = (token or "").split("|")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Sign in to the back office again.")
    email, expires, signature = parts
    payload = f"{email}|{expires}"
    expected = hmac.new(office_password().encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected) or int(expires) < time.time():
        raise HTTPException(status_code=401, detail="Sign in to the back office again.")


@app.post("/office/login")
def office_login(body: OfficeLogin):
    email = body.email.strip().lower()
    invites = load().get("invites") or []
    invited = next((row for row in invites if row.get("email") == email), None)
    if invited and hmac.compare_digest(body.password, invited.get("temporary_password") or ""):
        return {"token": office_token(email), "email": email, "role": invited.get("role")}
    if email == office_email() and hmac.compare_digest(body.password, office_password()):
        return {"token": office_token(email), "email": email, "role": "admin"}
    raise HTTPException(status_code=401, detail="That email or password is not recognized.")


@app.get("/office/catalog")
def office_catalog(token: str = Query(...)):
    require_office(token)
    data = load()
    tests = []
    for item in apply_prices(LAB_TESTS):
        tests.append({"code": item["code"], "name": item["name"], "kind": "lab", "price": item["price"]})
    for item in apply_prices(IMAGING_TESTS):
        tests.append({"code": item["code"], "name": item["name"], "kind": "imaging", "price": item["price"]})
    return {
        "transport": data["transport"],
        "tests": tests,
        "businesses": data.get("businesses") or [],
        "email_ready": bool(os.environ.get("SMTP_HOST", "").strip()),
    }


@app.put("/office/transport")
def office_transport(body: TransportRule, token: str = Query(...)):
    require_office(token)
    data = load()
    data["transport"] = body.model_dump()
    save(data)
    return {"transport": data["transport"], "example": transport_fee(body.included_miles + 5)}


@app.put("/office/prices")
def office_prices(body: PriceUpdate, token: str = Query(...)):
    require_office(token)
    data = load()
    data["prices"][body.code] = body.price
    save(data)
    return {"code": body.code, "price": body.price}


@app.post("/office/businesses")
def office_business(body: BusinessSetup, token: str = Query(...)):
    require_office(token)
    services = [item for item in body.services if item in SERVICE_KEYS]
    if not body.name.strip() or not services:
        raise HTTPException(status_code=400, detail="Enter a business name and at least one service.")
    data = load()
    business = {
        "id": f"biz-{int(time.time())}",
        "name": body.name.strip(),
        "email": body.email.strip(),
        "services": services,
    }
    data["businesses"].append(business)
    save(data)
    return business


@app.post("/office/invites")
def office_invite(body: InviteRequest, token: str = Query(...)):
    require_office(token)
    if body.role not in {"provider", "staff"}:
        raise HTTPException(status_code=400, detail="Choose a provider or staff login.")
    if "@" not in body.email:
        raise HTTPException(status_code=400, detail="Enter an email address.")
    invite = issue_invite(body.email, body.role, body.name)
    sent = bool(os.environ.get("SMTP_HOST", "").strip())
    return {
        "email": invite["email"],
        "role": invite["role"],
        "emailed": sent,
        "temporary_password": None if sent else invite["temporary_password"],
    }


class TestLine(BaseModel):
    code: str = ""
    name: str = ""
    cpt: str = ""
    price: float = 0
    setup_fee: float = 0


class PatientInfo(BaseModel):
    first: str = ""
    last: str = ""
    dob: str = ""
    gender: str = ""
    relationship: str = ""
    phone: str = ""
    email: str = ""


class QuestionItem(BaseModel):
    prompt: str = ""
    answer: str = ""


class QuestionSection(BaseModel):
    title: str = ""
    items: List[QuestionItem] = Field(default_factory=list)


class BookingRequest(BaseModel):
    company: str = ""
    service: str = ""
    zip: str = ""
    address: str = ""
    order: str = ""
    order_file: str = ""
    appointment_date: str = ""
    appointment_time: str = ""
    labs: List[TestLine] = Field(default_factory=list)
    imaging: List[TestLine] = Field(default_factory=list)
    questions: List[QuestionSection] = Field(default_factory=list)
    info: PatientInfo = Field(default_factory=PatientInfo)
    service_fee: float = 0
    setup_fee: float = 0
    total: float = 0


@app.post("/bookings")
def create_booking(booking: BookingRequest):
    if not configured():
        return {"saved": False, "reason": "not_configured"}
    try:
        return save_booking(booking.model_dump())
    except SharePointError as error:
        raise HTTPException(status_code=502, detail=str(error)) from None


@app.get("/questionnaires")
def questionnaires(
    lab: Optional[List[str]] = Query(default=None),
    imaging: Optional[List[str]] = Query(default=None),
):
    return {
        "sections": questionnaires_for(lab_codes=lab or [], imaging_codes=imaging or []),
    }


@app.get("/{full_path:path}")
def site_asset(full_path: str):
    found = site_file(full_path)
    if found is not None:
        return FileResponse(found)
    index = DIST / "index.html"
    if index.is_file():
        return FileResponse(index)
    raise HTTPException(status_code=404)
