import { useEffect, useState } from "react";
import {
  Apple,
  Building2,
  Cross,
  Droplet,
  Eye,
  EyeOff,
  FlaskConical,
  Lock,
  LogIn,
  Package,
  Pill,
  Plus,
  ShoppingBasket,
  Stethoscope,
  Syringe,
  Tablets,
  User,
  Users,
} from "lucide-react";
import { loginUser, registerUser } from "../api/auth";
import { detectTenantSlug } from "../utils/tenantHost";
import "./AuthCard.css";

const emptyLogin = { companySlug: "", username: "", password: "" };
const emptyRegister = { username: "", email: "", password: "" };

const ICON_PROPS = { size: 28, strokeWidth: 2.2, color: "#FFFFFF", absoluteStrokeWidth: false };

const FEATURES = [
  { label: "Capsules", Icon: Pill },
  { label: "Tablets", Icon: Tablets },
  { label: "Syrup", Icon: FlaskConical },
  { label: "Injection", Icon: Syringe },
  { label: "Vitamins", Icon: Apple },
  { label: "Equipment", Icon: Stethoscope },
  { label: "First Aid", Icon: Cross },
  { label: "Creams", Icon: Droplet },
];

function resolveInitialSlug() {
  const fromHost = detectTenantSlug();
  if (fromHost) return fromHost;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("pharmacy") || params.get("slug");
  if (fromQuery) return String(fromQuery).toLowerCase();
  return (
    sessionStorage.getItem("medaxis_tenant_slug") ||
    localStorage.getItem("medaxis_tenant_slug") ||
    ""
  );
}

function BrandMark({ light = false }) {
  return (
    <div className={`mx-auth-brand${light ? " light" : ""}`}>
      <div className="mx-auth-logo">
        <Plus size={32} strokeWidth={2.4} color="#FFFFFF" />
      </div>
      <div>
        <strong>MedAxis</strong>
        <span>Pharmacy SaaS</span>
      </div>
    </div>
  );
}

function PharmacyHeroArt() {
  return (
    <div className="mx-auth-hero-art" aria-hidden="true">
      <div className="mx-auth-orb" />
      <div className="mx-auth-float mx-auth-float-cross">
        <Plus size={72} strokeWidth={2.2} color="#FFFFFF" />
      </div>
      <div className="mx-auth-float mx-auth-float-capsule">
        <Pill size={30} strokeWidth={2.2} color="#FFFFFF" />
      </div>
      <div className="mx-auth-float mx-auth-float-bottle">
        <FlaskConical size={34} strokeWidth={2.2} color="#FFFFFF" />
      </div>
      <div className="mx-auth-float mx-auth-float-basket">
        <ShoppingBasket size={68} strokeWidth={2.1} color="#FFFFFF" />
      </div>
    </div>
  );
}

