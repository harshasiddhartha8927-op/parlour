import { useSearchParams, Navigate } from "react-router-dom";
import BookingForm from "../components/BookingForm";
import { isAdminAuthenticated } from "../utils/bookingStorage";

export default function Booking() {
  const [searchParams] = useSearchParams();
  const defaultServiceId = searchParams.get("service") || "";

  if (isAdminAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }

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
