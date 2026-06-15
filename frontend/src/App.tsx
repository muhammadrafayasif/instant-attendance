import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowBigLeft, FolderOpen } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./App.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const getRandomNumber = (): number => {
  return Math.floor(Math.random() * 2) + 1;
};

type ViewState = "login" | "loading" | "pdf";

// ─── PDF Viewer ───────────────────────────────────────────────────────────────

const PdfViewer = ({ pdfUrl }: { pdfUrl: string }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setContainerWidth(node.getBoundingClientRect().width);
  }, []);

  return (
    <div ref={containerRef} className="pdf-viewer">
      <Document
        file={pdfUrl}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setPageNumber(1);
        }}
        onLoadError={(error) => console.error("PDF load error:", error)}
        loading={
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
              width: "100%",
            }}
          >
            <div
              style={{
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #ffcc00",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        }
      >
        <Page
          pageNumber={pageNumber}
          width={containerWidth || undefined}
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />
      </Document>

      {numPages > 1 && (
        <div className="pdf-pagination">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            ← Prev
          </button>
          <span>
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Form ────────────────────────────────────────────────────────────────

const Form = () => {
  const [formData, setFormData] = useState({
    userID: "",
    password: "",
    captcha: "",
  });

  const [viewState, setViewState] = useState<ViewState>("login");
  const [randomizedVal] = useState(getRandomNumber());
  const [message, setMessage] = useState<string | null>(null);
  const [captchaUrl, setCaptchaUrl] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaLoading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const [mode, setMode] = useState<"attendance" | "transcript">("attendance");

  const revokePdfUrl = () => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
  };

  const loadCaptcha = async () => {
    setLoading(true);

    const res = await fetch(`/api/captcha`, {
      credentials: "omit",
      headers: {
        "x-vercel-protection-bypass": "iO1IHNaVbjHLHgeiYrINy7wePHSq3JTo",
      }
    });

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
    const video = document.createElement("video");
    video.src = `/searching${randomizedVal}.mp4`;
    video.preload = "auto"; // tells browser to preload
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
    setMessage(`Fetching ${mode}`);
    revokePdfUrl();

    try {
      const response = await fetch(
        `/api/fetch`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "x-vercel-protection-bypass": "iO1IHNaVbjHLHgeiYrINy7wePHSq3JTo",
            "Content-Type": "application/json",
            "X-Token": captchaToken || "",
            "X-User-Id": formData.userID,
            "X-Password": formData.password,
            "X-Captcha": formData.captcha,
            "X-Type": mode,
          },
        }
      );

      if (!response.ok) {
        const text = await response.json();
        throw new Error(text.detail);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      pdfUrlRef.current = url;

      setPdfUrl(url);
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
          <img src="/github.webp" alt="GH" />
          Star on GitHub
        </div>
      )}

      {viewState === "pdf" ? (
        <section className="pdf-shell">
          <div className="pdf-toolbar">
            <div className="pdf-toolbar-left">
              <button
                type="button"
                className="back-button"
                onClick={handleBackToLogin}
              >
                <ArrowBigLeft size={18} />
              </button>
              <button
                type="button"
                className="open-button"
                onClick={() => window.open(pdfUrl || "", "_blank")}
              >
                <FolderOpen size={18} />
              </button>
            </div>
          </div>

          <PdfViewer pdfUrl={pdfUrl || ""} />
        </section>
      ) : (
        <form className="form" onSubmit={handleForm}>
          {viewState !== "loading" && (
            <div className="mode-switch" style={{ justifyContent: "center", marginBottom: "0.5rem" }}>
              <span className="mode-label">Attendance</span>
              <label className="switch" aria-label="Toggle mode">
                <input
                  type="checkbox"
                  role="switch"
                aria-checked={mode === "transcript"}
                checked={mode === "transcript"}
                onChange={(e) => setMode(e.target.checked ? "transcript" : "attendance")}
              />
              <span className="track">
                <span className="thumb" />
              </span>
            </label>
            <span className="mode-label">Transcript</span>
          </div>)}

          <h2 style={{ textAlign: "center" }}>{mode === "transcript" ? "NED Instant Transcript" : "NED Instant Attendance"}</h2>
          <p>{mode === "transcript" ? "Login to your undergraduate portal to view your transcript." : "Login to your undergraduate portal to view your attendance."}</p>

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
                  <img
                    src="/loading.gif"
                    height={25}
                    alt="Loading CAPTCHA..."
                  />
                ) : (
                  <img
                    src={captchaUrl || "/error.png"}
                    height={25}
                    alt="CAPTCHA"
                    onClick={() => loadCaptcha()}
                    style={{ cursor: "pointer" }}
                  />
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
              <p className="status-message loading">
                {`Searching for your ${mode}...`}
              </p>
              <video
                src={`/searching${randomizedVal}.mp4`}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: "100%" }}
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