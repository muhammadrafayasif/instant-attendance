import { useState } from "react";
import "./App.css";

const Form = () => {
  const [formData, setFormData] = useState({
    userID: "",
    password: "",
    captcha: "",
  });

  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const formBody = new FormData();
      formBody.append("userID", formData.userID);
      formBody.append("password", formData.password);
      formBody.append("captcha", formData.captcha);

      const response = await fetch(
        "https://neduet-attendance-backend.vercel.app/attendance",
        {
          method: "POST",
          credentials: "include",
          body: formBody,
        }
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
            "_blank"
          )
        }
      >
        <img
          src="https://cdn.pixabay.com/photo/2022/01/30/13/33/github-6980894_1280.png"
          alt="GitHub Logo"
        />
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
          <img
            src="https://neduet-attendance-backend.vercel.app/captcha"
            alt="Image Code"
          ></img>
        </div>
        <input
          type="captcha"
          name="captcha"
          value={formData.captcha}
          onChange={handleChange}
          required
          placeholder="Enter CAPTCHA"
        />

        <button type="submit">
          {status === "loading" ? "Fetching..." : "Login"}
        </button>

        {message && <div className={`status-message ${status}`}>{message}</div>}
      </form>
    </div>
  );
};

export default Form;
