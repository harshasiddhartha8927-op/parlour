import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import AdminDashboard from "./components/AdminDashboard";
import { isAdminAuthenticated } from "./utils/bookingStorage";
import AdminLogin from "./pages/AdminLogin";
import Booking from "./pages/Booking";
import Home from "./pages/Home";
import Reviews from "./pages/Reviews";
import Services from "./pages/Services";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

function ProtectedAdminRoute() {
  return isAdminAuthenticated() ? <AdminDashboard /> : <Navigate to="/admin-login" replace />;
}

function AppLayout() {
  return (
    <div className="min-h-screen">
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedAdminRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-rose/10 bg-white/80 py-6">
        <div className="page-shell flex flex-col gap-2 text-sm text-plum/70 sm:flex-row sm:items-center sm:justify-between">
          <span>Glam Beauty Parlour</span>
          <span>Soft glam, expert care, beautiful appointments.</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
