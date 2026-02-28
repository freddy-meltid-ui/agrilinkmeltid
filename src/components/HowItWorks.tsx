import { motion } from "framer-motion";
import { ClipboardList, Handshake, Truck, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const HowItWorks = () => {
  const { t } = useTranslation();

  const steps = [
    { icon: ClipboardList, step: "01", titleKey: "howItWorks.step1Title", descKey: "howItWorks.step1Desc" },
    { icon: Handshake, step: "02", titleKey: "howItWorks.step2Title", descKey: "howItWorks.step2Desc" },
    { icon: Truck, step: "03", titleKey: "howItWorks.step3Title", descKey: "howItWorks.step3Desc" },
    { icon: CheckCircle, step: "04", titleKey: "howItWorks.step4Title", descKey: "howItWorks.step4Desc" },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 bg-card">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl mt-3 mb-4">
            {t("howItWorks.title")} <span className="text-primary">{t("howItWorks.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("howItWorks.subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <s.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="text-secondary font-bold text-sm mb-2">{s.step}</div>
              <h3 className="font-serif text-xl mb-3">{t(s.titleKey)}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t(s.descKey)}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