export default function AuthCard({ onLoginSuccess }) {
  const lockedSlug =
    detectTenantSlug() || new URLSearchParams(window.location.search).get("pharmacy");
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState(() => ({
    ...emptyLogin,
    companySlug: resolveInitialSlug(),
  }));
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [loginStatus, setLoginStatus] = useState({ type: "", message: "" });
  const [registerStatus, setRegisterStatus] = useState({ type: "", message: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    document.title = "MedAxis — Login";
  }, []);

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
    if (loginLoading) return;
    setLoginLoading(true);
    setLoginStatus({ type: "", message: "" });
    try {
      const data = await loginUser(loginForm);
      if (data.token) localStorage.setItem("pharmacy_token", data.token);
      setLoginStatus({ type: "success", message: data.message || "Login successful." });
      if (onLoginSuccess) await onLoginSuccess(data);
    } catch (error) {
      setLoginStatus({ type: "error", message: error.message || "Login failed." });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    if (registerLoading) return;
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
      setRegisterStatus({ type: "error", message: error.message || "Registration failed." });
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="mx-auth-page">
      <aside className="mx-auth-showcase" aria-hidden={false}>
        <BrandMark light />
        <div className="mx-auth-showcase-body">
          <h1>
            Complete <span>Pharmacy Management System</span>
          </h1>
          <p>
            Manage medicines, sales, inventory, purchases, expiry and more in one powerful system.
          </p>

          <div className="mx-auth-features">
            {FEATURES.map(({ label, Icon }) => (
              <div key={label} className="mx-auth-feature">
                <span className="mx-auth-feature-icon">
                  <Icon {...ICON_PROPS} />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <PharmacyHeroArt />
        </div>

        <div className="mx-auth-stats">
          <div>
            <span className="mx-auth-stat-icon">
              <Package size={20} strokeWidth={2.2} color="#FFFFFF" />
            </span>
            <div>
              <strong>3,240+</strong>
              <span>Medicines</span>
            </div>
          </div>
          <div>
            <span className="mx-auth-stat-icon">
              <Users size={20} strokeWidth={2.2} color="#FFFFFF" />
            </span>
            <div>
              <strong>1,284+</strong>
              <span>Customers</span>
            </div>
          </div>
          <div>
            <span className="mx-auth-stat-icon">
              <ShoppingBasket size={20} strokeWidth={2.2} color="#FFFFFF" />
            </span>
            <div>
              <strong>428K+</strong>
              <span>Total Sales</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="mx-auth-panel">
        <div className="mx-auth-panel-inner">
          <BrandMark />

          {!isRegister ? (
            <form className="mx-auth-form" onSubmit={handleLoginSubmit} noValidate>
              <h2>Login</h2>
              <p className="mx-auth-sub">Access your pharmacy management system</p>

              <label className="mx-auth-field">
                <Building2 size={18} />
                <input
                  type="text"
                  name="companySlug"
                  placeholder="Pharmacy Code (or platform)"
                  autoComplete="organization"
                  value={loginForm.companySlug}
                  onChange={handleLoginChange}
                  disabled={loginLoading || Boolean(lockedSlug)}
                  readOnly={Boolean(lockedSlug)}
                />
              </label>
              {lockedSlug ? (
                <p className="mx-auth-locked">
                  Pharmacy link: <strong>{lockedSlug}</strong>
                </p>
              ) : null}

              <label className="mx-auth-field">
                <User size={18} />
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  autoComplete="username"
                  value={loginForm.username}
                  onChange={handleLoginChange}
                  required
                  disabled={loginLoading}
                />
              </label>

              <label className="mx-auth-field">
                <Lock size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  required
                  disabled={loginLoading}
                />
                <button
                  type="button"
                  className="mx-auth-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>

              <div className="mx-auth-forgot">
                <a href="#forgot-password">Forgot Password?</a>
              </div>

              <p className={`mx-auth-status ${loginStatus.type}`} role="status" aria-live="polite">
                {loginStatus.message}
              </p>

              <button type="submit" className="mx-auth-submit" disabled={loginLoading}>
                <LogIn size={18} />
                {loginLoading ? "Logging in..." : "Login"}
              </button>

              <div className="mx-auth-divider">
                <span>or login with social platforms</span>
              </div>
              <div className="mx-auth-social">
                <a href="#google" aria-label="Google">
                  <i className="bx bxl-google" />
                </a>
                <a href="#facebook" aria-label="Facebook">
                  <i className="bx bxl-facebook" />
                </a>
                <a href="#github" aria-label="GitHub">
                  <i className="bx bxl-github" />
                </a>
                <a href="#linkedin" aria-label="LinkedIn">
                  <i className="bx bxl-linkedin" />
                </a>
              </div>

              <p className="mx-auth-switch">
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => setIsRegister(true)}>
                  Register
                </button>
              </p>
            </form>
          ) : (
            <form className="mx-auth-form" onSubmit={handleRegisterSubmit} noValidate>
              <h2>Register</h2>
              <p className="mx-auth-sub">Create an account request for your pharmacy</p>

              <label className="mx-auth-field">
                <User size={18} />
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  autoComplete="username"
                  value={registerForm.username}
                  onChange={handleRegisterChange}
                  required
                  disabled={registerLoading}
                />
              </label>

              <label className="mx-auth-field">
                <Building2 size={18} />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  required
                  disabled={registerLoading}
                />
              </label>

              <label className="mx-auth-field">
                <Lock size={18} />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  autoComplete="new-password"
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  required
                  disabled={registerLoading}
                />
              </label>

              <p className={`mx-auth-status ${registerStatus.type}`} role="status" aria-live="polite">
                {registerStatus.message}
              </p>

              <button type="submit" className="mx-auth-submit" disabled={registerLoading}>
                {registerLoading ? "Registering..." : "Register"}
              </button>

              <p className="mx-auth-switch">
                Already have an account?{" "}
                <button type="button" onClick={() => setIsRegister(false)}>
                  Login
                </button>
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
