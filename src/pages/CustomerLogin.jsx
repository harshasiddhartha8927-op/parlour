import { LockKeyhole, Mail, Phone, Sparkles, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  authenticateCustomer,
  isCustomerAuthenticated,
  registerCustomer,
  isAdminAuthenticated,
  ADMIN_SESSION_KEY,
} from "../utils/bookingStorage";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login"); // "login" or "register"
  
  // Form state
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (isCustomerAuthenticated()) {
    return <Navigate to="/customer-dashboard" replace />;
  }

  if (isAdminAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const emailInput = loginForm.email.trim();
    const passwordInput = loginForm.password;

    if (!emailInput || !passwordInput) {
      setError("Please fill in all fields.");
      return;
    }

    // Check for admin credentials
    const normalizedEmail = emailInput.toLowerCase();
    if (
      (normalizedEmail === "admin" || normalizedEmail === "admin@glam.com") &&
      passwordInput === "admin123"
    ) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
      setSuccess("Welcome back, Admin!");
      setTimeout(() => {
        navigate("/admin", { replace: true });
      }, 1000);
      return;
    }

    const result = authenticateCustomer(emailInput, passwordInput);
    if (result.success) {
      setSuccess(`Welcome back, ${result.customer.name}!`);
      setTimeout(() => {
        navigate("/customer-dashboard", { replace: true });
      }, 1000);
    } else {
      setError(result.error);
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { name, email, phone, password } = registerForm;

    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      setError("Enter a valid phone number (10-15 digits).");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    const result = registerCustomer(name, email, phone, password);
    if (result.success) {
      setSuccess("Account created successfully!");
      setTimeout(() => {
        navigate("/customer-dashboard", { replace: true });
      }, 1000);
    } else {
      setError(result.error);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-144px)] items-center bg-petal/45 py-12">
      <div className="page-shell">
        <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-rose/10 bg-white shadow-salon">
          {/* Tabs */}
          <div className="flex border-b border-rose/10">
            <button
              type="button"
              className={`flex-1 py-4 text-center text-sm font-bold transition-all duration-300 ${
                activeTab === "login"
                  ? "bg-rose/5 text-rose border-b-2 border-rose"
                  : "text-plum/50 hover:bg-petal hover:text-plum/80"
              }`}
              onClick={() => {
                setActiveTab("login");
                setError("");
                setSuccess("");
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`flex-1 py-4 text-center text-sm font-bold transition-all duration-300 ${
                activeTab === "register"
                  ? "bg-rose/5 text-rose border-b-2 border-rose"
                  : "text-plum/50 hover:bg-petal hover:text-plum/80"
              }`}
              onClick={() => {
                setActiveTab("register");
                setError("");
                setSuccess("");
              }}
            >
              Create Account
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-7 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose text-white shadow-salon animate-pulse">
                <Sparkles size={25} aria-hidden="true" />
              </span>
              <p className="mt-5 text-xs font-bold uppercase tracking-wider text-gold">
                Portal Sign In
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold text-plum">
                Dhanvika Beauty Parlour
              </h1>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {success}
              </div>
            )}

            {activeTab === "login" ? (
              <form onSubmit={handleLoginSubmit} className="grid gap-5">
                <label className="grid gap-2">
                  <span className="field-label">Email Address</span>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rose"
                      size={18}
                    />
                    <input
                      className="field-input pl-10"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => {
                        setLoginForm((curr) => ({ ...curr, email: e.target.value }));
                        setError("");
                      }}
                      placeholder="name@example.com"
                    />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="field-label">Password</span>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rose"
                      size={18}
                    />
                    <input
                      className="field-input pl-10"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => {
                        setLoginForm((curr) => ({ ...curr, password: e.target.value }));
                        setError("");
                      }}
                      placeholder="••••••••"
                    />
                  </div>
                </label>

                <button type="submit" className="primary-button w-full mt-2">
                  <User size={18} aria-hidden="true" />
                  Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="grid gap-4">
                <label className="grid gap-1">
                  <span className="field-label">Full Name</span>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rose"
                      size={18}
                    />
                    <input
                      className="field-input pl-10"
                      type="text"
                      value={registerForm.name}
                      onChange={(e) => {
                        setRegisterForm((curr) => ({ ...curr, name: e.target.value }));
                        setError("");
                      }}
                      placeholder="Jane Doe"
                    />
                  </div>
                </label>

                <label className="grid gap-1">
                  <span className="field-label">Email Address</span>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rose"
                      size={18}
                    />
                    <input
                      className="field-input pl-10"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => {
                        setRegisterForm((curr) => ({ ...curr, email: e.target.value }));
                        setError("");
                      }}
                      placeholder="jane@example.com"
                    />
                  </div>
                </label>

                <label className="grid gap-1">
                  <span className="field-label">Phone Number</span>
                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rose"
                      size={18}
                    />
                    <input
                      className="field-input pl-10"
                      type="tel"
                      value={registerForm.phone}
                      onChange={(e) => {
                        setRegisterForm((curr) => ({ ...curr, phone: e.target.value }));
                        setError("");
                      }}
                      placeholder="9876543210"
                    />
                  </div>
                </label>

                <label className="grid gap-1">
                  <span className="field-label">Create Password</span>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rose"
                      size={18}
                    />
                    <input
                      className="field-input pl-10"
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => {
                        setRegisterForm((curr) => ({ ...curr, password: e.target.value }));
                        setError("");
                      }}
                      placeholder="At least 6 characters"
                    />
                  </div>
                </label>

                <button type="submit" className="primary-button w-full mt-3">
                  <UserPlus size={18} aria-hidden="true" />
                  Create Account
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
