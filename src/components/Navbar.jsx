import { CalendarCheck, Menu, ShieldCheck, Sparkles, User, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  getCustomerSession,
  isAdminAuthenticated,
  isCustomerAuthenticated,
} from "../utils/bookingStorage";

export default function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isCustomer = isCustomerAuthenticated();
  const isAdmin = isAdminAuthenticated();
  const customer = getCustomerSession();

  const linkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive ? "bg-petal text-rose" : "text-plum/75 hover:bg-petal hover:text-plum"
    }`;

  // Generate dynamic links based on user type
  const getNavItems = () => {
    const items = [
      { label: "Home", to: "/" },
      { label: "Services", to: "/services" },
      { label: "Reviews", to: "/reviews" },
    ];

    if (isAdmin) {
      items.push({ label: "Manage Bookings", to: "/admin" });
    } else {
      items.push({ label: "Book Appointment", to: "/booking" });
      if (isCustomer) {
        items.push({ label: "Dashboard", to: "/customer-dashboard" });
      }
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <header className="sticky top-0 z-50 border-b border-rose/10 bg-white/90 backdrop-blur">
      <nav className="page-shell flex h-20 items-center justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-3" onClick={() => setIsOpen(false)}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose text-white shadow-salon">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-xl font-bold text-plum">
              Dhanvika Beauty Parlour
            </span>
            <span className="hidden text-xs font-semibold uppercase text-gold sm:block">
              Salon and spa studio
            </span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden items-center gap-3 lg:flex">
          {isAdmin ? (
            <Link to="/admin" className="secondary-button px-4 py-2">
              <ShieldCheck size={17} aria-hidden="true" />
              Admin Panel
            </Link>
          ) : isCustomer ? (
            <>
              <Link to="/customer-dashboard" className="secondary-button px-4 py-2 text-rose border-rose/25 bg-rose/5">
                <User size={17} aria-hidden="true" />
                My Dashboard
              </Link>
              <Link to="/booking" className="primary-button px-5 py-2.5">
                <CalendarCheck size={17} aria-hidden="true" />
                Book Now
              </Link>
            </>
          ) : (
            <>
              <Link to="/customer-login" className="secondary-button px-4 py-2">
                <User size={17} aria-hidden="true" />
                Sign In
              </Link>
              <Link to="/booking" className="primary-button px-5 py-2.5">
                <CalendarCheck size={17} aria-hidden="true" />
                Book
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose/20 text-plum lg:hidden"
          aria-label="Toggle navigation menu"
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="border-t border-rose/10 bg-white lg:hidden">
          <div className="page-shell grid gap-2 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClass}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            
            <div className="mt-4 grid gap-2 border-t border-rose/5 pt-4">
              {isAdmin ? (
                <Link
                  to="/admin"
                  className="secondary-button justify-center py-2.5"
                  onClick={() => setIsOpen(false)}
                >
                  <ShieldCheck size={17} aria-hidden="true" />
                  Admin Panel
                </Link>
              ) : isCustomer ? (
                <>
                  <Link
                    to="/customer-dashboard"
                    className="secondary-button justify-center py-2.5 text-rose"
                    onClick={() => setIsOpen(false)}
                  >
                    <User size={17} aria-hidden="true" />
                    My Dashboard
                  </Link>
                  <Link
                    to="/booking"
                    className="primary-button justify-center py-2.5"
                    onClick={() => setIsOpen(false)}
                  >
                    <CalendarCheck size={17} aria-hidden="true" />
                    Book Now
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/customer-login"
                    className="secondary-button justify-center py-2.5"
                    onClick={() => setIsOpen(false)}
                  >
                    <User size={17} aria-hidden="true" />
                    Sign In
                  </Link>
                  <Link
                    to="/booking"
                    className="primary-button justify-center py-2.5"
                    onClick={() => setIsOpen(false)}
                  >
                    <CalendarCheck size={17} aria-hidden="true" />
                    Book Appointment
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
