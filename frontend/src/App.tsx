import { useState, useEffect } from "react";
import "./App.css";

const getRandomNumber = (): number => {
  return Math.floor(Math.random() * 2) + 1;
};

const Form = () => {
  const [formData, setFormData] = useState({
    userID: "",
    password: "",
    captcha: "",
  });

  const [status, setStatus] = useState("idle");
  const [randomizedGIF] = useState(getRandomNumber());
  const [message, setMessage] = useState<string | null>(null);
  const [captchaUrl, setCaptchaUrl] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaLoading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCaptcha() {
      setLoading(true);

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/captcha`,
        {
          credentials: "omit",
        },
      );

      const token: any = res.headers.get("X-Session-Token");
      const blob = await res.blob();

      setCaptchaToken(token);
      setCaptchaUrl(URL.createObjectURL(blob));
      setLoading(false);
    }

    loadCaptcha();
  }, []);

  useEffect(() => {
    // Preload the loading GIF
    const img = new Image();
    img.src = `/searching${randomizedGIF}.gif`;
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("Fetching attendance");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/attendance`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            token: captchaToken || "",
            userID: formData.userID,
            password: formData.password,
            captcha: formData.captcha
          }),
        },
      );

      if (!response.ok) {
        const text = await response.json();
        throw new Error(text.detail);
      }

      const blob = await response.blob();
      const pdfUrl = window.URL.createObjectURL(blob);

      setStatus("success");
      setMessage("Fetched attendance successfully");
      window.open(pdfUrl, "_blank");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Unable to load PDF");
    }
  };

  return (
    <div className="container">
      <div
        className="github-banner"
        onClick={() =>
          window.open(
            "https://github.com/muhammadrafayasif/instant-attendance",
            "_blank",
          )
        }
      >
        <img src="/github.png" alt="GitHub" />
        View on GitHub
      </div>
      <form className="form" onSubmit={handleForm}>
        <h2>NEDUET Instant Attendance</h2>
        <p>Login to your undergraduate portal to view your attendance.</p>

        <label>Student ID</label>
        <input
          type="username"
          name="userID"
          value={formData.userID}
          onChange={handleChange}
          required
          placeholder="Enter Portal ID"
        />

        <label>Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          placeholder="Enter Password"
        />

        <label>CAPTCHA</label>
        <div className="captcha-container">
          {captchaLoading ? (
            <img src="/loading.gif" height={25} alt="Loading CAPTCHA..."></img>
          ) : (
            <img src={captchaUrl || "/error.png"} height={25} alt="CAPTCHA"></img>
          )}
        </div>
        <input
          type="captcha"
          name="captcha"
          value={formData.captcha}
          onChange={handleChange}
          required
          placeholder="Enter CAPTCHA"
        />

        <button type="submit">Login</button>

        {
          status === "loading" && (
          <>
            <p style={{ marginTop: 20, color: "darkorange", textAlign: "center" }}>Searching for your attendance...</p>
            <img alt="Fetching your attendance..." src={`/searching${randomizedGIF}.gif`} height={150} style={{ marginTop: 20, display: "block", marginLeft: "auto", marginRight: "auto" }}/>
          </>
        )
        }

        {
          status === "error" && (
            <p style={{ marginTop: 20, color: "red", textAlign: "center" }}>{message}</p>
          )
        }

        {
          status === "success" && (
            <p style={{ marginTop: 20, color: "green", textAlign: "center" }}>{message} <br/> (Allow pop-ups to open the PDF) </p>
          )
        }
      </form>
    </div>
  );
};

export default Form;
