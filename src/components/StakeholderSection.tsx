import { motion } from "framer-motion";
import { Sprout, Users, Tractor, Warehouse, Truck, ShoppingCart, ArrowRight } from "lucide-react";

const stakeholders = [
  {
    icon: Users,
    title: "Workers",
    description: "Find seasonal and full-time agricultural jobs near you. Get matched with farms that need your skills.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Sprout,
    title: "Farmers",
    description: "Connect with workers, rent equipment, find storage, and reach buyers — all in one place.",
    color: "bg-accent/20 text-accent-foreground",
  },
  {
    icon: Tractor,
    title: "Equipment Renters",
    description: "List your tools and machinery for rent. Reach farmers who need equipment without the cost of ownership.",
    color: "bg-secondary/20 text-secondary",
  },
  {
    icon: Warehouse,
    title: "Warehouse Owners",
    description: "Monetize your storage space. Connect with farmers and traders who need reliable warehousing.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Truck,
    title: "Transporters",
    description: "Find loads and optimize your routes. Move agricultural goods efficiently from farm to market.",
    color: "bg-accent/20 text-accent-foreground",
  },
  {
    icon: ShoppingCart,
    title: "Buyers",
    description: "Source fresh produce directly from farmers. Get competitive prices and transparent supply chains.",
    color: "bg-secondary/20 text-secondary",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const StakeholderSection = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-secondary font-semibold uppercase tracking-wider text-sm">Our Network</span>
          <h2 className="font-serif text-4xl md:text-5xl mt-3 mb-4">
            Everyone in Agriculture,{" "}
            <span className="text-primary">Connected</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you grow it, move it, store it, or buy it — our platform brings every link in the agricultural supply chain together.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {stakeholders.map((s) => (
            <motion.div
              key={s.title}
              variants={item}
              className="group relative rounded-xl border border-border bg-card p-8 hover:shadow-[var(--card-hover-shadow)] transition-all duration-300 cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-lg ${s.color} flex items-center justify-center mb-5`}>
                <s.icon className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
              <div className="mt-5 flex items-center gap-2 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default StakeholderSection;
