import React from 'react';
import { Lock, Cloud, FileText } from 'lucide-react';

const badges = [
  { icon: Lock, label: 'SSL Secure' },
  { icon: Cloud, label: 'Powered by AWS' },
  { icon: FileText, label: 'LGPD Compliant' },
];

export const TrustBadges: React.FC = () => (
  <div className="flex items-center justify-center gap-5 sm:gap-8 flex-wrap">
    {badges.map((b) => (
      <div
        key={b.label}
        className="flex items-center gap-1.5 text-[11px] text-white/35 font-medium tracking-wide uppercase"
      >
        <b.icon className="h-3.5 w-3.5" />
        {b.label}
      </div>
    ))}
  </div>
);
