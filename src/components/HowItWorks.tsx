import { motion } from "framer-motion";
import { ClipboardList, Handshake, Truck, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    step: "01",
    title: "List Your Needs",
    description: "Post what you need — labor, equipment, storage, transport, or produce.",
  },
  {
    icon: Handshake,
    step: "02",
    title: "Get Matched",
    description: "Our platform connects you with verified partners in your region instantly.",
  },
  {
    icon: Truck,
    step: "03",
    title: "Coordinate & Execute",
    description: "Manage logistics, track shipments, and communicate — all in one dashboard.",
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Grow Together",
    description: "Build long-term partnerships, rate services, and scale your agricultural business.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-4 bg-card">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-secondary font-semibold uppercase tracking-wider text-sm">Simple Process</span>
          <h2 className="font-serif text-4xl md:text-5xl mt-3 mb-4">
            How It <span className="text-primary">Works</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center relative"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <s.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="text-secondary font-bold text-sm mb-2">{s.step}</div>
              <h3 className="font-serif text-xl mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.description}</p>
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
