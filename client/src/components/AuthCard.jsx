import { useEffect, useRef, useState } from "react";
import { loginUser, registerUser } from "../api/auth";
import "./AuthCard.css";

const ANIMATION_MS = 1800;

const emptyLogin = { companySlug: "", username: "", password: "" };
const emptyRegister = { username: "", email: "", password: "" };

export default function AuthCard({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [loginStatus, setLoginStatus] = useState({ type: "", message: "" });
  const [registerStatus, setRegisterStatus] = useState({ type: "", message: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const animationTimer = useRef(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    return () => {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }
    };
  }, []);

  const switchMode = (nextIsRegister) => {
    if (isAnimating || nextIsRegister === isRegister) return;

    setIsAnimating(true);
    setIsRegister(nextIsRegister);
    setLoginStatus({ type: "", message: "" });
    setRegisterStatus({ type: "", message: "" });

    const duration = prefersReducedMotion.current ? 0 : ANIMATION_MS;
    animationTimer.current = setTimeout(() => {
      setIsAnimating(false);
    }, duration);
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    if (loginLoading || isAnimating) return;

    setLoginLoading(true);
    setLoginStatus({ type: "", message: "" });

    try {
      const data = await loginUser(loginForm);
      if (data.token) {
        localStorage.setItem("pharmacy_token", data.token);
      }
      setLoginStatus({
        type: "success",
        message: data.message || "Login successful.",
      });
      if (onLoginSuccess) {
        await onLoginSuccess(data);
      }
    } catch (error) {
      setLoginStatus({
        type: "error",
        message: error.message || "Login failed.",
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    if (registerLoading || isAnimating) return;

    setRegisterLoading(true);
    setRegisterStatus({ type: "", message: "" });

    try {
      const data = await registerUser(registerForm);
      setRegisterStatus({
        type: "success",
        message: data.message || "Registration successful.",
      });
      setRegisterForm(emptyRegister);
    } catch (error) {
      setRegisterStatus({
        type: "error",
        message: error.message || "Registration failed.",
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div
        className={`auth-card${isRegister ? " active" : ""}`}
        aria-busy={isAnimating}
      >
        <div className="form-box login" aria-hidden={isRegister}>
          <form onSubmit={handleLoginSubmit} noValidate>
            <h1>Login</h1>

            <div className="input-box">
              <input
                type="text"
                name="companySlug"
                placeholder="Pharmacy Code (or platform)"
                autoComplete="organization"
                value={loginForm.companySlug}
                onChange={handleLoginChange}
                disabled={isAnimating || loginLoading}
              />
              <i className="bx bxs-buildings" aria-hidden="true" />
            </div>

            <div className="input-box">
              <input
                type="text"
                name="username"
                placeholder="Username"
                autoComplete="username"
                value={loginForm.username}
                onChange={handleLoginChange}
                required
                disabled={isAnimating || loginLoading}
              />
              <i className="bx bxs-user" aria-hidden="true" />
            </div>

            <div className="input-box">
              <input
                type="password"
                name="password"
                placeholder="Password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={handleLoginChange}
                required
                disabled={isAnimating || loginLoading}
              />
              <i className="bx bxs-lock-alt" aria-hidden="true" />
            </div>

            <div className="forgot-link">
              <a href="#forgot-password">Forgot Password?</a>
            </div>

            <p
              className={`form-status ${loginStatus.type}`}
              role="status"
              aria-live="polite"
            >
              {loginStatus.message}
            </p>

            <button
              type="submit"
              className="auth-btn"
              disabled={isAnimating || loginLoading}
            >
              {loginLoading ? "Logging in..." : "Login"}
            </button>

            <p>or login with social platforms</p>
            <div className="social-icons">
              <a href="#google" aria-label="Login with Google">
                <i className="bx bxl-google" aria-hidden="true" />
              </a>
              <a href="#facebook" aria-label="Login with Facebook">
                <i className="bx bxl-facebook" aria-hidden="true" />
              </a>
              <a href="#github" aria-label="Login with GitHub">
                <i className="bx bxl-github" aria-hidden="true" />
              </a>
              <a href="#linkedin" aria-label="Login with LinkedIn">
                <i className="bx bxl-linkedin" aria-hidden="true" />
              </a>
            </div>
          </form>
        </div>

        <div className="form-box register" aria-hidden={!isRegister}>
          <form onSubmit={handleRegisterSubmit} noValidate>
            <h1>Registration</h1>

            <div className="input-box">
              <input
                type="text"
                name="username"
                placeholder="Username"
                autoComplete="username"
                value={registerForm.username}
                onChange={handleRegisterChange}
                required
                disabled={isAnimating || registerLoading}
              />
              <i className="bx bxs-user" aria-hidden="true" />
            </div>

            <div className="input-box">
              <input
                type="email"
                name="email"
                placeholder="Email"
                autoComplete="email"
                value={registerForm.email}
                onChange={handleRegisterChange}
                required
                disabled={isAnimating || registerLoading}
              />
              <i className="bx bxs-envelope" aria-hidden="true" />
            </div>

            <div className="input-box">
              <input
                type="password"
                name="password"
                placeholder="Password"
                autoComplete="new-password"
                value={registerForm.password}
                onChange={handleRegisterChange}
                required
                disabled={isAnimating || registerLoading}
              />
              <i className="bx bxs-lock-alt" aria-hidden="true" />
            </div>

            <p
              className={`form-status ${registerStatus.type}`}
              role="status"
              aria-live="polite"
            >
              {registerStatus.message}
            </p>

            <button
              type="submit"
              className="auth-btn"
              disabled={isAnimating || registerLoading}
            >
              {registerLoading ? "Registering..." : "Register"}
            </button>

            <p>or register with social platforms</p>
            <div className="social-icons">
              <a href="#google" aria-label="Register with Google">
                <i className="bx bxl-google" aria-hidden="true" />
              </a>
              <a href="#facebook" aria-label="Register with Facebook">
                <i className="bx bxl-facebook" aria-hidden="true" />
              </a>
              <a href="#github" aria-label="Register with GitHub">
                <i className="bx bxl-github" aria-hidden="true" />
              </a>
              <a href="#linkedin" aria-label="Register with LinkedIn">
                <i className="bx bxl-linkedin" aria-hidden="true" />
              </a>
            </div>
          </form>
        </div>

        <div className="toggle-box" aria-hidden="true">
          <div className="toggle-panel toggle-left">
            <h1>Hello, Welcome!</h1>
            <p>Don&apos;t have an account?</p>
            <button
              type="button"
              className="auth-btn"
              onClick={() => switchMode(true)}
              disabled={isAnimating}
            >
              Register
            </button>
          </div>

          <div className="toggle-panel toggle-right">
            <h1>Welcome Back!</h1>
            <p>Already have an account?</p>
            <button
              type="button"
              className="auth-btn"
              onClick={() => switchMode(false)}
              disabled={isAnimating}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
