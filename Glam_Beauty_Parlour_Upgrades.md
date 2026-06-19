# Glam Beauty Parlour Upgrades - Modified Source Files

This file contains the complete updated source code for all modified files in the parlour scheduling system.

---

## 1. BookingForm.jsx
**File Path**: `src/components/BookingForm.jsx`

> Note: This is a large component. See the actual file at `src/components/BookingForm.jsx` for the full implementation. Key features: real-time Firestore slot availability, multi-service selection, PDF generation, and WhatsApp invoice integration.

---

## 2. CustomerDashboard.jsx
**File Path**: `src/pages/CustomerDashboard.jsx`

```javascript
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
  const [usingFirebase, setUsingFirebase] = useState(isFirebaseConfigured);
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
      const allLocal = getBookings().map((b) => ({
        ...b,
        id: b.id || b.appointmentId,
      }));
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
            customerName: data.customerName || "",
            phone: data.phone || "",
            email: data.email || "",
            serviceName: data.serviceName || "",
            date: data.bookingDate || data.date || "",
            time: data.startTime || data.time || "",
            status: data.bookingStatus || data.status || "Confirmed",
            servicePrice: data.price || data.servicePrice || "Rs. 499",
            ...data,
            id: data.id || data.appointmentId || doc.id,
            docId: doc.id,
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
        setUsingFirebase(true);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore onSnapshot error in CustomerDashboard, falling back to local storage:", error);
        setUsingFirebase(false);
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

  const handleCancel = async (booking) => {
    const bookingId = booking.id || booking.appointmentId;
    const docId = booking.docId || bookingId;
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        cancelBooking(bookingId);

        if (usingFirebase) {
          try {
            const docRef = doc(db, "bookings", docId);
            await updateDoc(docRef, {
              bookingStatus: "Cancelled",
              status: "Cancelled", // compatibility fallback
            });
          } catch (dbErr) {
            console.warn("Firestore cancel failed, updating local state only:", dbErr);
            const updated = bookings.map((b) =>
              b.id === bookingId ? { ...b, bookingStatus: "Cancelled", status: "Cancelled" } : b
            );
            setBookings(updated);
          }
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
                                onClick={() => handleCancel(booking)}
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
```

---

## 3. AdminDashboard.jsx
**File Path**: `src/components/AdminDashboard.jsx`

