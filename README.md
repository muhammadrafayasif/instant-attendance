<p align="center">
    <img src="frontend/public/favicon.png" height="100px" /> <br/>
</p>

# NED Fetch

An open-source FastAPI application that lets NED University students view their attendance/transcript PDF in the browser after signing in. It removes the need to download and rename the file, especially on mobile.

### Why?
The official portal makes it difficult to view your NED attendance without downloading a file and renaming it. This project displays the attendance directly in your browser without the extra work.

## Tech Stack
<img src="https://cdn.simpleicons.org/python/3776AB" alt="Python" title="Python" height="40" />
&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/fastapi/009688" alt="FastAPI" title="FastAPI" height="40" />
&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/react/61DAFB" alt="React.js" title="React.js" height="40" />
&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/vite/9135FF" alt="VITE" title="VITE" height="40" />
&nbsp;&nbsp;

## Deployment Stack

<img src="https://companieslogo.com/img/orig/ORCL-d5a587ae.png?t=1740130451" alt="Oracle Cloud" title="Oracle Cloud" height="40" />
&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/ubuntu/E95420" alt="Ubuntu" title="Ubuntu" height="40" />
&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/linux/FCC624" alt="Linux" title="Linux" height="40" />
&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/githubactions/2088FF" alt="GitHub Actions" title="GitHub Actions" height="40" />
&nbsp;&nbsp;
<img src="https://cdn.simpleicons.org/caddy/1F88C0" alt="Caddy" title="Caddy" height="40" />
&nbsp;&nbsp;

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
Simply login to the portal using the ID and password you use in the official portal. Once you've logged in, the app will fetch your attendance/transcript and serve it through your web browser as a live PDF.

## How does it work?
> This application does not have access to official databases and is done through requests!

- The application logs in for you from the official portal
- Through the home page, It accesses the attendance PDF
- It serves it to you through the browser

# License
This project is released under the [MIT License](LICENSE).

Feel free to modify and adapt it for your institution or personal use.