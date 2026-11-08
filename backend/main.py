import hashlib
import hmac
import os
import time
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from catalog import IMAGING_QUESTIONNAIRES, IMAGING_TESTS, LAB_QUESTIONNAIRES, LAB_TESTS, SHARED_QUESTIONS, questionnaires_for
from checks import booking_info_errors
from portal_store import (
    add_test,
    businesses_for_kind,
    find_login,
    get_business,
    import_test_rows,
    issue_invite,
    list_businesses,
    load,
    miles_between_zips,
    office_settings,
    parse_table,
    public_tests,
    quote_for_miles,
    register_business,
    remove_test,
    save_content,
    save_office_rules,
    save_questions,
    saved_questions,
    set_price,
)
from orders import OrderError, prepare_order, read_order
from patients import (
    PatientError,
    account_from_token,
    add_doctor_note,
    add_document,
    add_message,
    add_office_message,
    add_office_result,
    mark_messages_read,
    update_profile,
    login as patient_login,
    read_document,
    record_visit,
    signup as patient_signup,
    token_for,
    visits_for_business,
    visits_for_patient,
)
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


def area_quote(zip_code: str, service: str | None = None, business: str | None = None) -> dict:
    code = "".join(character for character in zip_code if character.isdigit())[:5]
    office = get_business(business) if business else None
    if office is None and service in {"lab", "imaging"}:
        matches = businesses_for_kind(service)
        office = matches[0] if len(matches) == 1 else None
    if office is None or office.get("kind") not in {"lab", "imaging"}:
        if service in {"lab", "imaging"} and not business:
            return service_coverage(code, service)
        return {"zip": code, "served": zip_served(code), "area": AREA, "miles": None}
    base = office.get("base_zip") or "60611"
    miles = miles_between_zips(base, code) if len(code) == 5 else None
    if miles is None:
        served = zip_served(code)
        return {"zip": code, "served": served, "area": AREA, "miles": None, "service": office["kind"], "business": office["id"]}
    quote = quote_for_miles(miles, office["id"])
    quote.update({
        "zip": code,
        "service": office["kind"],
        "business": office["id"],
        "area": quote.get("reason") or f"Within {quote.get('limit')} miles of {base}",
    })
    return quote


def service_coverage(code: str, service: str) -> dict:
    quotes = []
    for office in businesses_for_kind(service):
        quotes.append(area_quote(code, service, office["id"]))
    serving = [row for row in quotes if row.get("served")]
    if len(serving) == 1:
        return serving[0]
    if serving:
        return {
            "zip": code,
            "served": True,
            "service": service,
            "miles": None,
            "area": "One or more registered businesses serve this ZIP. Each sets its own price.",
        }
    if quotes:
        return {"zip": code, "served": False, "service": service, "area": quotes[0].get("reason") or AREA, "miles": quotes[0].get("miles")}
    return {"zip": code, "served": False, "service": service, "area": AREA, "miles": None}


@app.get("/coverage")
def coverage(zip: str = Query(...), service: Optional[str] = None, business: Optional[str] = None):
    return area_quote(zip, service, business)


@app.get("/quote")
def quote(zip: str = Query(...), service: Optional[str] = None, business: Optional[str] = None):
    return area_quote(zip, service, business)


def all_companies():
    rows = [company for company in COMPANIES if company["id"] not in {"reya-lab", "reya-imaging"}]
    for business in list_businesses():
        rows.append(
            {
                "id": business["id"],
                "name": business["name"],
                "services": [business["kind"]],
                "book": "flow",
                "url": None,
            }
        )
    return rows


@app.get("/companies")
def companies(service: Optional[str] = None, zip: Optional[str] = None):
    rows = all_companies()
    if service in SERVICE_KEYS:
        rows = [company for company in rows if service in company["services"]]
    if zip and service in {"lab", "imaging"}:
        available = []
        for company in rows:
            if company["book"] != "flow":
                available.append(company)
                continue
            decision = area_quote(zip, service, company["id"])
            if decision.get("served"):
                available.append({**company, **decision})
        return available
    return rows


@app.get("/labs")
def labs(business: Optional[str] = None):
    return public_tests(business or "reya-lab")


@app.get("/imaging")
def imaging(business: Optional[str] = None):
    return public_tests(business or "reya-imaging")


@app.get("/pricing")
def pricing():
    data = load()
    return {"service": data.get("service"), "bands": data.get("bands") or []}


class TransportInput(BaseModel):
    miles: float = 0


class OfficeLogin(BaseModel):
    email: str
    password: str


class MileBand(BaseModel):
    from_miles: float
    to_miles: float
    extra: float