```javascript
import {
  BadgeCheck,
  CalendarCheck,
  LogOut,
  Search,
  Trash2,
  Users,
  XCircle,
  Plus,
  Image as ImageIcon,
  UploadCloud,
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
import { CATEGORIES } from "../data/beautyData";
import {
  fetchServiceReferences,
  uploadReferenceImage,
  saveServiceReferences,
  getThumbnailUrl,
} from "../utils/galleryStorage";

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
  const [usingFirebase, setUsingFirebase] = useState(isFirebaseConfigured);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const today = getTodayDate();

  const [activeTab, setActiveTab] = useState("bookings");
  const [selectedCategoryId, setSelectedCategoryId] = useState(CATEGORIES[0].id);
  const [selectedServiceId, setSelectedServiceId] = useState(CATEGORIES[0].services[0].id);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Subscribe to gallery updates
  useEffect(() => {
    if (activeTab !== "gallery" || !selectedServiceId) return;

    const loadGallery = async () => {
      setLoadingGallery(true);
      setUploadError("");
      try {
        const urls = await fetchServiceReferences(selectedServiceId);
        setGalleryImages(urls);
      } catch (err) {
        console.error("Failed to load gallery:", err);
      } finally {
        setLoadingGallery(false);
      }
    };

    loadGallery();
  }, [selectedServiceId, activeTab]);

  const handleCategoryChange = (catId) => {
    setSelectedCategoryId(catId);
    const catObj = CATEGORIES.find((c) => c.id === catId);
    if (catObj && catObj.services.length > 0) {
      setSelectedServiceId(catObj.services[0].id);
    } else {
      setSelectedServiceId("");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadError("");
    try {
      const uploadedUrl = await uploadReferenceImage(selectedServiceId, file);
      const updatedList = [...galleryImages, uploadedUrl];
      await saveServiceReferences(selectedServiceId, updatedList);
      setGalleryImages(updatedList);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async (urlToDelete) => {
    if (!window.confirm("Are you sure you want to remove this reference image?")) return;

    try {
      const updatedList = galleryImages.filter((url) => url !== urlToDelete);
      await saveServiceReferences(selectedServiceId, updatedList);
      setGalleryImages(updatedList);
    } catch (err) {
      console.error("Failed to delete image:", err);
      alert("Failed to delete image: " + err.message);
    }
  };

  // Subscribe to real-time Firestore bookings updates
  useEffect(() => {
    setLoading(true);

    const loadLocalBookings = () => {
      const allLocal = getBookings().map((b) => ({
        ...b,
        id: b.id || b.appointmentId,
      }));
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
          customerName: data.customerName || "",
          phone: data.phone || "",
          email: data.email || "",
          serviceName: data.serviceName || "",
          date: data.bookingDate || data.date || "",
          time: data.startTime || data.time || "",
          status: data.bookingStatus || data.status || "Confirmed",
          ...data,
          id: data.id || data.appointmentId || doc.id,
          docId: doc.id,
        };
      });
      setBookings(list);
      setUsingFirebase(true);
      setLoading(false);
    }, (error) => {
      console.error("Firestore listener error in AdminDashboard, falling back to local storage:", error);
      setUsingFirebase(false);
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
    (booking) => booking.date === today && (booking.bookingStatus || booking.status) !== "Cancelled",
  ).length;
  
  const confirmedBookingsCount = bookings.filter((booking) => (booking.bookingStatus || booking.status) !== "Cancelled").length;

  const handleCancel = async (booking) => {
    const bookingId = booking.id || booking.appointmentId;
    const docId = booking.docId || bookingId;
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        cancelBooking(bookingId);

        if (usingFirebase) {
          try {
            const docRef = doc(db, "bookings", docId);
            await updateDoc(docRef, {
              bookingStatus: "Cancelled",
              status: "Cancelled" // Compatibility fallback
            });
          } catch (dbErr) {
            console.warn("Firestore cancel failed, updating local state only:", dbErr);
            const updated = bookings.map((b) =>
              b.id === bookingId ? { ...b, bookingStatus: "Cancelled", status: "Cancelled" } : b
            );
            setBookings(updated);
          }
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

  const handleDelete = async (booking) => {
    const bookingId = booking.id || booking.appointmentId;
    const docId = booking.docId || bookingId;
    if (window.confirm("Are you sure you want to permanently delete this booking record?")) {
      try {
        deleteBooking(bookingId);

        if (usingFirebase) {
          try {
            const docRef = doc(db, "bookings", docId);
            await deleteDoc(docRef);
          } catch (dbErr) {
            console.warn("Firestore delete failed, updating local state only:", dbErr);
            const updated = bookings.filter((b) => b.id !== bookingId);
            setBookings(updated);
          }
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
    navigate("/customer-login", { replace: true });
  };

  return (
    <section className="bg-petal/40 py-10 sm:py-14 min-h-[calc(100vh-144px)]">
      <div className="page-shell">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-gold">Admin Dashboard</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-plum">Dashboard Manager</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-plum/70">
              Track customer appointments, upload service reference styles, and keep the salon operations organized.
            </p>
          </div>
          <button type="button" className="secondary-button self-start lg:self-auto" onClick={handleLogout}>
            <LogOut size={18} aria-hidden="true" />
            Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex gap-6 border-b border-rose/10 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`text-sm font-bold pb-2 transition-all border-b-2 ${
              activeTab === "bookings"
                ? "text-rose border-rose"
                : "text-plum/50 border-transparent hover:text-rose"
            }`}
          >
            Manage Bookings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`text-sm font-bold pb-2 transition-all border-b-2 ${
              activeTab === "gallery"
                ? "text-rose border-rose"
                : "text-plum/50 border-transparent hover:text-rose"
            }`}
          >
            Style Gallery Manager
          </button>
        </div>

        {activeTab === "bookings" ? (
          <>
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
                            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(booking.bookingStatus || booking.status)}`}>
                              {booking.bookingStatus || booking.status || "Confirmed"}
                            </span>
                          </td>
                          <td className="rounded-r-lg px-3 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                                aria-label="Cancel booking"
                                disabled={(booking.bookingStatus || booking.status) === "Cancelled"}
                                onClick={() => handleCancel(booking)}
                              >
                                <XCircle size={18} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-plum/10 bg-white text-plum transition hover:bg-plum hover:text-white"
                                aria-label="Delete booking"
                                onClick={() => handleDelete(booking)}
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
          </>
        ) : (
          /* Gallery Tab View */
          <div className="mt-8 rounded-lg border border-rose/10 bg-white p-6 shadow-salon space-y-6">
            <h2 className="font-display text-xl font-bold text-plum border-b border-rose/10 pb-3 flex items-center gap-2">
              <ImageIcon size={20} className="text-rose" />
              Manage Reference Images
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="field-label text-plum/80">Select Service Category</span>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="field-input text-plum bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="field-label text-plum/80">Select Service</span>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="field-input text-plum bg-white"
                >
                  {CATEGORIES.find((c) => c.id === selectedCategoryId)?.services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-4 pt-4 border-t border-rose/5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold text-plum text-sm">
                  Gallery References ({galleryImages.length})
                </h3>
                
                <label className="secondary-button cursor-pointer flex items-center justify-center gap-1.5 h-11 px-5 self-start sm:self-auto">
                  <UploadCloud size={18} />
                  <span>{uploadingImage ? "Uploading..." : "Upload Reference Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage || !selectedServiceId}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadError && (
                <p className="text-xs font-bold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  {uploadError}
                </p>
              )}

              {loadingGallery ? (
                <div className="text-center py-12 text-sm font-semibold text-plum/60 animate-pulse">
                  Loading service gallery from database...
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="text-center py-12 text-xs italic text-plum/50 border border-dashed border-rose/20 rounded-xl bg-petal/5">
                  No images uploaded for this service yet. Defaults will be displayed to customers.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {galleryImages.map((imgUrl, index) => (
                    <div
                      key={index}
                      className="group relative rounded-xl overflow-hidden border border-rose/10 bg-petal/5 aspect-square shadow-sm hover:shadow transition duration-200"
                    >
                      <img
                        src={getThumbnailUrl(imgUrl)}
                        alt="Reference preview"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageDelete(imgUrl)}
                        className="absolute top-2 right-2 rounded-full bg-red-600 text-white p-2 shadow-md hover:bg-red-700 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete reference image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-petal/30 p-4 border border-rose/5 text-xs text-plum/75 font-medium leading-relaxed">
              💡 <strong>Note:</strong> Uploading reference images stores them securely and links them to the selected service. If you clear all uploaded images, the service gallery automatically restores its Unsplash default presets.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
```

---

## 4. Booking.jsx
**File Path**: `src/pages/Booking.jsx`

```javascript
import { useSearchParams } from "react-router-dom";
import BookingForm from "../components/BookingForm";

export default function Booking() {
  const [searchParams] = useSearchParams();
  const defaultServiceId = searchParams.get("service") || "";

  return (
    <section className="bg-petal/45 py-12 sm:py-16">
      <div className="page-shell">
        <div className="mx-auto mb-9 max-w-3xl text-center">
          <p className="text-sm font-bold uppercase text-gold">Appointment calendar</p>
          <h1 className="section-title mt-2">Choose Your Glam Slot</h1>
          <p className="mt-4 text-base leading-7 text-plum/70">
            Bookings sync in real-time. Choose your preferred service, date, and available slot to schedule.
          </p>
        </div>
        <BookingForm defaultServiceId={defaultServiceId} />
      </div>
    </section>
  );
}
```

---

## 5. ServiceCard.jsx
**File Path**: `src/components/ServiceCard.jsx`

```javascript
import { CalendarCheck, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { isAdminAuthenticated } from "../utils/bookingStorage";

export default function ServiceCard({ service }) {
  const isAdmin = isAdminAuthenticated();

  return (
    <article className="flex h-full flex-col rounded-lg border border-rose/10 bg-white shadow-salon transition hover:-translate-y-1 hover:border-rose/25 overflow-hidden">
      <div className="p-5 pb-0 flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-petal text-rose">
          <Sparkles size={20} aria-hidden="true" />
        </span>
        <span className="rounded-full bg-gold/10 px-3 py-1 text-sm font-bold text-gold">
          {service.price}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-plum leading-snug">{service.name}</h3>
          <p className="mt-2 text-xs leading-relaxed text-plum/70">{service.description}</p>
        </div>

        <div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-plum/70 border-t border-rose/5 pt-3">
            <Clock size={14} aria-hidden="true" />
            <span>{service.duration}</span>
          </div>

          {!isAdmin && (
            <Link to={`/booking?service=${service.id}`} className="primary-button mt-4 w-full text-xs py-2 h-auto flex items-center justify-center gap-1.5">
              <CalendarCheck size={15} aria-hidden="true" />
              Book Now
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
```

---

## 6. Services.jsx
**File Path**: `src/pages/Services.jsx`

```javascript
import ServiceCard from "../components/ServiceCard";
import { CATEGORIES } from "../data/beautyData";
import { useState } from "react";

export default function Services() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <section className="py-12 sm:py-16">
      <div className="page-shell">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-sm font-bold uppercase text-gold">Salon menu</p>
          <h1 className="section-title mt-2">Beauty Services</h1>
          <p className="mt-4 text-base leading-7 text-plum/70">
            Explore our curated menu of professional hair, skin, eye, makeup, and spa services.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="mb-10 flex gap-2 overflow-x-auto pb-3 border-b border-rose/10 scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeTab === "all"
                ? "bg-rose text-white shadow-md"
                : "bg-petal text-plum/70 border border-rose/10 hover:bg-rose/5"
            }`}
          >
            All Services
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === cat.id
                  ? "bg-rose text-white shadow-md"
                  : "bg-petal text-plum/70 border border-rose/10 hover:bg-rose/5"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grouped Services Layout */}
        <div className="space-y-12">
          {CATEGORIES.filter((cat) => activeTab === "all" || cat.id === activeTab).map((category) => (
            <div key={category.id} className="border-b border-rose/5 pb-10 last:border-b-0 last:pb-0">
              <h2 className="font-display text-2xl font-bold text-plum mb-6 flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-rose"></span>
                {category.name}
                <span className="text-sm font-semibold text-plum/50">({category.services.length} options)</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {category.services.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## 7. Home.jsx
**File Path**: `src/pages/Home.jsx`

```javascript
import { CalendarCheck, ChevronRight, Heart, Scissors, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import ServiceCard from "../components/ServiceCard";
import { HERO_IMAGE, SERVICES, STUDIO_IMAGE } from "../data/beautyData";
import { isAdminAuthenticated } from "../utils/bookingStorage";

export default function Home() {
  const featuredServices = SERVICES.slice(0, 4);
  const isAdmin = isAdminAuthenticated();

  return (
    <>
      <section className="relative min-h-[76vh] overflow-hidden">
        <img
          src={HERO_IMAGE}
          alt="Professional makeup and beauty styling"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-plum/85 via-plum/55 to-rose/20" />
        <div className="relative z-10 flex min-h-[76vh] items-center">
          <div className="page-shell py-14">
            <div className="max-w-2xl text-white">
              <p className="inline-flex items-center gap-2 text-sm font-bold uppercase text-gold">
                <Sparkles size={18} aria-hidden="true" />
                Soft glam studio
              </p>
              <h1 className="mt-5 font-display text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
                Dhanvika Beauty Parlour
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/88 sm:text-lg">
                A modern beauty parlour for hair, skin, makeup, nails, spa care, and confident everyday glow.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {isAdmin ? (
                  <Link to="/admin" className="primary-button bg-gold text-plum hover:bg-white">
                    <CalendarCheck size={19} aria-hidden="true" />
                    Manage Bookings
                  </Link>
                ) : (
                  <Link to="/booking" className="primary-button bg-gold text-plum hover:bg-white">
                    <CalendarCheck size={19} aria-hidden="true" />
                    Book Appointment
                  </Link>
                )}
                <Link to="/services" className="secondary-button border-white/35 bg-white/10 text-white hover:bg-white hover:text-plum">
                  View Services
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="page-shell">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-gold">Popular picks</p>
              <h2 className="section-title mt-2">Signature Services</h2>
            </div>
            <Link to="/services" className="secondary-button self-start">
              All Services
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="page-shell grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="overflow-hidden rounded-lg shadow-salon">
            <img src={STUDIO_IMAGE} alt="Beauty salon styling chairs" className="h-full min-h-[340px] w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase text-gold">Polished care</p>
            <h2 className="section-title mt-2">Your appointment, beautifully organized</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-plum/70">
              Choose from salon essentials and special occasion services, then reserve a clear time slot online. The
              booking calendar marks booked appointments in red and available slots in green.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-rose/10 bg-petal p-4">
                <Scissors className="text-rose" size={25} aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-plum">Hair experts</p>
              </div>
              <div className="rounded-lg border border-lavender/40 bg-lavender/20 p-4">
                <Heart className="text-plum" size={25} aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-plum">Skin and spa</p>
              </div>
              <div className="rounded-lg border border-gold/20 bg-gold/10 p-4">
                <Sparkles className="text-gold" size={25} aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-plum">Event glam</p>
              </div>
            </div>
            {isAdmin ? (
              <Link to="/admin" className="primary-button mt-8">
                <CalendarCheck size={19} aria-hidden="true" />
                Manage Bookings
              </Link>
            ) : (
              <Link to="/booking" className="primary-button mt-8">
                <CalendarCheck size={19} aria-hidden="true" />
                Reserve a Slot
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
```

---

## 8. Reviews.jsx
**File Path**: `src/pages/Reviews.jsx`

```javascript
import { CheckCircle2, MessageCircle, Send, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SERVICES } from "../data/beautyData";
import { addReview, getReviews, deleteReview } from "../utils/reviewStorage";
import { isAdminAuthenticated } from "../utils/bookingStorage";

const emptyReview = {
  customerName: "",
  serviceName: "",
  rating: 5,
  comment: "",
};

function RatingStars({ rating, onChange }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={rating === value}
          aria-label={`${value} star rating`}
          onClick={() => onChange(value)}
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
            value <= rating
              ? "border-gold bg-gold/15 text-gold"
              : "border-rose/15 bg-white text-plum/25 hover:border-gold/50"
          }`}
        >
          <Star size={19} fill={value <= rating ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, onDelete }) {
  const isAdmin = isAdminAuthenticated();
  
  return (
    <article className="rounded-lg border border-rose/10 bg-white p-5 shadow-salon relative">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-plum">{review.customerName}</h3>
          <p className="mt-1 text-sm font-semibold text-rose">{review.serviceName}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1 text-gold" aria-label={`${review.rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                size={16}
                fill={value <= review.rating ? "currentColor" : "none"}
                aria-hidden="true"
              />
            ))}
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(review.id)}
              className="mt-1 text-red-500 hover:text-red-700 font-bold text-xs px-2 py-1 border border-red-200 hover:border-red-400 rounded-md hover:bg-red-50 transition flex items-center gap-1 shadow-sm"
              title="Delete review"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-plum/70">{review.comment}</p>
      <p className="mt-5 text-xs font-bold uppercase text-plum/45">
        {new Date(review.createdAt).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </p>
    </article>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState(() => getReviews());
  const [form, setForm] = useState(emptyReview);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return "0.0";
    const total = reviews.reduce((sum, review) => sum + Number(review.rating), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitted(false);
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.customerName.trim()) nextErrors.customerName = "Name is required.";
    if (!form.serviceName) nextErrors.serviceName = "Please choose a service.";
    if (!form.comment.trim()) nextErrors.comment = "Please write your review.";
    else if (form.comment.trim().length < 10) nextErrors.comment = "Review should be at least 10 characters.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    const review = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      customerName: form.customerName.trim(),
      serviceName: form.serviceName,
      rating: Number(form.rating),
      comment: form.comment.trim(),
      createdAt: new Date().toISOString(),
    };
    setReviews(addReview(review));
    setForm(emptyReview);
    setSubmitted(true);
  };

  const handleDeleteReview = (reviewId) => {
    if (window.confirm("Are you sure you want to permanently delete this review?")) {
      setReviews(deleteReview(reviewId));
    }
  };

  return (
    <section className="bg-petal/45 py-12 sm:py-16">
      <div className="page-shell">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-sm font-bold uppercase text-gold">Customer Reviews</p>
          <h1 className="section-title mt-2">Loved by Dhanvika Clients</h1>
          <p className="mt-4 text-base leading-7 text-plum/70">
            Read customer experiences and share your own visit to Dhanvika Beauty Parlour.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-lg border border-rose/10 bg-white p-5 text-center shadow-salon">
            <p className="text-3xl font-extrabold text-plum">{averageRating}</p>
            <p className="mt-1 text-sm font-bold text-plum/65">Average rating</p>
          </article>
          <article className="rounded-lg border border-gold/20 bg-white p-5 text-center shadow-salon">
            <p className="text-3xl font-extrabold text-plum">{reviews.length}</p>
            <p className="mt-1 text-sm font-bold text-plum/65">Total reviews</p>
          </article>
          <article className="rounded-lg border border-lavender/40 bg-white p-5 text-center shadow-salon">
            <p className="text-3xl font-extrabold text-plum">5</p>
            <p className="mt-1 text-sm font-bold text-plum/65">Star experience goal</p>
          </article>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-rose/10 bg-white p-5 shadow-salon sm:p-7">
            {/* Form content */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose text-white">
                  <MessageCircle size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold uppercase text-gold">Write a review</p>
                  <h2 className="font-display text-3xl font-bold text-plum">Share Your Experience</h2>
                </div>
              </div>
            </div>
            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="field-label">Customer name</span>
                <input className="field-input" value={form.customerName} onChange={(e) => updateField("customerName", e.target.value)} placeholder="Your name" />
                {errors.customerName && <span className="text-sm font-semibold text-red-600">{errors.customerName}</span>}
              </label>
              <label className="grid gap-2">
                <span className="field-label">Service</span>
                <select className="field-input" value={form.serviceName} onChange={(e) => updateField("serviceName", e.target.value)}>
                  <option value="">Choose a service</option>
                  {SERVICES.map((service) => (
                    <option key={service.id} value={service.name}>{service.name}</option>
                  ))}
                </select>
                {errors.serviceName && <span className="text-sm font-semibold text-red-600">{errors.serviceName}</span>}
              </label>
              <div className="grid gap-2">
                <span className="field-label">Rating</span>
                <RatingStars rating={form.rating} onChange={(rating) => updateField("rating", rating)} />
              </div>
              <label className="grid gap-2">
                <span className="field-label">Review</span>
                <textarea className="field-input min-h-32 resize-y" value={form.comment} onChange={(e) => updateField("comment", e.target.value)} placeholder="Tell us what you loved about your visit" />
                {errors.comment && <span className="text-sm font-semibold text-red-600">{errors.comment}</span>}
              </label>
            </div>
            {submitted && (
              <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                <CheckCircle2 size={18} aria-hidden="true" />
                Review submitted successfully.
              </div>
            )}
            <button type="submit" className="primary-button mt-6 w-full">
              <Send size={18} aria-hidden="true" />
              Submit Review
            </button>
          </form>

          <div className="grid gap-5">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} onDelete={handleDeleteReview} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

## 9. Navbar.jsx
**File Path**: `src/components/Navbar.jsx`

> Key features: dynamic nav items based on auth state (admin vs customer vs guest), mobile dropdown menu, sticky header with blur backdrop.
> See actual file at `src/components/Navbar.jsx` for the full implementation.

---

## 10. CustomerLogin.jsx
**File Path**: `src/pages/CustomerLogin.jsx`

> Admin credentials (built in): Email `admin@glam.com` or `admin`, Password `admin123`
> See actual file at `src/pages/CustomerLogin.jsx` for the full implementation.

---

## 11. firebase/config.js
**File Path**: `src/firebase/config.js`

```javascript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForViteDevBuildSuccess",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dhanvika-beauty-parlour.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dhanvika-beauty-parlour",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dhanvika-beauty-parlour.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const storage = getStorage(app);

export const isFirebaseConfigured = 
  !!import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== "AIzaSyDummyKeyForViteDevBuildSuccess";
```

---

## 12. App.jsx
**File Path**: `src/App.jsx`

```javascript
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import AdminDashboard from "./components/AdminDashboard";
import { isAdminAuthenticated, isCustomerAuthenticated } from "./utils/bookingStorage";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerDashboard from "./pages/CustomerDashboard";
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

function ProtectedCustomerRoute() {
  return isCustomerAuthenticated() ? <CustomerDashboard /> : <Navigate to="/customer-login" replace />;
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
          <Route path="/customer-login" element={<CustomerLogin />} />
          <Route path="/customer-dashboard" element={<ProtectedCustomerRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-rose/10 bg-white/80 py-6">
        <div className="page-shell flex flex-col gap-2 text-sm text-plum/70 sm:flex-row sm:items-center sm:justify-between">
          <span>Dhanvika Beauty Parlour</span>
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
```
