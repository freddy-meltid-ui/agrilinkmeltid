import { motion } from "framer-motion";
import { Sprout, Users, Tractor, Warehouse, Truck, ShoppingCart, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const StakeholderSection = () => {
  const { t } = useTranslation();

  const stakeholders = [
    { icon: Users, titleKey: "stakeholders.workers", descKey: "stakeholders.workersDesc", color: "bg-primary/10 text-primary" },
    { icon: Sprout, titleKey: "stakeholders.farmers", descKey: "stakeholders.farmersDesc", color: "bg-accent/20 text-accent-foreground" },
    { icon: Tractor, titleKey: "stakeholders.renters", descKey: "stakeholders.rentersDesc", color: "bg-secondary/20 text-secondary" },
    { icon: Warehouse, titleKey: "stakeholders.warehouse", descKey: "stakeholders.warehouseDesc", color: "bg-primary/10 text-primary" },
    { icon: Truck, titleKey: "stakeholders.transporters", descKey: "stakeholders.transportersDesc", color: "bg-accent/20 text-accent-foreground" },
    { icon: ShoppingCart, titleKey: "stakeholders.buyers", descKey: "stakeholders.buyersDesc", color: "bg-secondary/20 text-secondary" },
  ];

  return (
    <section id="stakeholders" className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl mt-3 mb-4">
            {t("stakeholders.title")}{" "}<span className="text-primary">{t("stakeholders.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("stakeholders.subtitle")}</p>
        </motion.div>

        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stakeholders.map((s) => (
            <motion.div key={s.titleKey} variants={item} className="group relative rounded-xl border border-border bg-card p-8 hover:shadow-[var(--card-hover-shadow)] transition-all duration-300 cursor-pointer">
              <div className={`w-14 h-14 rounded-lg ${s.color} flex items-center justify-center mb-5`}>
                <s.icon className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-xl mb-3">{t(s.titleKey)}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t(s.descKey)}</p>
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
