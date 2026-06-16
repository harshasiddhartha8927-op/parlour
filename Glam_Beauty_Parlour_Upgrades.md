# Glam Beauty Parlour Upgrades - Modified Source Files

This file contains the complete updated source code for all modified files in the parlour scheduling system.

---

## 1. BookingForm.jsx
**File Path**: `src/components/BookingForm.jsx`

```javascript
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase/config";
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
  areIntervalsOverlapping
} from "../utils/bookingStorage";

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
        console.error("Firestore onSnapshot error:", err);
        setLoadingBookings(false);
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    const chosenSlot = availableSlots.find((s) => s.time === form.time);
    const appointmentId = `APT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const bookingPayload = {
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
      createdTime: new Date().toISOString()
    };

    try {
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

      setSuccessBooking(bookingPayload);
      
      // WhatsApp message format
      const waText = `Hello, I want to confirm my appointment.

Appointment Details:
Booking ID: ${bookingPayload.appointmentId}
Customer Name: ${bookingPayload.customerName}
Phone Number: ${bookingPayload.phone}
Email: ${bookingPayload.email}
Selected Services: ${bookingPayload.serviceName}
Appointment Date: ${bookingPayload.bookingDate}
Start Time: ${bookingPayload.startTime}
End Time: ${bookingPayload.endTime}
Total Duration: ${bookingPayload.duration}
Total Price: ${bookingPayload.price}
Notes: ${bookingPayload.notes || "None"}

Please confirm my booking.`;

      const whatsappUrl = `https://wa.me/919876543210?text=${encodeURIComponent(waText)}`;

      // Clear slot & form except basic contact data
      setForm((prev) => ({
        ...prev,
        time: "",
        notes: ""
      }));
      setSelectedServices([]);

      // Redirect immediately
      window.location.href = whatsappUrl;

    } catch (err) {
      console.error("Failed to save booking:", err);
      setErrors({ submit: "Failed to confirm appointment. Please try again." });
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
              <div className="grid gap-3 sm:grid-cols-2 max-h-[260px] overflow-y-auto border border-rose/10 rounded-xl p-3 bg-petal/10 scrollbar-thin">
                {currentCategory.services.map((service) => {
                  const isSelected = selectedServices.some((s) => s.id === service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={`flex flex-col h-full justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-rose bg-rose/5 ring-2 ring-rose/25"
                          : "border-rose/10 bg-white hover:border-rose/30"
                      }`}
                    >
                      <div className="flex justify-between w-full items-start gap-3">
                        <span className="font-bold text-plum text-sm tracking-tight flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-rose focus:ring-rose h-4 w-4"
                          />
                          {service.name}
                        </span>
                        <span className="font-extrabold text-gold text-sm shrink-0">{service.price}</span>
                      </div>
                      <div className="mt-2 text-xs text-plum/60 leading-normal pl-6">
                        <span className="font-semibold text-rose">{service.duration}</span> • {service.description}
                      </div>
                    </button>
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
              
              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedServices.length === 0 || !form.date || !form.time}
                className="w-full primary-button py-3.5 text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-3"
              >
                {submitting ? "Saving Booking..." : "Confirm Booking"}
              </button>
              
              <p className="text-[11px] text-center text-plum/50 leading-relaxed max-w-xs mx-auto">
                *Locks your slot immediately in Firestore and opens WhatsApp to confirm details with the salon stylist.
              </p>
            </div>
          </div>

          {/* Real-time Success Card */}
          {successBooking && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 text-emerald-950 shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-600" size={20} />
                <h4 className="font-bold text-sm">Booking Saved Successfully!</h4>
              </div>
              <p className="text-xs text-emerald-800/80 mt-1">Opening WhatsApp for salon notification...</p>
              <div className="mt-3 rounded-xl bg-white/70 p-3 text-[11px] font-mono space-y-1 border border-emerald-100">
                <div>ID: {successBooking.appointmentId}</div>
                <div>Time: {successBooking.startTime}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

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
import { db } from "../firebase/config";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import {
  getCustomerSession,
  isCustomerAuthenticated,
  logoutCustomer,
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
        console.error("Firestore onSnapshot error in CustomerDashboard:", error);
        setLoading(false);
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
        const docRef = doc(db, "bookings", bookingId);
        await updateDoc(docRef, {
          bookingStatus: "Cancelled",
          status: "Cancelled", // compatibility fallback
        });
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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import {
  ADMIN_SESSION_KEY,
  getTodayDate,
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
      console.error("Firestore listener error in AdminDashboard:", error);
      setLoading(false);
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
        const docRef = doc(db, "bookings", bookingId);
        await updateDoc(docRef, {
          bookingStatus: "Cancelled",
          status: "Cancelled" // Compatibility fallback
        });
      } catch (err) {
        console.error("Firestore cancel failed:", err);
        alert("Failed to cancel booking: " + err.message);
      }
    }
  };

  const handleDelete = async (bookingId) => {
    if (window.confirm("Are you sure you want to permanently delete this booking record?")) {
      try {
        const docRef = doc(db, "bookings", bookingId);
        await deleteDoc(docRef);
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
