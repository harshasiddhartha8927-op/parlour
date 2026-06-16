import {
  BadgeCheck,
  CalendarCheck,
  LogOut,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, isFirebaseConfigured } from "../firebase/config";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import {
  ADMIN_SESSION_KEY,
  getTodayDate,
  getBookings,
  cancelBooking,
  deleteBooking,
} from "../utils/bookingStorage";

const formatDate = (date) => {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClass = (status) =>
  status === "Cancelled"
    ? "bg-red-50 text-red-700 border-red-100"
    : "bg-emerald-50 text-emerald-700 border-emerald-100";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const today = getTodayDate();

  // Subscribe to real-time Firestore bookings updates
  useEffect(() => {
    setLoading(true);

    const loadLocalBookings = () => {
      const allLocal = getBookings();
      // Sort in-memory desc
      allLocal.sort((a, b) => {
        const timeA = a.createdTime || "";
        const timeB = b.createdTime || "";
        return timeB.localeCompare(timeA);
      });
      setBookings(allLocal);
      setLoading(false);
    };

    if (!isFirebaseConfigured) {
      loadLocalBookings();
      return;
    }

    const q = query(collection(db, "bookings"), orderBy("createdTime", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
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
          ...data,
        };
      });
      setBookings(list);
      setLoading(false);
    }, (error) => {
      console.error("Firestore listener error in AdminDashboard, falling back to local storage:", error);
      loadLocalBookings();
    });

    return () => unsubscribe();
  }, []);

  const filteredBookings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesSearch =
        !normalizedSearch ||
        (booking.customerName && booking.customerName.toLowerCase().includes(normalizedSearch)) ||
        (booking.serviceName && booking.serviceName.toLowerCase().includes(normalizedSearch));
      const matchesDate = !filterDate || booking.date === filterDate;
      return matchesSearch && matchesDate;
    });
  }, [bookings, filterDate, searchTerm]);

  const todayBookingsCount = bookings.filter(
    (booking) => booking.date === today && booking.status !== "Cancelled",
  ).length;
  
  const confirmedBookingsCount = bookings.filter((booking) => booking.status !== "Cancelled").length;

  const handleCancel = async (bookingId) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        cancelBooking(bookingId);

        if (isFirebaseConfigured) {
          const docRef = doc(db, "bookings", bookingId);
          await updateDoc(docRef, {
            bookingStatus: "Cancelled",
            status: "Cancelled" // Compatibility fallback
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

  const handleDelete = async (bookingId) => {
    if (window.confirm("Are you sure you want to permanently delete this booking record?")) {
      try {
        deleteBooking(bookingId);

        if (isFirebaseConfigured) {
          const docRef = doc(db, "bookings", bookingId);
          await deleteDoc(docRef);
        } else {
          const updated = bookings.filter((b) => b.id !== bookingId);
          setBookings(updated);
        }
      } catch (err) {
        console.error("Firestore delete failed:", err);
        alert("Failed to delete booking: " + err.message);
      }
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    navigate("/customer-login", { replace: true }); // Unified login redirect
  };

  return (
    <section className="bg-petal/40 py-10 sm:py-14 min-h-[calc(100vh-144px)]">
      <div className="page-shell">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-gold">Admin Dashboard</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-plum">Booking Manager</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-plum/70">
              Track appointments, filter the schedule, cancel bookings, and keep the parlour calendar tidy.
            </p>
          </div>
          <button type="button" className="secondary-button self-start lg:self-auto" onClick={handleLogout}>
            <LogOut size={18} aria-hidden="true" />
            Logout
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-lg border border-rose/10 bg-white p-5 shadow-salon">
            <Users className="text-rose" size={26} aria-hidden="true" />
            <p className="mt-4 text-sm font-bold text-plum/65">Total bookings</p>
            <p className="mt-1 text-3xl font-extrabold text-plum">{bookings.length}</p>
          </article>
          <article className="rounded-lg border border-gold/20 bg-white p-5 shadow-salon">
            <CalendarCheck className="text-gold" size={26} aria-hidden="true" />
            <p className="mt-4 text-sm font-bold text-plum/65">Today's bookings</p>
            <p className="mt-1 text-3xl font-extrabold text-plum">{todayBookingsCount}</p>
          </article>
          <article className="rounded-lg border border-emerald-100 bg-white p-5 shadow-salon">
            <BadgeCheck className="text-emerald-600" size={26} aria-hidden="true" />
            <p className="mt-4 text-sm font-bold text-plum/65">Confirmed bookings</p>
            <p className="mt-1 text-3xl font-extrabold text-plum">{confirmedBookingsCount}</p>
          </article>
        </div>

        <div className="mt-8 rounded-lg border border-rose/10 bg-white p-5 shadow-salon">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
            <label className="grid gap-2">
              <span className="field-label">Search by customer or service</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rose" size={18} />
                <input
                  className="field-input pl-10"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search bookings"
                />
              </div>
            </label>
            <label className="grid gap-2">
              <span className="field-label">Filter by date</span>
              <input
                className="field-input"
                type="date"
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="secondary-button h-[46px]"
              onClick={() => {
                setSearchTerm("");
                setFilterDate("");
              }}
            >
              Clear
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            {loading ? (
              <div className="text-center py-12 text-sm font-semibold text-plum/60 animate-pulse">
                Loading appointments from Firestore...
              </div>
            ) : (
              <table className="w-full min-w-[900px] border-separate border-spacing-y-3 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-plum/55">
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Service</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="rounded-lg bg-petal/60 text-plum shadow-sm">
                      <td className="rounded-l-lg px-3 py-4 font-bold">{booking.customerName}</td>
                      <td className="px-3 py-4">{booking.phone}</td>
                      <td className="px-3 py-4">{booking.email}</td>
                      <td className="px-3 py-4">
                        <div className="font-bold text-plum">{booking.serviceName}</div>
                        <div className="text-xs font-semibold text-rose mt-1">
                          Price: {booking.price || booking.servicePrice || "N/A"} • Duration: {booking.duration || booking.serviceDuration || "N/A"}
                        </div>
                        {booking.notes && (
                          <div className="text-xs text-plum/60 italic mt-1 max-w-[200px] truncate" title={booking.notes}>
                            Note: "{booking.notes}"
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4">{formatDate(booking.date)}</td>
                      <td className="px-3 py-4">
                        <div className="font-semibold text-plum">
                          {booking.time}
                          {booking.endTime && ` - ${booking.endTime}`}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="rounded-r-lg px-3 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                            aria-label="Cancel booking"
                            disabled={booking.status === "Cancelled"}
                            onClick={() => handleCancel(booking.id)}
                          >
                            <XCircle size={18} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-plum/10 bg-white text-plum transition hover:bg-plum hover:text-white"
                            aria-label="Delete booking"
                            onClick={() => handleDelete(booking.id)}
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && filteredBookings.length === 0 && (
            <div className="mt-6 rounded-lg border border-dashed border-rose/25 bg-petal/50 p-6 text-center text-sm font-semibold text-plum/70">
              No bookings match the current filters.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
