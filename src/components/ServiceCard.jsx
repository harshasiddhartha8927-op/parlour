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
