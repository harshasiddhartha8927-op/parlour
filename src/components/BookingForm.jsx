import { useEffect, useMemo, useState } from "react";
import { db, isFirebaseConfigured } from "../firebase/config";
import { collection, addDoc, query, where, onSnapshot, getDocs } from "firebase/firestore";
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  User,
  CheckCircle,
  AlertCircle,
  Sparkles,
  FileText
} from "lucide-react";
import { SERVICES, CATEGORIES } from "../data/beautyData";
import {
  getTodayDate,
  getCustomerSession,
  timeStringToMinutes,
  minutesToTimeString,
  parseDuration,
  areIntervalsOverlapping,
  addBooking,
  getBookings
} from "../utils/bookingStorage";
import { generateAppointmentPDF, uploadPDF } from "../utils/pdfGenerator";

function ServicePickerItem({ service, isSelected, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex gap-4 items-start rounded-xl border p-3 text-left transition-all duration-200 ${
        isSelected
          ? "border-rose bg-rose/5 ring-2 ring-rose/25 animate-pulse-subtle"
          : "border-rose/10 bg-white hover:border-rose/30"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex justify-between w-full items-start gap-2">
          <span className="font-bold text-plum text-sm tracking-tight flex items-center gap-1.5 truncate">
            <input
              type="checkbox"
              checked={isSelected}
              readOnly
              className="rounded text-rose focus:ring-rose h-4 w-4 shrink-0"
            />
            <span className="truncate">{service.name}</span>
          </span>
          <span className="font-extrabold text-gold text-sm shrink-0">{service.price}</span>
        </div>
        <div className="mt-1 text-[11px] text-plum/60 leading-normal">
          <span className="font-semibold text-rose">{service.duration}</span> • {service.description}
        </div>
      </div>
    </button>
  );
}

export default function BookingForm({ defaultServiceId = "" }) {
  const customerSession = getCustomerSession();

  // Initialize form state
  const [form, setForm] = useState({
    customerName: customerSession ? customerSession.name : "",
    phone: customerSession ? customerSession.phone : "",
    email: customerSession ? customerSession.email : "",
    date: "",
    time: "",
    notes: ""
  });

  const [selectedServices, setSelectedServices] = useState(() => {
    if (defaultServiceId) {
      const matched = SERVICES.find((s) => s.id === defaultServiceId);
      return matched ? [matched] : [];
    }
    return [];
  });

  // Active Category for Service Picker
  const [activeCategory, setActiveCategory] = useState(() => {
    if (selectedServices.length > 0) {
      const cat = CATEGORIES.find((c) => c.name === selectedServices[0].category);
      if (cat) return cat.id;
    }
    return CATEGORIES[0].id;
  });

  const [errors, setErrors] = useState({});
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState(null);

  // PDF Background generation status states
  const [pdfState, setPdfState] = useState("idle"); // 'idle' | 'generating' | 'uploading' | 'completed' | 'error'
  const [pdfError, setPdfError] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  const [invoiceWhatsApp, setInvoiceWhatsApp] = useState("");
  const [isWhatsAppTouched, setIsWhatsAppTouched] = useState(false);

  // Sync invoiceWhatsApp with form.phone if it hasn't been manually edited
  useEffect(() => {
    if (!isWhatsAppTouched) {
      setInvoiceWhatsApp(form.phone);
    }
  }, [form.phone, isWhatsAppTouched]);

  const today = getTodayDate();

  // Pre-select service if defaultServiceId changes
  useEffect(() => {
    if (defaultServiceId) {
      const match = SERVICES.find((s) => s.id === defaultServiceId);
      if (match) {
        setSelectedServices((prev) => {
          if (prev.some((s) => s.id === match.id)) return prev;
          return [...prev, match];
        });
        const cat = CATEGORIES.find((c) => c.name === match.category);
        if (cat) setActiveCategory(cat.id);
      }
    }
  }, [defaultServiceId]);

  // Real-time listener for existing bookings on the selected date
  useEffect(() => {
    if (!form.date) {
      setBookings([]);
      setLoadingBookings(false);
      return;
    }

    setLoadingBookings(true);

    const loadLocalBookings = () => {
      const allLocal = getBookings();
      const matched = allLocal.filter(
        (b) => (b.bookingDate === form.date || b.date === form.date) && 
               (b.bookingStatus === "Confirmed" || b.status === "Confirmed")
      );
      setBookings(matched);
      setLoadingBookings(false);
    };

    if (!isFirebaseConfigured) {
      loadLocalBookings();
      return;
    }

    const q = query(
      collection(db, "bookings"),
      where("bookingDate", "==", form.date),
      where("bookingStatus", "==", "Confirmed")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            startTime: data.startTime,
            endTime: data.endTime,
            duration: data.duration || data.totalDuration,
            ...data
          };
        });
        setBookings(fetched);
        setLoadingBookings(false);
      },
      (err) => {
        console.error("Firestore onSnapshot error, falling back to local storage:", err);
        loadLocalBookings();
      }
    );

    return () => unsubscribe();
  }, [form.date]);

  // Aggregate selected services details
  const totalDurationMinutes = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + parseDuration(s.duration), 0);
  }, [selectedServices]);

  const totalPricing = useMemo(() => {
    return selectedServices.reduce((acc, s) => {
      const priceVal = parseInt(s.price.replace(/\D/g, ""), 10) || 0;
      return acc + priceVal;
    }, 0);
  }, [selectedServices]);

  const totalPricingStr = useMemo(() => {
    return `Rs. ${totalPricing.toLocaleString()}`;
  }, [totalPricing]);

  const combinedServiceNames = useMemo(() => {
    return selectedServices.map((s) => s.name).join(", ");
  }, [selectedServices]);

  // Slot calculations: 10:00 AM to 6:00 PM based on combined selected services duration
  const availableSlots = useMemo(() => {
    if (!form.date || selectedServices.length === 0) return [];

    const durationMin = totalDurationMinutes;
    const openMin = timeStringToMinutes("10:00 AM"); // 600 mins
    const closeMin = timeStringToMinutes("6:00 PM"); // 1080 mins

    // Generate 15-minute start times
    const slots = [];
    for (let m = openMin; m < closeMin; m += 15) {
      slots.push(minutesToTimeString(m));
    }

    // Map booked slot intervals
    const bookedIntervals = bookings.map((b) => {
      const bStart = timeStringToMinutes(b.startTime);
      const bDur = parseDuration(b.duration || b.serviceDuration || b.totalDuration);
      return {
        start: bStart,
        end: bStart + bDur
      };
    });

    return slots.map((timeStr) => {
      const startMin = timeStringToMinutes(timeStr);
      const endMin = startMin + durationMin;
      const endTimeStr = minutesToTimeString(endMin);

      // Condition 1: Must end by or before 6:00 PM
      let isAvailable = endMin <= closeMin;

      // Condition 2: Check overlap with existing bookings (newStart < existingEnd AND newEnd > existingStart)
      if (isAvailable) {
        const hasOverlap = bookedIntervals.some((b) =>
          areIntervalsOverlapping(startMin, endMin, b.start, b.end)
        );
        if (hasOverlap) {
          isAvailable = false;
        }
      }

      return {
        time: timeStr,
        endTime: endTimeStr,
        isAvailable
      };
    });
  }, [form.date, selectedServices, totalDurationMinutes, bookings]);

  const toggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) {
        return prev.filter((s) => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
    updateField("time", ""); // Reset selected time slot
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSuccessBooking(null);
  };

  const validate = () => {
    const newErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.customerName.trim()) {
      newErrors.customerName = "Name is required.";
    }
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) {
      newErrors.phone = "Provide a valid phone number.";
    }
    if (!form.email.trim() || !emailPattern.test(form.email.trim())) {
      newErrors.email = "Provide a valid email address.";
    }
    if (selectedServices.length === 0) {
      newErrors.service = "Select at least one service.";
    }
    if (!form.date) {
      newErrors.date = "Select an appointment date.";
    } else if (form.date < today) {
      newErrors.date = "Date cannot be in the past.";
    }
    if (!form.time) {
      newErrors.time = "Select an available time slot.";
    } else {
      const slot = availableSlots.find((s) => s.time === form.time);
      if (!slot || !slot.isAvailable) {
        newErrors.time = "Selected time slot is no longer available.";
      }
    }

    // Validate Invoice WhatsApp Number
    const rawWhatsApp = invoiceWhatsApp.trim();
    if (!rawWhatsApp) {
      newErrors.invoiceWhatsApp = "Please enter a valid WhatsApp number to send the invoice.";
    } else if (!/^\d+$/.test(rawWhatsApp)) {
      newErrors.invoiceWhatsApp = "Please enter a valid WhatsApp number to send the invoice.";
    } else if (rawWhatsApp.length !== 10) {
      newErrors.invoiceWhatsApp = "Please enter a valid WhatsApp number to send the invoice.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Process PDF generation and redirection in the background
  const processPdfAndRedirect = async (payload, servicesList, targetWhatsApp) => {
    setPdfState("generating");
    setPdfError("");
    setPdfUrl("");
    try {
      // Generate PDF Blob
      const pdfBlob = generateAppointmentPDF(payload, servicesList);
      
      setPdfState("uploading");
      // Upload PDF Blob
      const uploadedUrl = await uploadPDF(pdfBlob);
      
      setPdfState("completed");
      setPdfUrl(uploadedUrl);

      // Clean/format targetWhatsApp: prefix with 91 for Indian numbers (validated to 10 digits)
      const formattedWhatsApp = `91${targetWhatsApp}`;

      // Format WhatsApp Message exactly as requested
      const message = `🌸 Dhanvika Beauty Parlour

Dear ${payload.customerName},

Your appointment has been successfully confirmed.

📅 Date: ${payload.bookingDate}
⏰ Time: ${payload.startTime}
💇 Services: ${payload.serviceName}
💰 Amount: ₹${payload.price.replace("Rs. ", "")}
🆔 Booking ID: ${payload.appointmentId}

📄 Appointment PDF:
${uploadedUrl}

Thank you for choosing Dhanvika Beauty Parlour.
Beauty | Elegance | Confidence`;

      const whatsappUrl = `https://wa.me/${formattedWhatsApp}?text=${encodeURIComponent(message)}`;
      window.location.href = whatsappUrl;
    } catch (err) {
      console.error("PDF/WhatsApp flow failed:", err);
      setPdfState("error");
      setPdfError(err.message || "Failed to generate or upload PDF.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});
    setPdfState("idle");
    setPdfError("");
    setPdfUrl("");

    const chosenSlot = availableSlots.find((s) => s.time === form.time);
    const appointmentId = `APT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const bookingPayload = {
      id: appointmentId,
      appointmentId,
      customerName: form.customerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      selectedServices: selectedServices.map((s) => s.name),
      serviceName: combinedServiceNames,
      bookingDate: form.date,
      startTime: form.time,
      endTime: chosenSlot ? chosenSlot.endTime : "",
      duration: `${totalDurationMinutes} min`,
      totalDuration: totalDurationMinutes,
      price: totalPricingStr,
      bookingStatus: "Confirmed",
      notes: form.notes.trim(),
      createdTime: new Date().toISOString(),
      invoiceWhatsApp: invoiceWhatsApp.trim()
    };

    // Save a copy of selectedServices before clearing state
    const servicesSnap = [...selectedServices];

    try {
      if (!isFirebaseConfigured) {
        // Prevent double booking checking local storage
        const localBookings = getBookings();
        const isDup = localBookings.some(
          (b) =>
            (b.bookingDate === form.date || b.date === form.date) &&
            (b.startTime === form.time || b.time === form.time) &&
            (b.bookingStatus === "Confirmed" || b.status === "Confirmed")
        );

        if (isDup) {
          setErrors({ submit: "This slot was just booked. Please select another slot." });
          setSubmitting(false);
          return;
        }

        // Save to local storage
        addBooking(bookingPayload);
      } else {
        // Prevent double booking checking Firestore collection one more time
        const dupQuery = query(
          collection(db, "bookings"),
          where("bookingDate", "==", form.date),
          where("startTime", "==", form.time),
          where("bookingStatus", "==", "Confirmed")
        );
        const dupSnapshot = await getDocs(dupQuery);

        if (!dupSnapshot.empty) {
          setErrors({ submit: "This slot was just booked by another customer. Please select another slot." });
          setSubmitting(false);
          return;
        }

        await addDoc(collection(db, "bookings"), bookingPayload);
        // Also mirror in local storage for customer's own device history
        addBooking(bookingPayload);
      }

      setSuccessBooking(bookingPayload);

      // Clear slot & form notes, keep contact data
      setForm((prev) => ({
        ...prev,
        time: "",
        notes: ""
      }));
      setSelectedServices([]);

      // Kick off background PDF generation and upload
      processPdfAndRedirect(bookingPayload, servicesSnap, invoiceWhatsApp.trim());

    } catch (err) {
      console.error("Failed to save booking:", err);
      // Fallback write to local storage if Firestore write fails
      try {
        addBooking(bookingPayload);
        setSuccessBooking(bookingPayload);
        setForm((prev) => ({
          ...prev,
          time: "",
          notes: ""
        }));
        setSelectedServices([]);

        // Kick off background PDF generation and upload
        processPdfAndRedirect(bookingPayload, servicesSnap, invoiceWhatsApp.trim());

      } catch (localErr) {
        setErrors({ submit: "Failed to confirm appointment. Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentCategory = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];

  return (
    <div className="mx-auto max-w-7xl px-2">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] items-start">
        {/* Left Column: Form Card */}
        <div className="rounded-2xl border border-rose/10 bg-white p-6 shadow-md md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Form Header */}
            <div className="border-b border-rose/5 pb-4">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose">
                <Sparkles size={14} className="animate-pulse" />
                Dhanvika Styling
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold text-plum">Schedule Service</h2>
              <p className="text-sm text-plum/60 mt-1">Please provide details, pick services, and select an available slot.</p>
            </div>

            {errors.submit && (
              <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700 border border-red-100">
                <AlertCircle size={18} />
                <span>{errors.submit}</span>
              </div>
            )}

            {/* 1. Customer Details (Name & Phone side-by-side on desktop, Email full-width) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-plum/45 border-b border-rose/5 pb-1">1. Customer Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="field-label flex items-center gap-2 text-plum/85">
                    <User size={15} className="text-rose" />
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    className="field-input text-plum"
                    value={form.customerName}
                    onChange={(e) => updateField("customerName", e.target.value)}
                    disabled={submitting}
                  />
                  {errors.customerName && <p className="text-xs font-bold text-red-500 mt-1">{errors.customerName}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="field-label flex items-center gap-2 text-plum/85">
                    <Phone size={15} className="text-rose" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit number"
                    className="field-input text-plum"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    disabled={submitting}
                  />
                  {errors.phone && <p className="text-xs font-bold text-red-500 mt-1">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="field-label flex items-center gap-2 text-plum/85">
                    <Mail size={15} className="text-rose" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="field-input text-plum"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    disabled={submitting}
                  />
                  {errors.email && <p className="text-xs font-bold text-red-500 mt-1">{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* 2. Service Selection Grid */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-plum/45 border-b border-rose/5 pb-1">2. Select Services</h3>
              
              {/* Category selector wrapping properly */}
              <div className="flex flex-wrap gap-2 pb-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`rounded-full px-4 py-2 text-xs font-bold tracking-wide transition-all duration-200 ${
                      activeCategory === cat.id
                        ? "bg-rose text-white shadow-md shadow-rose/25"
                        : "bg-petal/60 text-plum/75 hover:bg-rose/10 hover:text-rose border border-rose/10"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Service list equal-height grid */}
              <div className="grid gap-3 sm:grid-cols-2 max-h-[300px] overflow-y-auto border border-rose/10 rounded-xl p-3 bg-petal/10 scrollbar-thin">
                {currentCategory.services.map((service) => {
                  const isSelected = selectedServices.some((s) => s.id === service.id);
                  return (
                    <ServicePickerItem
                      key={service.id}
                      service={service}
                      isSelected={isSelected}
                      onToggle={() => toggleService(service)}
                      disabled={submitting}
                    />
                  );
                })}
              </div>
              {errors.service && <p className="text-xs font-bold text-red-500 mt-1">{errors.service}</p>}
            </div>

            {/* 3. Date & Notes Layout */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-plum/45 border-b border-rose/5 pb-1">3. Select Date & Notes</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="field-label flex items-center gap-2 text-plum/85">
                    <Calendar size={15} className="text-rose" />
                    Booking Date
                  </label>
                  <input
                    type="date"
                    min={today}
                    className="field-input text-plum"
                    value={form.date}
                    onChange={(e) => {
                      updateField("date", e.target.value);
                      updateField("time", "");
                    }}
                    disabled={submitting}
                  />
                  {errors.date && <p className="text-xs font-bold text-red-500 mt-1">{errors.date}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="field-label flex items-center gap-2 text-plum/85">
                    <FileText size={15} className="text-rose" />
                    Special Notes / Requests
                  </label>
                  <textarea
                    placeholder="E.g. preferences, styler choice, allergies..."
                    rows={2}
                    className="field-input resize-none py-2.5 text-plum"
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* 4. Real-time Slots Grid */}
            {form.date && selectedServices.length > 0 && (
              <div className="mt-6 pt-6 border-t border-rose/10 space-y-4">
                <div className="flex items-center justify-between border-b border-rose/5 pb-1.5">
                  <label className="field-label flex items-center gap-2 text-plum/85">
                    <Clock size={15} className="text-rose" />
                    Available Time Slots
                  </label>
                  <span className="text-xs font-bold text-rose bg-rose/5 px-2.5 py-0.5 rounded-full">
                    {availableSlots.filter((s) => s.isAvailable).length} Available
                  </span>
                </div>

                {loadingBookings ? (
                  <div className="flex justify-center items-center py-10 text-sm text-plum/60 font-semibold animate-pulse w-full">
                    Checking live availability from Firestore...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-sm font-semibold text-red-600 bg-red-50 border border-dashed border-red-200 rounded-xl">
                    No slots are available for the selected duration on this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                    {availableSlots.map((slot) => {
                      const isSelected = form.time === slot.time;
                      
                      if (!slot.isAvailable) {
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled
                            className="rounded-xl border border-red-100 bg-red-50/20 py-2.5 text-center text-xs font-bold text-red-400 opacity-60 cursor-not-allowed line-through"
                          >
                            {slot.time}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => updateField("time", slot.time)}
                          className={`rounded-xl border py-2.5 text-center text-xs font-extrabold tracking-wide transition-all duration-200 ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/25 animate-none"
                              : "bg-white border-emerald-100 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50/35"
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.time && <p className="text-xs font-bold text-red-500 mt-1">{errors.time}</p>}
              </div>
            )}

          </form>
        </div>

        {/* Right Column: Sticky Summary Receipt */}
        <div className="h-fit space-y-6 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-rose/10 bg-white p-6 shadow-md sm:p-7">
            <h3 className="font-display text-lg font-bold text-plum border-b border-rose/10 pb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-gold" />
              Booking Summary
            </h3>
            
            <div className="mt-5 space-y-4">
              
              {/* Selected Services Detail */}
              <div className="flex flex-col gap-2 rounded-xl bg-petal/40 p-4 border border-rose/5">
                <div className="flex items-center gap-2 border-b border-rose/5 pb-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose/10 text-rose shrink-0 shadow-sm border border-rose/5">
                    <Sparkles size={14} />
                  </span>
                  <p className="text-[10px] font-extrabold text-plum/40 uppercase tracking-wider">Services Selected ({selectedServices.length})</p>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                  {selectedServices.length === 0 ? (
                    <p className="text-xs text-plum/50 italic">Select one or more services</p>
                  ) : (
                    selectedServices.map((s) => (
                      <div key={s.id} className="flex justify-between text-xs text-plum font-semibold gap-4">
                        <span className="truncate">{s.name}</span>
                        <span className="text-plum/50 font-normal shrink-0">{s.duration} • {s.price}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Timing Detail */}
              <div className="flex items-start gap-3 rounded-xl bg-petal/40 p-4 border border-rose/5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold shrink-0 shadow-sm border border-rose/5">
                  <Clock size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold text-plum/40 uppercase tracking-wider">Scheduled Timing</p>
                  <p className="text-sm font-extrabold text-plum mt-0.5">
                    {form.date
                      ? new Date(form.date + "T00:00:00").toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })
                      : "Choose date"}
                  </p>
                  {form.time && (
                    <p className="text-xs font-bold text-emerald-600 mt-0.5">
                      {form.time} - {availableSlots.find((s) => s.time === form.time)?.endTime}
                    </p>
                  )}
                  {selectedServices.length > 0 && (
                    <p className="text-[10px] font-semibold text-plum/50 mt-1">
                      Total Duration: {totalDurationMinutes} min
                    </p>
                  )}
                </div>
              </div>

              {/* Client info summary */}
              {form.customerName && (
                <div className="rounded-xl bg-petal/20 p-4 border border-rose/5 text-xs space-y-2">
                  <p className="font-extrabold text-plum/40 uppercase tracking-wider text-[10px]">Client Details</p>
                  <div className="flex justify-between items-center">
                    <span className="text-plum/60 font-medium">Name:</span>
                    <strong className="text-plum font-bold">{form.customerName}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-plum/60 font-medium">Phone:</span>
                    <strong className="text-plum font-bold">{form.phone}</strong>
                  </div>
                  {form.notes && (
                    <div className="pt-2 border-t border-rose/5">
                      <span className="text-plum/60 block font-bold text-[10px] uppercase">Notes:</span>
                      <p className="mt-0.5 text-plum/70 italic leading-normal font-medium">"{form.notes}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Price calculations */}
              {selectedServices.length > 0 && (
                <div className="border-t border-rose/10 pt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-plum">
                    <span className="text-plum/60 font-medium">Services Subtotal</span>
                    <span className="font-extrabold text-plum">{totalPricingStr}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-plum/50">
                    <span>Taxes & Booking Fees</span>
                    <span className="font-bold text-emerald-600">Rs. 0 (Free)</span>
                  </div>
                  <div className="flex items-center justify-between text-plum border-t border-dashed border-rose/10 pt-3 mt-1">
                    <span className="text-base font-extrabold">Estimated Total</span>
                    <span className="text-xl font-extrabold text-gold">{totalPricingStr}</span>
                  </div>
                </div>
              )}
              
              {/* Invoice WhatsApp Number */}
              <div className="space-y-1.5 border-t border-rose/10 pt-4">
                <label className="field-label flex items-center gap-2 text-plum/85 font-semibold text-xs">
                  <Phone size={14} className="text-rose" />
                  Invoice WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="Enter customer WhatsApp number"
                  className="field-input text-plum w-full text-xs py-2"
                  value={invoiceWhatsApp}
                  onChange={(e) => {
                    setInvoiceWhatsApp(e.target.value);
                    setIsWhatsAppTouched(true);
                    setErrors((prev) => ({ ...prev, invoiceWhatsApp: "" }));
                  }}
                  disabled={submitting}
                />
                {errors.invoiceWhatsApp && (
                  <p className="text-[11px] font-bold text-red-500 mt-1">{errors.invoiceWhatsApp}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedServices.length === 0 || !form.date || !form.time}
                className="w-full primary-button py-3.5 text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-3"
              >
                {submitting ? "Saving Booking..." : "Confirm Booking & Send Invoice"}
              </button>
              
              <p className="text-[11px] text-center text-plum/50 leading-relaxed max-w-xs mx-auto">
                *Locks your slot immediately and opens WhatsApp to confirm details with the salon stylist.
              </p>
            </div>
          </div>

          {/* Real-time Success Card */}
          {successBooking && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/95 p-5 text-emerald-950 shadow-md backdrop-blur-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-600 animate-bounce" size={20} />
                <h4 className="font-bold text-sm text-emerald-900">Booking Confirmed!</h4>
              </div>
              
              {/* PDF Background status tracking */}
              <div className="mt-2.5 space-y-1 bg-white/60 p-3 rounded-xl border border-emerald-100/60 text-xs">
                {pdfState === "generating" && (
                  <p className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <Sparkles className="animate-spin text-pink-500 shrink-0" size={14} />
                    🌸 Generating appointment PDF slip...
                  </p>
                )}
                {pdfState === "uploading" && (
                  <p className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <FileText className="animate-pulse text-yellow-600 shrink-0" size={14} />
                    ☁️ Uploading PDF to secure temporary host...
                  </p>
                )}
                {pdfState === "completed" && (
                  <p className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <CheckCircle className="text-emerald-600 shrink-0" size={14} />
                    💬 Redirecting to WhatsApp...
                  </p>
                )}
                {pdfState === "error" && (
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-red-700 font-semibold">
                      <AlertCircle className="shrink-0" size={14} />
                      Could not compile PDF, redirecting to standard WhatsApp message...
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const message = `🌸 Dhanvika Beauty Parlour

Dear ${successBooking.customerName},

Your appointment has been successfully confirmed.

📅 Date: ${successBooking.bookingDate}
⏰ Time: ${successBooking.startTime}
💇 Services: ${successBooking.serviceName}
💰 Amount: ₹${successBooking.price.replace("Rs. ", "")}
🆔 Booking ID: ${successBooking.appointmentId}

Thank you for choosing Dhanvika Beauty Parlour.
Beauty | Elegance | Confidence`;
                        const targetWhatsApp = successBooking.invoiceWhatsApp || "";
                        const formattedWhatsApp = `91${targetWhatsApp}`;
                        const whatsappUrl = `https://wa.me/${formattedWhatsApp}?text=${encodeURIComponent(message)}`;
                        window.location.href = whatsappUrl;
                      }}
                      className="mt-1 text-[10px] bg-emerald-600 text-white px-2 py-1 rounded font-bold hover:bg-emerald-700 transition"
                    >
                      Open WhatsApp Manually
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-xl bg-white/80 p-3 text-[11px] font-mono space-y-1.5 border border-emerald-100">
                <div><strong>Booking ID:</strong> {successBooking.appointmentId}</div>
                <div><strong>Services:</strong> {successBooking.serviceName}</div>
                <div><strong>Date:</strong> {successBooking.bookingDate}</div>
                <div><strong>Time:</strong> {successBooking.startTime} - {successBooking.endTime}</div>
                <div><strong>Total Price:</strong> {successBooking.price}</div>
                {pdfUrl && (
                  <div className="pt-2 mt-2 border-t border-dashed border-emerald-200 text-xs font-sans">
                    <strong>PDF Receipt: </strong>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 underline font-bold break-all hover:text-emerald-900"
                    >
                      Download Invoice
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
