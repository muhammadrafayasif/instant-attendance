# NEDUET Instant Attendance
This is a FastAPI based application that simply serves your attendance PDF to your web browser after successful login.

### Why?
The official portal makes it difficult to view your attendance without downloading a file and renaming it (Fairly difficult on mobile). This program simply displays your attendance without all the extra work.

## Tech Stack
- Python
- FastAPI
- httpx
- Vercel (For deployment)

## Installation
1. Clone the repository
```
git clone https://github.com/muhammadrafayasif/instant-attendance.git
cd instant-attendance
```
2. (Optional) Create a virtual environment
```
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
```
3. Install dependencies
```
python -m pip install -r requirements.txt
```
4. Run locally
```
python -m uvicorn api.index:app
```

## How to use?
Simply login to the portal using the ID and password you use in the official portal. Once you've logged in, the app will fetch your attendance and serve it through your web browser.

## How does it work?
> This application does not have access to official databases!

- The application logs in for you from the official portal
- Through the home page, It accesses the attendance PDF
- It serves it to you through the browser

Thats it!

# License
This project is released under the [MIT License](LICENSE).

Feel free to modify and adapt it for your institution or personal use.