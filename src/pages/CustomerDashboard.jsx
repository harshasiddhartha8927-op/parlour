import {
  Calendar,
  CalendarCheck,
  Clock,
  LogOut,
  Mail,
  Phone,
  PlusCircle,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db, isFirebaseConfigured } from "../firebase/config";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import {
  getCustomerSession,
  isCustomerAuthenticated,
  logoutCustomer,
  getBookings,
  cancelBooking,
} from "../utils/bookingStorage";

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const statusClass = (status) =>
  status === "Cancelled"
    ? "bg-red-50 text-red-700 border-red-100"
    : "bg-emerald-50 text-emerald-700 border-emerald-100";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getCustomerSession());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCustomerAuthenticated() || !session) {
      navigate("/customer-login", { replace: true });
    }
  }, [navigate, session]);

  useEffect(() => {
    if (!session || !session.email) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userEmail = session.email.toLowerCase();

    const loadLocalBookings = () => {
      const allLocal = getBookings();
      const matched = allLocal.filter(
        (b) => b.email && b.email.toLowerCase() === userEmail
      );
      // Sort in-memory desc
      matched.sort((a, b) => {
        const timeA = a.createdTime || "";
        const timeB = b.createdTime || "";
        return timeB.localeCompare(timeA);
      });
      setBookings(matched);
      setLoading(false);
    };

    if (!isFirebaseConfigured) {
      loadLocalBookings();
      return;
    }

    const q = query(
      collection(db, "bookings"),
      where("email", "==", userEmail)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            customerName: data.customerName || "",
            phone: data.phone || "",
            email: data.email || "",
            serviceName: data.serviceName || "",
            date: data.bookingDate || data.date || "",
            time: data.startTime || data.time || "",
            status: data.bookingStatus || data.status || "Confirmed",
            servicePrice: data.price || data.servicePrice || "Rs. 499",
            ...data,
          };
        });

        // Sort by createdTime desc in-memory to prevent requiring composite index in firestore
        list.sort((a, b) => {
          const timeA = a.createdTime || 0;
          const timeB = b.createdTime || 0;
          if (timeB !== timeA) {
            return timeB - timeA;
          }
          return b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
        });

        setBookings(list);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore onSnapshot error in CustomerDashboard, falling back to local storage:", error);
        loadLocalBookings();
      }
    );

    return () => unsubscribe();
  }, [session]);

  const customerBookings = bookings;

  const activeBookings = useMemo(() => {
    return bookings.filter((b) => b.status !== "Cancelled");
  }, [bookings]);

  const cancelledBookings = useMemo(() => {
    return bookings.filter((b) => b.status === "Cancelled");
  }, [bookings]);

  const handleCancel = async (bookingId) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        cancelBooking(bookingId);

        if (isFirebaseConfigured) {
          const docRef = doc(db, "bookings", bookingId);
          await updateDoc(docRef, {
            bookingStatus: "Cancelled",
            status: "Cancelled", // compatibility fallback
          });
        } else {
          const updated = bookings.map((b) =>
            b.id === bookingId ? { ...b, bookingStatus: "Cancelled", status: "Cancelled" } : b
          );
          setBookings(updated);
        }
      } catch (err) {
        console.error("Firestore cancel failed:", err);
        alert("Failed to cancel booking: " + err.message);
      }
    }
  };

  const handleLogout = () => {
    logoutCustomer();
    navigate("/customer-login", { replace: true });
  };

  if (!session) return null;

  return (
    <section className="bg-petal/40 py-10 sm:py-14 min-h-[calc(100vh-144px)]">
      <div className="page-shell">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose/10 text-rose">
                <Sparkles size={16} />
              </span>
              <p className="text-sm font-bold uppercase tracking-wider text-gold">
                Customer Dashboard
              </p>
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold text-plum">
              Hello, {session.name}!
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-plum/70">
              Welcome back to your portal. Here you can view your appointment history, cancel bookings, and book new ones.
            </p>
          </div>
          <button
            type="button"
            className="secondary-button self-start lg:self-auto flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut size={18} aria-hidden="true" />
            Sign Out
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-xl border border-rose/10 bg-white p-5 shadow-salon">
                <Calendar className="text-rose" size={26} aria-hidden="true" />
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-plum/50">Total Bookings</p>
                <p className="mt-1 text-3xl font-extrabold text-plum">{customerBookings.length}</p>
              </article>
              <article className="rounded-xl border border-gold/20 bg-white p-5 shadow-salon">
                <CalendarCheck className="text-gold" size={26} aria-hidden="true" />
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-plum/50">Upcoming Slots</p>
                <p className="mt-1 text-3xl font-extrabold text-plum">{activeBookings.length}</p>
              </article>
              <article className="rounded-xl border border-red-100 bg-white p-5 shadow-salon">
                <XCircle className="text-red-500" size={26} aria-hidden="true" />
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-plum/50">Cancelled</p>
                <p className="mt-1 text-3xl font-extrabold text-plum">{cancelledBookings.length}</p>
              </article>
            </div>

            {/* Bookings Table/Cards */}
            <div className="rounded-xl border border-rose/10 bg-white p-5 shadow-salon">
              <h2 className="font-display text-xl font-bold text-plum mb-4">Your Appointments</h2>
              
              {loading ? (
                <div className="text-center py-12 text-sm font-semibold text-plum/60 animate-pulse">
                  Loading appointments from Firestore...
                </div>
              ) : customerBookings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-rose/25 bg-petal/50 p-8 text-center text-sm font-semibold text-plum/70">
                  You don't have any bookings yet. Book your first appointment today!
                  <div className="mt-4">
                    <Link to="/booking" className="primary-button inline-flex items-center gap-2">
                      <PlusCircle size={17} />
                      Book Now
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] border-separate border-spacing-y-3 text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-plum/55">
                        <th className="px-3 py-2">Service</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time Slot</th>
                        <th className="px-3 py-2">Price</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerBookings.map((booking) => (
                        <tr key={booking.id} className="rounded-lg bg-petal/60 text-plum shadow-sm">
                          <td className="rounded-l-lg px-3 py-4">
                            <div className="font-bold">{booking.serviceName}</div>
                            {booking.notes && (
                              <div className="text-xs text-plum/60 font-medium italic mt-1 max-w-xs truncate" title={booking.notes}>
                                Note: "{booking.notes}"
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-4">{formatDate(booking.date)}</td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Clock size={14} className="text-rose" />
                              <span>{booking.time} {booking.endTime && ` - ${booking.endTime}`}</span>
                            </div>
                            {booking.duration && (
                              <div className="text-xs text-plum/50 font-medium mt-1">
                                Duration: {booking.duration}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-4 font-semibold text-gold">{booking.servicePrice || "Rs. 499"}</td>
                          <td className="px-3 py-4">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                                booking.status,
                              )}`}
                            >
                              {booking.status}
                            </span>
                          </td>
                          <td className="rounded-r-lg px-3 py-4 text-right">
                            {booking.status !== "Cancelled" && (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                                onClick={() => handleCancel(booking.id)}
                              >
                                <XCircle size={14} />
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Profile card / Book new button */}
          <aside className="space-y-5">
            <div className="rounded-xl border border-rose/10 bg-white p-5 shadow-salon">
              <h2 className="font-display text-lg font-bold text-plum border-b border-rose/10 pb-3 mb-4">
                Profile Details
              </h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <User size={18} className="text-rose mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-plum/55 uppercase">Name</p>
                    <p className="font-semibold text-plum mt-0.5">{session.name}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-rose mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-plum/55 uppercase">Email</p>
                    <p className="font-semibold text-plum mt-0.5 break-all">{session.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone size={18} className="text-rose mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-plum/55 uppercase">Phone Number</p>
                    <p className="font-semibold text-plum mt-0.5">{session.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gold/20 bg-white p-5 shadow-gold text-center">
              <Sparkles size={32} className="text-gold mx-auto mb-3" />
              <h3 className="font-display text-lg font-bold text-plum">Need another service?</h3>
              <p className="text-xs text-plum/70 mt-1 mb-4">
                Book a new session and get pampered by our experts.
              </p>
              <Link to="/booking" className="primary-button w-full flex items-center justify-center gap-2">
                <PlusCircle size={17} />
                Book Appointment
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
