import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-farm.jpg";
import { useTranslation } from "react-i18next";

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Agricultural farmland with logistics warehouse" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-foreground/60" />
      </div>

      <div className="relative container mx-auto max-w-6xl px-4 py-24">
        <div className="max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="inline-block bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              🌾 {t("hero.badge")}
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="font-serif text-5xl md:text-6xl lg:text-7xl text-primary-foreground leading-[1.1] mb-6">
            {t("hero.title1")}{" "}<span className="text-accent">{t("hero.title2")}</span>{" "}{t("hero.title3")}
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="text-primary-foreground/80 text-lg md:text-xl mb-10 leading-relaxed max-w-xl">
            {t("hero.subtitle")}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="flex flex-col sm:flex-row gap-4">
            <Link to="/auth">
              <Button variant="hero" size="lg" className="text-base px-8">
                {t("hero.cta")} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="hero-outline" size="lg" className="text-base px-8">
                <Play className="mr-2 w-5 h-5" /> {t("hero.ctaSecondary")}
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
