import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UserCheck } from 'lucide-react';
import { useT } from '@/lib/i18n/cadreT';

interface Props { cadreName?: string; compact?: boolean }

/** Shown on any report that was filed by a cadre on behalf of a citizen. */
const CadreFiledBadge: React.FC<Props> = ({ cadreName, compact }) => {
  const T = useT();
  return (
    <Badge
      variant="outline"
      className={`bg-amber-100 text-amber-800 border-amber-300 ${compact ? 'text-[9px] px-1 py-0' : 'text-[10px]'}`}
      title={cadreName ? `${T.reported_by_cadre_prefix}: ${cadreName}` : T.reported_by_cadre_prefix}
    >
      <UserCheck className={compact ? 'w-2.5 h-2.5 mr-0.5' : 'w-3 h-3 mr-1'} />
      {compact ? T.filed_by_cadre_short : cadreName ? `${T.reported_by_cadre_prefix} · ${cadreName}` : T.reported_by_cadre_prefix}
    </Badge>
  );
};

export default CadreFiledBadge;