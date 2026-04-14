import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import "./App.css";

const API_BASE = "https://neduet-attendance-backend.vercel.app";
const CACHE_REFRESH_NOTE = "Fetching source attendance...";

type CacheStatusResponse = {
  cached: boolean;
  refreshing: boolean;
  updatedAt: string | null;
  hash: string | null;
  refreshError?: string | null;
};

const Form = () => {
  const isAndroid =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  const [formData, setFormData] = useState({
    userID: "",
    password: "",
    captcha: "",
  });

  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfRemoteUrl, setPdfRemoteUrl] = useState<string | null>(null);
  const [captchaUrl, setCaptchaUrl] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaLoading, setLoading] = useState(true);

  const pollIntervalRef = useRef<number | null>(null);
  const currentPdfUrlRef = useRef<string | null>(null);
  const currentPdfHashRef = useRef<string | null>(null);
  const pollAttemptsRef = useRef(0);

  const stopPolling = () => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const setPdfBlob = (blob: Blob) => {
    if (currentPdfUrlRef.current) {
      URL.revokeObjectURL(currentPdfUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(blob);
    currentPdfUrlRef.current = nextUrl;
    setPdfUrl(nextUrl);
  };

  const startPollingForUpdate = (userID: string, initialHash: string | null) => {
    stopPolling();
    currentPdfHashRef.current = initialHash;
    pollAttemptsRef.current = 0;

    pollIntervalRef.current = window.setInterval(async () => {
      pollAttemptsRef.current += 1;

      if (pollAttemptsRef.current > 18) {
        stopPolling();
        setCacheNotice(null);
        return;
      }

      try {
        const statusRes = await fetch(
          `${API_BASE}/attendance/cache-status/${encodeURIComponent(userID)}`,
        );

        if (!statusRes.ok) {
          return;
        }

        const cacheStatus = (await statusRes.json()) as CacheStatusResponse;

        if (cacheStatus.refreshError) {
          stopPolling();
          setCacheNotice(null);
          setMessage(cacheStatus.refreshError);
          setStatus("error");
          return;
        }

        if (cacheStatus.hash && cacheStatus.hash !== currentPdfHashRef.current) {
          const refreshedPdfRes = await fetch(
            `${API_BASE}/attendance/cache/${encodeURIComponent(userID)}`,
          );

          if (!refreshedPdfRes.ok) {
            return;
          }

          const refreshedBlob = await refreshedPdfRes.blob();
          setPdfBlob(refreshedBlob);
          currentPdfHashRef.current = cacheStatus.hash;
          setCacheNotice("Source attendance fetched and cache updated.");
          setStatus("success");
          setMessage("Fetched source attendance!");
          stopPolling();
        } else if (!cacheStatus.refreshing && pollAttemptsRef.current > 4) {
          stopPolling();
        }
      } catch (err) {
        console.error(err);
      }
    }, 4000);
  };

  useEffect(() => {
    async function loadCaptcha() {
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}/captcha`, {
          credentials: "omit",
        });

        const token = res.headers.get("X-Session-Token");
        const blob = await res.blob();

        setCaptchaToken(token);
        if (token) setCaptchaUrl(URL.createObjectURL(blob));
      } catch (err: any) {
        console.error(err);
      }
      setLoading(false);
    }

    loadCaptcha();
    return () => {
      stopPolling();

      if (currentPdfUrlRef.current) {
        URL.revokeObjectURL(currentPdfUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (captchaUrl) {
        URL.revokeObjectURL(captchaUrl);
      }
    };
  }, [captchaUrl]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("Fetching attendance");
    setCacheNotice(null);

    try {
      const formBody = new FormData();
      formBody.append("token", captchaToken || "");
      formBody.append("userID", formData.userID);
      formBody.append("password", formData.password);
      formBody.append("captcha", formData.captcha);

      const response = await fetch(`${API_BASE}/attendance`, {
        method: "POST",
        credentials: "include",
        body: formBody,
      });

      if (!response.ok) {
        const text = await response.json();
        throw new Error(text.detail);
      }

      const pdfSource = response.headers.get("X-PDF-Source") || "fresh";
      const pdfHash = response.headers.get("X-PDF-Hash");
      const cacheKey = response.headers.get("X-PDF-Cache-Key") || formData.userID;
      const blob = await response.blob();
      setPdfBlob(blob);
      setPdfRemoteUrl(
        `${API_BASE}/attendance/cache/${encodeURIComponent(cacheKey)}`,
      );

      stopPolling();
      currentPdfHashRef.current = pdfHash;

      if (pdfSource === "cache") {
        setStatus("success");
        setMessage("Fetched cached attendance.");
        setCacheNotice(CACHE_REFRESH_NOTE);
        startPollingForUpdate(cacheKey, pdfHash);
        return;
      }

      setStatus("success");
      setMessage("Fetched attendance successfully");
      setCacheNotice(null);
    } catch (err: any) {
      console.error(err);
      stopPolling();
      setStatus("error");
      setMessage(err.message || "Unable to load PDF");
    }
  };

  return (
    <div className="container">
      <div className="content-grid">
        <form className="form" onSubmit={handleForm}>
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
              <img src="/loading.gif" height={25} alt="Loading CAPTCHA" />
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

          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Loading..." : "Login"}
          </button>

          {message && <div className={`status-message ${status}`}>{message}</div>}
        </form>

        <section className="viewer-panel">
          {cacheNotice && <div className="cache-note">{cacheNotice}</div>}

          <div className="pdf-frame">
            {pdfUrl ? (
              isAndroid ? (
                <div className="pdf-mobile-actions">
                  <p>
                    PDF preview is limited on some browsers. Use the
                    button below to open it directly.
                  </p>
                  <a
                    className="pdf-action-btn"
                    href={pdfRemoteUrl || pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open PDF
                  </a>
                  <a
                    className="pdf-action-btn secondary"
                    href={pdfRemoteUrl || pdfUrl}
                    download="attendance.pdf"
                  >
                    Download PDF
                  </a>
                </div>
              ) : (
                <iframe title="Attendance PDF" src={pdfUrl} />
              )
            ) : (
              <div className="pdf-placeholder">
                Your attendance PDF will appear here after login.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Form;
