import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, Clock, Eye, AlertTriangle, XCircle } from 'lucide-react';

interface GrievanceStatusUpdaterProps {
  grievanceId: string;
  currentStatus: string;
  onUpdate?: () => void;
}

const statusOptions = [
  { value: 'received', label: 'Received / பெறப்பட்டது', icon: Clock, color: 'bg-blue-100 text-blue-800' },
  { value: 'seen', label: 'Seen / பார்க்கப்பட்டது', icon: Eye, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'in-progress', label: 'In Progress / நடவடிக்கையில்', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800' },
  { value: 'resolved', label: 'Resolved / தீர்க்கப்பட்டது', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'closed', label: 'Closed / முடிக்கப்பட்டது', icon: XCircle, color: 'bg-gray-100 text-gray-800' },
];

export const getStatusBadge = (status: string) => {
  const statusOption = statusOptions.find(s => s.value === status) || statusOptions[0];
  const Icon = statusOption.icon;
  
  return (
    <Badge className={`${statusOption.color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {statusOption.label.split(' / ')[0]}
    </Badge>
  );
};

const GrievanceStatusUpdater: React.FC<GrievanceStatusUpdaterProps> = ({
  grievanceId,
  currentStatus,
  onUpdate,
}) => {
  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('grievances')
        .update({ status: newStatus })
        .eq('id', grievanceId);

      if (error) throw error;

      toast.success('Status updated successfully');
      onUpdate?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  return (
    <Select value={currentStatus || 'received'} onValueChange={handleStatusChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => {
          const Icon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default GrievanceStatusUpdater;
