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
    navigate("/customer-login", { replace: true }); // Unified login redirect
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

            {/* Selection Dropdowns */}
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

            {/* Gallery Images Container */}
            <div className="space-y-4 pt-4 border-t border-rose/5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold text-plum text-sm">
                  Gallery References ({galleryImages.length})
                </h3>
                
                {/* Upload Button */}
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
                      {/* Delete button */}
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
