export const BOOKINGS_STORAGE_KEY = "glam_beauty_bookings";
export const ADMIN_SESSION_KEY = "glam_beauty_admin_logged_in";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getBookings = () => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const storedBookings = window.localStorage.getItem(BOOKINGS_STORAGE_KEY);
    return storedBookings ? JSON.parse(storedBookings) : [];
  } catch {
    return [];
  }
};

export const saveBookings = (bookings) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
};

export const addBooking = (booking) => {
  const bookings = getBookings();
  const nextBookings = [booking, ...bookings];
  saveBookings(nextBookings);
  return nextBookings;
};

export const cancelBooking = (bookingId) => {
  const nextBookings = getBookings().map((booking) =>
    booking.id === bookingId ? { ...booking, status: "Cancelled" } : booking,
  );
  saveBookings(nextBookings);
  return nextBookings;
};

export const deleteBooking = (bookingId) => {
  const nextBookings = getBookings().filter((booking) => booking.id !== bookingId);
  saveBookings(nextBookings);
  return nextBookings;
};

export const isSlotBooked = (bookings, date, time) =>
  bookings.some(
    (booking) =>
      booking.date === date && booking.time === time && booking.status !== "Cancelled",
  );

export const isAdminAuthenticated = () =>
  canUseStorage() && window.localStorage.getItem(ADMIN_SESSION_KEY) === "true";

export const CUSTOMERS_STORAGE_KEY = "glam_beauty_customers";
export const CUSTOMER_SESSION_KEY = "glam_beauty_customer_session";

export const getCustomers = () => {
  if (!canUseStorage()) {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveCustomers = (customers) => {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
};

export const registerCustomer = (name, email, phone, password) => {
  const customers = getCustomers();
  const normalizedEmail = email.trim().toLowerCase();
  
  if (customers.some((c) => c.email.toLowerCase() === normalizedEmail)) {
    return { success: false, error: "A user with this email already exists." };
  }

  const newCustomer = {
    id: `cust-${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    password: password, // For localStorage mock app simple storage
    createdAt: new Date().toISOString()
  };

  customers.push(newCustomer);
  saveCustomers(customers);

  // Auto login after signup
  loginCustomer(newCustomer);
  return { success: true, customer: newCustomer };
};

export const authenticateCustomer = (email, password) => {
  const customers = getCustomers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = customers.find(
    (c) => c.email.toLowerCase() === normalizedEmail && c.password === password
  );

  if (user) {
    loginCustomer(user);
    return { success: true, customer: user };
  }

  return { success: false, error: "Invalid email or password." };
};

export const loginCustomer = (customer) => {
  if (!canUseStorage()) return;
  const sessionData = { ...customer };
  delete sessionData.password; // Don't store password in session
  window.localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(sessionData));
};

export const logoutCustomer = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(CUSTOMER_SESSION_KEY);
};

export const getCustomerSession = () => {
  if (!canUseStorage()) return null;
  try {
    const session = window.localStorage.getItem(CUSTOMER_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
};

export const isCustomerAuthenticated = () => {
  return getCustomerSession() !== null;
};

export const timeStringToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const cleanStr = timeStr.trim().toUpperCase();
  const is12Hour = cleanStr.includes("AM") || cleanStr.includes("PM");
  if (is12Hour) {
    const parts = cleanStr.split(/\s+/);
    const timePart = parts[0];
    const modifier = parts[1];
    let [hours, minutes] = timePart.split(":").map(Number);
    if (isNaN(minutes)) minutes = 0;
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } else {
    const [hours, minutes] = cleanStr.split(":").map(Number);
    return hours * 60 + (minutes || 0);
  }
};

export const minutesToTimeString = (totalMinutes) => {
  let hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const modifier = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedMinutes = minutes.toString().padStart(2, "0");
  return `${hours}:${formattedMinutes} ${modifier}`;
};

export const parseDuration = (durationStr) => {
  if (typeof durationStr === "number") return durationStr;
  if (!durationStr) return 0;
  const match = durationStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

export const areIntervalsOverlapping = (s1, e1, s2, e2) => {
  return Math.max(s1, s2) < Math.min(e1, e2);
};


