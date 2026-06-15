from fastapi import FastAPI, HTTPException, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import dotenv, httpx, json, os

dotenv.load_dotenv()

class LoginData(BaseModel):
    token: str
    userID: str
    password: str
    captcha: str

# Load environment variables
CAPTCHA = os.getenv("CAPTCHA")
PORTAL = os.getenv("PORTAL")
REQUEST = os.getenv("REQUEST")
PDF = os.getenv("PDF")
TRANSCRIPT = os.getenv("TRANSCRIPT")
CODE = os.getenv("CODE")
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
    async with httpx.AsyncClient(timeout=30.0) as client:
        captcha_res = await client.get(CAPTCHA)
        session_id = captcha_res.cookies.get(SESSION_ID)

        if not session_id:
            raise HTTPException(status_code=500, detail="Could not retrieve SESSION ID")

        response = Response(content=captcha_res.content, media_type="image/png")
        response.headers["X-Session-Token"] = session_id
        return response

@app.get("/fetch")
async def login(
    x_token: str = Header(...),
    x_user_id: str = Header(...),
    x_password: str = Header(...),
    x_captcha: str = Header(...),
    x_type: str = Header(...)
):
    try:

        REQUEST_DATA = json.loads(
            REQUEST % (x_user_id, x_password, x_captcha)
        )

        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0
        ) as client:

            client.cookies.set(SESSION_ID, x_token)

            login_res = await client.post(
                PORTAL,
                data=REQUEST_DATA
            )

            if b"Please provide correct" in login_res.content:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid credentials or CAPTCHA :/"
            )

            if x_type == "attendance":
                pdf_res = await client.get(PDF % x_user_id)
                if pdf_res.headers.get("Content-Length") == "0":
                    raise HTTPException(
                        status_code=404,
                        detail="Can't find attendance D:"
                    )

                return Response(
                    content=pdf_res.content,
                    media_type="application/pdf"
                )
        
            elif x_type == "transcript":
                exam_id = login_res.text.split(CODE)[-1].split('"')[0]
                transcript_res = await client.get(TRANSCRIPT % (x_user_id, exam_id))

                if transcript_res.status_code == 401:
                    raise HTTPException(
                        status_code=401,
                        detail="Session expired :/"
                    )

                return Response(
                    content=transcript_res.content,
                    media_type="application/pdf"
                )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Portal timed out D: Try again later :)"
        )

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Portal request failed: {str(e)}, please try again later :)"
        )

    except HTTPException:
        raise

    except Exception as e:
        print("Internal Server Error:", e)

        raise HTTPException(
            status_code=500,
            detail="Something went wrong O_O, please try again later :)"
        )