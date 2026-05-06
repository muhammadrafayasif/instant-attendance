import { useEffect, useRef, useState, useCallback } from "react";
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
        loading={<p>Loading PDF...</p>}
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

  const revokePdfUrl = () => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
  };

  const loadCaptcha = async () => {
    setLoading(true);

    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/captcha`, {
      credentials: "omit",
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
    setMessage("Fetching attendance");
    revokePdfUrl();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/attendance`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: captchaToken || "",
            userID: formData.userID,
            password: formData.password,
            captcha: formData.captcha,
          }),
        },
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
          View on GitHub
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
                Go Back
              </button>
              <button
                type="button"
                className="open-button"
                onClick={() => window.open(pdfUrl || "", "_blank")}
              >
                Open PDF
              </button>
            </div>
            <p>Attendance PDF is loaded below.</p>
          </div>

          <PdfViewer pdfUrl={pdfUrl || ""} />
        </section>
      ) : (
        <form className="form" onSubmit={handleForm}>
          <h5 style={{ textAlign: "center", color: "blue", fontSize: "0.875rem", margin: "0 0 0.5rem 0", border: "2px solid blue", borderRadius: "6px", padding: "0.5rem" }}>
            Coming Soon: Instant Transcript
          </h5>
          <h2 style={{ textAlign: "center" }}>NED Instant Attendance</h2>
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
                Searching for your attendance...
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