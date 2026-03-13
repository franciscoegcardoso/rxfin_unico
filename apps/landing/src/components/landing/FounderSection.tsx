import React from 'react';

export const FounderSection: React.FC = () => (
  <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-100">
    <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-5 text-center sm:text-left">
      <img
        src="/assets/francisco-cardoso-BucHHWLR.png"
        alt="Francisco Cardoso"
        className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-slate-200 grayscale-[30%]"
      />
      <div>
        <p className="font-semibold text-[#0d2b20]">Francisco Cardoso</p>
        <p className="text-sm text-slate-500 mt-0.5">Engenheiro de produção · Stone · Kraft Heinz</p>
        <p className="text-sm text-slate-400 italic mt-1">
          &quot;A mesma lógica corporativa — aplicada à sua vida financeira.&quot;
        </p>
      </div>
    </div>
  </section>
);
