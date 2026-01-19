from fastapi import FastAPI, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
import dotenv, httpx, os, json, uuid, upstash_redis

dotenv.load_dotenv()

redis = upstash_redis.Redis(
    url=os.getenv("REDIS_URL"),
    token=os.getenv("REDIS_TOKEN")
)

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
    expose_headers=["X-Session-Token"]
)

@app.get("/captcha")
async def get_captcha():
    async with httpx.AsyncClient() as client:
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
    token: str = Form(...),
    userID: str = Form(...),
    password: str = Form(...),
    captcha: str = Form(...)
):
    SESSION = redis.get(token)
    REQUEST_DATA = json.loads(REQUEST % (userID, password, captcha))

    if not SESSION:
        raise HTTPException(status_code=400, detail="Session expired :(")
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        client.cookies.set(SESSION_ID, SESSION)

        login_res = await client.post(PORTAL, data=REQUEST_DATA)

        if b"Please provide correct" in login_res.content:
            raise HTTPException(status_code=401, detail="Invalid credentials or CAPTCHA :/")

        pdf_res = await client.get(PDF % userID)

    if not pdf_res.content:
        raise HTTPException(status_code=404, detail="Can't find attendance D:")

    return Response(content=pdf_res.content, media_type="application/pdf")