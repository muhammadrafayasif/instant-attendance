import { useState, useEffect } from "react";
import "./App.css";

const Form = () => {
  const [formData, setFormData] = useState({
    userID: "",
    password: "",
    captcha: "",
  });

  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [captchaUrl, setCaptchaUrl] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaLoading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCaptcha() {
      setLoading(true);

      try {
        const res = await fetch(
          "https://neduet-attendance-backend.vercel.app/captcha",
          {
            credentials: "omit",
          },
        );

        const token: any = res.headers.get("X-Session-Token");
        const blob = await res.blob();

        setCaptchaToken(token);
        if (token) setCaptchaUrl(URL.createObjectURL(blob));
      } catch (err: any) {
        console.error(err);
      }
      setLoading(false);
    }

    loadCaptcha();
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
      const formBody = new FormData();
      formBody.append("token", captchaToken || "");
      formBody.append("userID", formData.userID);
      formBody.append("password", formData.password);
      formBody.append("captcha", formData.captcha);

      const response = await fetch(
        "https://neduet-attendance-backend.vercel.app/attendance",
        {
          method: "POST",
          credentials: "include",
          body: formBody,
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
            <img src="/loading.gif" height={25}></img>
          ) : (
            <img src={captchaUrl || "/error.png"} height={25}></img>
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

        {message && <div className={`status-message ${status}`}>{message}</div>}
      </form>
    </div>
  );
};

export default Form;
