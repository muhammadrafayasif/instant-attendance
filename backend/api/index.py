from fastapi import BackgroundTasks, FastAPI, Form, HTTPException, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import base64, datetime, dotenv, hashlib, httpx, json, os, uuid, upstash_redis

dotenv.load_dotenv()

redis = upstash_redis.Redis(
    url=os.getenv("REDIS_URL"),
    token=os.getenv("REDIS_TOKEN")
)

CACHE_TTL_SECONDS = 60 * 60 * 24 * 3
PDF_CACHE_PREFIX = "attendance:pdf:"
META_CACHE_PREFIX = "attendance:meta:"

# Load environment variables
CAPTCHA = os.getenv("CAPTCHA")
PORTAL = os.getenv("PORTAL")
REQUEST = os.getenv("REQUEST")
PDF = os.getenv("PDF")
SESSION_ID = os.getenv("SESSION_ID")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://ned-attendance.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-Token", "X-PDF-Source", "X-PDF-Hash", "X-PDF-Updated-At", "X-PDF-Cache-Key", "X-PDF-Refresh-Requested"]
)


def pdf_cache_key(user_id: str):
    return f"{PDF_CACHE_PREFIX}{user_id}"


def meta_cache_key(user_id: str):
    return f"{META_CACHE_PREFIX}{user_id}"


def _normalize(value):
    if isinstance(value, bytes):
        return value.decode()
    return value


def _now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _encode_pdf(pdf_bytes: bytes):
    return base64.b64encode(pdf_bytes).decode("ascii")


def _decode_pdf(encoded_pdf):
    if not encoded_pdf:
        return None

    normalized = _normalize(encoded_pdf)
    try:
        return base64.b64decode(normalized.encode("ascii"))
    except Exception:
        return None


def _pdf_hash(pdf_bytes: bytes):
    return hashlib.sha256(pdf_bytes).hexdigest()


def _default_meta():
    return {
        "cached": False,
        "refreshing": False,
        "updatedAt": None,
        "hash": None,
    }


def _load_meta(user_id: str):
    raw_meta = _normalize(redis.get(meta_cache_key(user_id)))
    if not raw_meta:
        return _default_meta()

    try:
        meta = json.loads(raw_meta)
    except Exception:
        return _default_meta()

    default_meta = _default_meta()
    default_meta.update(meta)
    return default_meta


def _save_cache(user_id: str, pdf_bytes: bytes, source: str, refreshing: bool = False):
    meta = {
        "cached": True,
        "refreshing": refreshing,
        "updatedAt": _now_iso(),
        "hash": _pdf_hash(pdf_bytes),
        "source": source,
    }

    redis.setex(key=pdf_cache_key(user_id), value=_encode_pdf(pdf_bytes), seconds=CACHE_TTL_SECONDS)
    redis.setex(key=meta_cache_key(user_id), value=json.dumps(meta), seconds=CACHE_TTL_SECONDS)
    return meta


async def _fetch_attendance_pdf(session: str, user_id: str, password: str, captcha: str):
    request_data = json.loads(REQUEST % (user_id, password, captcha))

    async with httpx.AsyncClient(follow_redirects=True, timeout=None) as client:
        client.cookies.set(SESSION_ID, session)

        login_res = await client.post(PORTAL, data=request_data)

        if b"Please provide correct" in login_res.content:
            raise HTTPException(status_code=401, detail="Invalid credentials or CAPTCHA :/")

        pdf_res = await client.get(PDF % user_id)

    if not pdf_res.content:
        raise HTTPException(status_code=404, detail="Can't find attendance D:")

    return pdf_res.content


async def _refresh_cached_attendance(session: str, user_id: str, password: str, captcha: str):
    meta = _load_meta(user_id)
    meta["refreshing"] = True
    redis.setex(key=meta_cache_key(user_id), value=json.dumps(meta), seconds=CACHE_TTL_SECONDS)

    try:
        pdf_bytes = await _fetch_attendance_pdf(session, user_id, password, captcha)
    except Exception as exc:
        meta = _load_meta(user_id)
        meta["refreshing"] = False
        meta["refreshError"] = str(exc)
        redis.setex(key=meta_cache_key(user_id), value=json.dumps(meta), seconds=CACHE_TTL_SECONDS)
        return

    _save_cache(user_id, pdf_bytes, source="fresh", refreshing=False)


def _pdf_response(pdf_bytes: bytes, source: str, user_id: str, meta=None, refresh_requested: bool = False):
    meta = meta or _default_meta()
    response = Response(content=pdf_bytes, media_type="application/pdf")
    response.headers["X-PDF-Source"] = source
    response.headers["X-PDF-Cache-Key"] = user_id
    response.headers["X-PDF-Hash"] = meta.get("hash") or _pdf_hash(pdf_bytes)
    response.headers["X-PDF-Updated-At"] = meta.get("updatedAt") or _now_iso()
    response.headers["X-PDF-Refresh-Requested"] = "true" if refresh_requested else "false"
    return response

@app.get("/captcha")
async def get_captcha():
    async with httpx.AsyncClient(timeout=None) as client:
        captcha_res = await client.get(CAPTCHA)
        session_id = captcha_res.cookies.get(SESSION_ID)

        if not session_id:
            raise HTTPException(status_code=500, detail="Could not retrieve SESSION ID")

        token = str(uuid.uuid4())
        redis.setex(key=token, value=session_id, seconds=300)

        response = Response(content=captcha_res.content, media_type="image/png")
        response.headers["X-Session-Token"] = token
        return response

@app.post("/attendance")
async def login(
    background_tasks: BackgroundTasks,
    token: str = Form(...),
    userID: str = Form(...),
    password: str = Form(...),
    captcha: str = Form(...)
):
    SESSION = redis.get(token)
    if isinstance(SESSION, bytes):
        SESSION = SESSION.decode()

    if not SESSION:
        raise HTTPException(status_code=400, detail="Session expired :(")

    cached_pdf = _decode_pdf(redis.get(pdf_cache_key(userID)))
    cached_meta = _load_meta(userID)

    if cached_pdf:
        background_tasks.add_task(_refresh_cached_attendance, SESSION, userID, password, captcha)
        return _pdf_response(
            cached_pdf,
            source="cache",
            user_id=userID,
            meta=cached_meta,
            refresh_requested=True,
        )

    pdf_bytes = await _fetch_attendance_pdf(SESSION, userID, password, captcha)
    meta = _save_cache(userID, pdf_bytes, source="fresh", refreshing=False)
    return _pdf_response(pdf_bytes, source="fresh", user_id=userID, meta=meta, refresh_requested=False)


@app.get("/attendance/cache/{userID}")
async def get_cached_attendance(userID: str):
    cached_pdf = _decode_pdf(redis.get(pdf_cache_key(userID)))
    if not cached_pdf:
        raise HTTPException(status_code=404, detail="Cached attendance not found")

    meta = _load_meta(userID)
    return _pdf_response(cached_pdf, source="cache", user_id=userID, meta=meta, refresh_requested=bool(meta.get("refreshing")))


@app.get("/attendance/cache-status/{userID}")
async def get_cache_status(userID: str):
    cached_pdf = _decode_pdf(redis.get(pdf_cache_key(userID)))
    meta = _load_meta(userID)

    return JSONResponse(
        content={
            "cached": bool(cached_pdf),
            "refreshing": bool(meta.get("refreshing")),
            "updatedAt": meta.get("updatedAt"),
            "hash": meta.get("hash"),
            "refreshError": meta.get("refreshError"),
        }
    )

@app.get("/health")
def health():
    return {"ok": True}