import React from 'react';
import { motion } from 'framer-motion';
import franciscoPhoto from '@/assets/francisco-cardoso.png';

export const AuthoritySection: React.FC = () => (
  <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary/30">
    <div className="max-w-3xl mx-auto">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-8 tracking-tight">
          Desenvolvido com <span className="text-primary">método profissional</span>
        </h2>

        <div className="flex flex-col items-center gap-5">
          <motion.a
            href="https://www.linkedin.com/in/franciscoegcardoso"
            target="_blank"
            rel="noopener noreferrer"
            className="relative"
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <img
              src={franciscoPhoto}
              alt="Francisco Cardoso"
              className="w-20 h-20 rounded-full border-2 border-primary/30 object-cover grayscale-[30%] contrast-[1.1] hover:grayscale-0 transition-all duration-500"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[hsl(210,80%,45%)] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </div>
          </motion.a>

          <div className="text-center max-w-xl">
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              O RXFin foi estruturado por{' '}
              <a
                href="https://www.linkedin.com/in/franciscoegcardoso"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:text-primary transition-colors duration-200 underline-offset-2 hover:underline"
              >
                Francisco Cardoso
              </a>
              , engenheiro de produção com experiência em planejamento financeiro e estratégia em empresas como{' '}
              <strong className="text-foreground">Stone</strong> e{' '}
              <strong className="text-foreground">Kraft Heinz</strong>.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              A mesma lógica usada para decisões corporativas — aplicada à vida financeira pessoal.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);
