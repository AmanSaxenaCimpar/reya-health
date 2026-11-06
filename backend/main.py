from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from catalog import IMAGING_TESTS, LAB_TESTS, questionnaires_for
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


@app.get("/companies")
def companies(service: Optional[str] = None):
    if service in SERVICE_KEYS:
        return [company for company in COMPANIES if service in company["services"]]
    return COMPANIES


@app.get("/labs")
def labs():
    return LAB_TESTS


@app.get("/imaging")
def imaging():
    return IMAGING_TESTS


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
        return {"saved": False, "reason": "not_configured", "lists": ["Reya Bookings", "Reya Booking Tests"]}
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
