import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const StatsSection = () => {
  const { t } = useTranslation();

  const stats = [
    { value: "10K+", labelKey: "stats.farmers" },
    { value: "5K+", labelKey: "stats.transactions" },
    { value: "800+", labelKey: "stats.regions" },
    { value: "50K+", labelKey: "stats.reduction" },
  ];

  return (
    <section className="py-20 px-4 bg-[image:var(--hero-gradient)]">
      <div className="container mx-auto max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div key={s.labelKey} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="font-serif text-4xl md:text-5xl text-primary-foreground mb-2">{s.value}</div>
              <div className="text-primary-foreground/70 text-sm font-medium">{t(s.labelKey)}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
