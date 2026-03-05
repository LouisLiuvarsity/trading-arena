import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

const FAQ_KEYS = [1, 2, 3, 4, 5, 6] as const;

export default function FAQSection() {
  const { t } = useT();

  return (
    <section id="faq" className="py-20 bg-[#0D1017]">
      <div className="max-w-3xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-display font-bold text-white text-center"
        >
          {t('land.nav.faq')}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-10"
        >
          <Accordion type="single" collapsible className="space-y-0">
            {FAQ_KEYS.map((i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-b border-white/[0.06]"
              >
                <AccordionTrigger className="text-[14px] text-[#D1D4DC] py-4 hover:no-underline [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-[#5E6673]">
                  {t(`land.faq.q${i}`)}
                </AccordionTrigger>
                <AccordionContent className="text-[13px] text-[#848E9C] pb-4 leading-relaxed">
                  {t(`land.faq.a${i}`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
