# NED Attendance | NEDUET Instant Attendance
An open-source FastAPI application that lets NED University students view their attendance PDF in the browser after signing in. It removes the need to download and rename the file, especially on mobile.

### Why?
The official portal makes it difficult to view your NED attendance without downloading a file and renaming it. This project displays the attendance directly in your browser without the extra work.

## Tech Stack
- Python
- FastAPI
- httpx
- Upstash Redis
- Vercel

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
> This application does not have access to official databases and is done through requests!

- The application logs in for you from the official portal
- Through the home page, It accesses the attendance PDF
- It serves it to you through the browser

Thats it!

# License
This project is released under the [MIT License](LICENSE).

Feel free to modify and adapt it for your institution or personal use.