class PricingRules(BaseModel):
    base_zip: str
    transport_fee: float
    bands: List[MileBand]


class TestInput(BaseModel):
    code: str
    name: str
    kind: str
    cpt: str = ""
    price: float = 0
    summary: str = ""


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


def token_secret() -> str:
    return os.environ.get("OFFICE_TOKEN_SECRET", "ReyaOfficeToken2026")


def office_token(email: str, business_id: str) -> str:
    expires = str(int(time.time()) + 60 * 60 * 12)
    payload = f"{email}|{business_id}|{expires}"
    signature = hmac.new(token_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}|{signature}"


def require_office(token: str) -> dict:
    parts = (token or "").split("|")
    if len(parts) != 4:
        raise HTTPException(status_code=401, detail="Sign in to the back office again.")
    email, business_id, expires, signature = parts
    office = get_business(business_id)
    payload = f"{email}|{business_id}|{expires}"
    expected = hmac.new(token_secret().encode(), payload.encode(), hashlib.sha256).hexdigest()
    if office is None or not hmac.compare_digest(signature, expected) or int(expires) < time.time():
        raise HTTPException(status_code=401, detail="Sign in to the back office again.")
    return office


@app.post("/office/login")
def office_login(body: OfficeLogin):
    found = find_login(body.email, body.password)
    if not found:
        raise HTTPException(status_code=401, detail="That email or password is not recognized.")
    office, role = found
    return {
        "token": office_token(body.email.strip().lower(), office["id"]),
        "email": body.email.strip().lower(),
        "role": office["kind"],
        "business_id": office["id"],
        "business_name": office["name"],
        "staff_role": role,
    }


def question_groups(business_id: str, kind: str, tests: list[dict]) -> tuple[list, list]:
    blocks = LAB_QUESTIONNAIRES if kind == "lab" else IMAGING_QUESTIONNAIRES
    general = saved_questions(business_id, "general")
    if general is None:
        general = SHARED_QUESTIONS
    groups = []
    seen = set()
    for item in tests:
        key = item.get("questionnaire_key") or item["code"]
        if key in seen:
            continue
        seen.add(key)
        default = blocks.get(key) or {"title": item["name"], "questions": []}
        edited = saved_questions(business_id, key)
        groups.append(
            {
                "key": key,
                "title": default.get("title") or item["name"],
                "questions": edited if edited is not None else default.get("questions") or [],
            }
        )
    return general, groups


def office_tests(office: dict) -> list[dict]:
    rows = []
    for item in public_tests(office["id"]):
        rows.append(
            {
                "code": item["code"],
                "name": item["name"],
                "kind": office["kind"],
                "cpt": item.get("cpt") or "",
                "price": item["price"],
                "summary": item.get("summary") or "",
                "sections": item.get("sections") or [],
                "questionnaire_key": item.get("questionnaire_key") or item["code"],
            }
        )
    return rows


@app.get("/office/catalog")
def office_catalog(token: str = Query(...)):
    office = require_office(token)
    tests = office_tests(office)
    general, groups = question_groups(office["id"], office["kind"], tests)
    return {
        "role": office["kind"],
        "business_id": office["id"],
        "business_name": office["name"],
        "service": {"base_zip": office.get("base_zip"), "transport_fee": office.get("transport_fee")},
        "bands": office.get("bands") or [],
        "tests": tests,
        "general_questions": general,
        "question_groups": groups,
        "staff": [
            {"email": person.get("email"), "name": person.get("name"), "role": person.get("role")}
            for person in office.get("staff") or []
        ],
        "email_ready": bool(os.environ.get("SMTP_HOST", "").strip()),
    }


@app.put("/office/rules")
def office_rules(body: PricingRules, token: str = Query(...)):
    office = require_office(token)
    if not body.bands:
        raise HTTPException(status_code=400, detail="Add at least one mileage rule.")
    saved = save_office_rules(
        office["id"],
        "".join(ch for ch in body.base_zip if ch.isdigit())[:5],
        body.transport_fee,
        [band.model_dump() for band in body.bands],
    )
    return {"service": {"base_zip": saved["base_zip"], "transport_fee": saved["transport_fee"]}, "bands": saved["bands"]}


@app.post("/office/tests")
def office_add_test(body: TestInput, token: str = Query(...)):
    office = require_office(token)
    if not body.code.strip() or not body.name.strip():
        raise HTTPException(status_code=400, detail="Enter a code and a name.")
    return add_test(office["id"], body.model_dump())


@app.delete("/office/tests")
def office_remove_test(code: str, token: str = Query(...)):
    office = require_office(token)
    known = {item["code"] for item in public_tests(office["id"])}
    if code not in known:
        raise HTTPException(status_code=404, detail="That test is not in this business.")
    remove_test(office["id"], code)
    return {"removed": code}


