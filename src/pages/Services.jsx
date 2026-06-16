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
