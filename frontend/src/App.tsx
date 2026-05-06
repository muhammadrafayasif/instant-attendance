import { useEffect, useRef, useState } from "react";
import "./App.css";

const getRandomNumber = (): number => {
  return Math.floor(Math.random() * 2) + 1;
};

type ViewState = "login" | "loading" | "pdf";

const Form = () => {
  const [formData, setFormData] = useState({
    userID: "",
    password: "",
    captcha: "",
  });

  const [viewState, setViewState] = useState<ViewState>("login");
  const [randomizedGIF] = useState(getRandomNumber());
  const [message, setMessage] = useState<string | null>(null);
  const [captchaUrl, setCaptchaUrl] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaLoading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  const revokePdfUrl = () => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
  };

  const loadCaptcha = async () => {
    setLoading(true);

    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/captcha`,
      {
        credentials: "omit",
      },
    );

    const token = res.headers.get("X-Session-Token");
    const blob = await res.blob();

    setCaptchaToken(token);
    setCaptchaUrl(URL.createObjectURL(blob));
    setLoading(false);
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  useEffect(() => {
    // Preload the loading GIF
    const img = new Image();
    img.src = `/searching${randomizedGIF}.gif`;
  }, []);

  useEffect(() => {
    return () => {
      revokePdfUrl();
      if (captchaUrl) {
        URL.revokeObjectURL(captchaUrl);
      }
    };
  }, [captchaUrl]);

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
    setViewState("loading");
    setMessage("Fetching attendance");
    revokePdfUrl();

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
      pdfUrlRef.current = pdfUrl;

      setPdfUrl(pdfUrl);
      setViewState("pdf");
      setMessage(null);
    } catch (err: any) {
      console.error(err);
      setViewState("login");
      setMessage(err.message || "Unable to load PDF");
      await loadCaptcha();
    }
  };

  const handleBackToLogin = async () => {
    revokePdfUrl();
    setPdfUrl(null);
    setViewState("login");
    setMessage(null);
    setFormData({
      userID: "",
      password: "",
      captcha: "",
    });
    await loadCaptcha();
  };

  return (
    <div className="container">
      {viewState !== "pdf" && (
        <div
          className="github-banner"
          onClick={() =>
            window.open(
              "https://github.com/muhammadrafayasif/instant-attendance",
              "_blank",
            )
          }
        >
          <img src="/github.webp" alt="GitHub" />
          View on GitHub
        </div>
      )}

      {viewState === "pdf" ? (
        <section className="pdf-shell">
          <div className="pdf-toolbar">
            <button type="button" className="back-button" onClick={handleBackToLogin}>
              Back to login
            </button>
            <p>Attendance PDF is loaded below.</p>
          </div>
          <iframe
            className="pdf-frame"
            src={pdfUrl || undefined}
            title="Attendance PDF"
          />
        </section>
      ) : (
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

          {viewState !== "loading" && (
            <>
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
                  <img src="/loading.gif" height={25} alt="Loading CAPTCHA..." />
                ) : (
                  <img src={captchaUrl || "/error.png"} height={25} alt="CAPTCHA" />
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
            </>
          )}

          <button type="submit" disabled={viewState === "loading"}>
            {viewState === "loading" ? "Fetching..." : "Login"}
          </button>

          {viewState === "loading" && (
            <>
              <p className="status-message loading">Searching for your attendance...</p>
              <img
                alt="Fetching your attendance..."
                src={`/searching${randomizedGIF}.gif`}
                height={150}
                className="loading-illustration"
              />
            </>
          )}

          {message && viewState === "login" && (
            <p className="status-message error">{message}</p>
          )}
        </form>
      )}
    </div>
  );
};

export default Form;