@app.post("/office/tests/upload")
async def office_upload_tests(token: str = Query(...), file: UploadFile = File(...)):
    office = require_office(token)
    raw = await file.read()
    try:
        rows = parse_table(file.filename or "tests.csv", raw)
    except Exception as error:
        raise HTTPException(status_code=400, detail="Use a CSV or Excel file with the header row.") from error
    return import_test_rows(rows, office["id"])


class ContentUpdate(BaseModel):
    code: str
    summary: str = ""
    sections: list = Field(default_factory=list)


class QuestionUpdate(BaseModel):
    key: str
    questions: list


@app.put("/office/prices")
def office_prices(body: PriceUpdate, token: str = Query(...)):
    office = require_office(token)
    if body.code not in {item["code"] for item in public_tests(office["id"])}:
        raise HTTPException(status_code=404, detail="That test is not in this business.")
    set_price(office["id"], body.code, body.price)
    return {"code": body.code, "price": body.price}


@app.put("/office/content")
def office_content(body: ContentUpdate, token: str = Query(...)):
    office = require_office(token)
    if body.code not in {item["code"] for item in public_tests(office["id"])}:
        raise HTTPException(status_code=404, detail="That test is not in this business.")
    save_content(office["id"], body.code, body.summary, body.sections)
    return {"code": body.code}


@app.put("/office/questions")
def office_questions(body: QuestionUpdate, token: str = Query(...)):
    office = require_office(token)
    tests = public_tests(office["id"])
    allowed = {"general"}
    allowed.update(item.get("questionnaire_key") or item["code"] for item in tests)
    if body.key not in allowed:
        raise HTTPException(status_code=404, detail="Those questions belong to another business.")
    save_questions(office["id"], body.key, body.questions)
    return {"key": body.key, "count": len(body.questions)}


@app.post("/office/businesses")
def office_business(body: BusinessSetup, token: str = Query(...)):
    office = require_office(token)
    kind = office["kind"]
    if not body.name.strip() or "@" not in body.email:
        raise HTTPException(status_code=400, detail="Enter a business name and an email for its office login.")
    try:
        created = register_business(body.name, body.email, kind)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    return {
        "id": created["id"],
        "name": created["name"],
        "email": created["email"],
        "password": created["password"],
        "services": [created["kind"]],
    }


@app.post("/office/invites")
def office_invite(body: InviteRequest, token: str = Query(...)):
    office = require_office(token)
    if body.role not in {"provider", "staff"}:
        raise HTTPException(status_code=400, detail="Choose a provider or staff login.")
    if "@" not in body.email:
        raise HTTPException(status_code=400, detail="Enter an email address.")
    try:
        invite = issue_invite(office["id"], body.email, body.role, body.name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
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
    preferred: str = ""
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
    business: str = ""
    service: str = ""
    zip: str = ""
    address: str = ""
    order: str = ""
    order_file: str = ""
    order_content: str = ""
    order_content_type: str = ""
    patient_token: str = ""
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
    if booking.labs and booking.imaging:
        raise HTTPException(status_code=400, detail="Lab and imaging are billed separately. Book one service at a time.")
    office = get_business(booking.business) if booking.business else None
    if office and office.get("kind") == "lab" and booking.imaging:
        raise HTTPException(status_code=400, detail="This visit belongs to one business. Remove imaging tests.")
    if office and office.get("kind") == "imaging" and booking.labs:
        raise HTTPException(status_code=400, detail="This visit belongs to one business. Remove lab tests.")
    payload = booking.model_dump()
    info_errors = booking_info_errors(payload.get("info") or {})
    if info_errors:
        raise HTTPException(status_code=400, detail=info_errors[0])
    patient_token = payload.pop("patient_token", "")
    try:
        order = prepare_order(payload)
    except OrderError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    payload.update(order)
    visit_id = ""
    if patient_token:
        try:
            visit_id = record_visit(patient_token, payload, order)["id"]
        except PatientError as error:
            raise HTTPException(status_code=401, detail=str(error)) from None
    result = {
        "saved": False,
        "reason": "not_configured",
        "order_id": order["order_id"],
        "order_file": order["order_file"],
        "visit_id": visit_id,
    }
    if not configured():
        return result
    share_payload = {key: value for key, value in payload.items() if key != "patient_token"}
    try:
        saved = save_booking(share_payload)
    except SharePointError as error:
        raise HTTPException(status_code=502, detail=str(error)) from None
    saved.update(order_id=order["order_id"], order_file=order["order_file"], visit_id=visit_id)
    return saved


class PatientAccount(BaseModel):
    name: str = ""
    email: str = ""
    password: str = ""


class PatientFile(BaseModel):
    visit_id: str = ""
    name: str = ""
    content_type: str = ""
    content: str = ""


class PatientNote(BaseModel):
    visit_id: str = ""
    body: str = ""


class PatientProfile(BaseModel):
    phone: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    zip: str = ""
    dob: str = ""
    pharmacy_name: str = ""
    pharmacy_phone: str = ""
    pharmacy_address: str = ""


def require_patient(token: str) -> dict:
    try:
        return account_from_token(token)
    except PatientError as error:
        raise HTTPException(status_code=401, detail=str(error)) from None


@app.post("/patient/signup")
def patient_signup_route(body: PatientAccount):
    try:
        account = patient_signup(body.name, body.email, body.password)
    except PatientError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    return {**account, "token": token_for(account["id"])}


@app.post("/patient/login")
def patient_login_route(body: PatientAccount):
    try:
        account = patient_login(body.email, body.password)
    except PatientError as error:
        raise HTTPException(status_code=401, detail=str(error)) from None
    return {**account, "token": token_for(account["id"])}


@app.get("/patient/visits")
def patient_visits(token: str = Query(...)):
    require_patient(token)
    try:
        return visits_for_patient(token)
    except PatientError as error:
        raise HTTPException(status_code=401, detail=str(error)) from None


@app.post("/patient/documents")
def patient_document(body: PatientFile, token: str = Query(...)):
    require_patient(token)
    try:
        return add_document(token, body.visit_id, body.name, body.content_type, body.content)
    except PatientError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None


@app.put("/patient/profile")
def patient_profile(body: PatientProfile, token: str = Query(...)):
    require_patient(token)
    try:
        return update_profile(token, body.model_dump())
    except PatientError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None


@app.post("/patient/messages/read")
def patient_messages_read(token: str = Query(...)):
    require_patient(token)
    try:
        return mark_messages_read(token)
    except PatientError as error:
        raise HTTPException(status_code=401, detail=str(error)) from None


@app.post("/patient/messages")
def patient_message(body: PatientNote, token: str = Query(...)):
    require_patient(token)
    try:
        return add_message(token, body.visit_id, body.body)
    except PatientError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None


@app.get("/patient/files/{doc_id}")
def patient_file(doc_id: str, token: str = Query(...)):
    require_patient(token)
    try:
        found = read_document(doc_id, token=token)
    except PatientError as error:
        raise HTTPException(status_code=404, detail=str(error)) from None
    if found is None:
        raise HTTPException(status_code=404, detail="That file is not available.")
    path, name, content_type = found
    return FileResponse(path, media_type=content_type, filename=name)


@app.get("/office/patients")
def office_patients(token: str = Query(...)):
    office = require_office(token)
    return {"visits": visits_for_business(office["id"])}


@app.post("/office/notes")
def office_note(body: PatientNote, token: str = Query(...)):
    office = require_office(token)
    try:
        return add_doctor_note(body.visit_id, office["id"], office.get("name") or "Care team", body.body)
    except PatientError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None


@app.post("/office/messages")
def office_message(body: PatientNote, token: str = Query(...)):
    office = require_office(token)
    try:
        return add_office_message(body.visit_id, office["id"], office.get("name") or "Care team", body.body)
    except PatientError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None


@app.post("/office/results")
def office_result(body: PatientFile, token: str = Query(...)):
    office = require_office(token)
    try:
        return add_office_result(body.visit_id, office["id"], body.name, body.content_type, body.content)
    except PatientError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None


@app.get("/office/files/{doc_id}")
def office_file(doc_id: str, token: str = Query(...)):
    office = require_office(token)
    try:
        found = read_document(doc_id, business_id=office["id"])
    except PatientError as error:
        raise HTTPException(status_code=404, detail=str(error)) from None
    if found is None:
        raise HTTPException(status_code=404, detail="That file is not available.")
    path, name, content_type = found
    return FileResponse(path, media_type=content_type, filename=name)


@app.get("/orders/{order_id}")
def download_order(order_id: str):
    found = read_order(order_id)
    if found is None:
        raise HTTPException(status_code=404, detail="That order is not available.")
    path, name, content_type = found
    return FileResponse(path, media_type=content_type, filename=name)


@app.get("/questionnaires")
def questionnaires(
    lab: Optional[List[str]] = Query(default=None),
    imaging: Optional[List[str]] = Query(default=None),
    service: Optional[str] = None,
    business: Optional[str] = None,
):
    return {
        "sections": questionnaires_for(
            lab_codes=lab or [],
            imaging_codes=imaging or [],
            service=service,
            business=business,
        ),
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
