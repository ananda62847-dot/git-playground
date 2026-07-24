import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, MapPin, Calendar, Briefcase, Tag, MessageSquare, Phone, Clock, Building } from 'lucide-react';
import { fmtIST } from '@/lib/datetime';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'suggestion' | 'grievance' | 'volunteer';
  data: any;
}

const getSentimentColor = (sentiment: string | null) => {
  switch (sentiment) {
    case 'positive': return 'bg-green-100 text-green-800 border-green-300';
    case 'negative': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'angry': return 'bg-red-100 text-red-800 border-red-300';
    case 'demanding': return 'bg-purple-100 text-purple-800 border-purple-300';
    default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  }
};

const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, type, data }) => {
  if (!data) return null;

  const renderSuggestionOrGrievance = () => (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium">{data.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Age</p>
            <p className="font-medium">{data.age} years</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="font-medium">{data.city?.split(' / ')[0]}</p>
            {data.constituency && (
              <p className="text-xs text-muted-foreground">{data.constituency?.split(' / ')[0]}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Occupation</p>
            <p className="font-medium">{data.occupation?.split(' / ')[0]}</p>
          </div>
        </div>
      </div>

      {/* Additional Location Info */}
      {(data.area || data.polling_booth) && (
        <>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            {data.area && (
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Area</p>
                  <p className="font-medium">{data.area}</p>
                </div>
              </div>
            )}
            {data.polling_booth && (
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Polling Booth</p>
                  <p className="font-medium text-sm">{data.polling_booth}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Separator />

      {/* Categories */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">Categories</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.categories?.map((cat: string) => (
            <Badge key={cat} variant="secondary" className="capitalize">
              {cat.replace(/-/g, ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sub-categories */}
      {data.sub_categories?.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Sub-categories</p>
          <div className="flex flex-wrap gap-2">
            {data.sub_categories.map((sub: string) => (
              <Badge key={sub} variant="outline" className="text-xs">
                {sub.replace(/-/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Sentiment */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Sentiment</p>
          <Badge className={getSentimentColor(data.sentiment)}>
            {data.sentiment || 'neutral'}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Score</p>
          <p className="font-medium">{((data.sentiment_score || 0.5) * 100).toFixed(0)}%</p>
        </div>
        {type === 'grievance' && data.status && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge variant="outline">{data.status}</Badge>
          </div>
        )}
      </div>

      <Separator />

      {/* Content */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">{type === 'grievance' ? 'Grievance' : 'Suggestion'}</p>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {type === 'grievance' ? data.grievance : data.suggestion}
          </p>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Submitted on {fmtIST(data.created_at)}</span>
      </div>
    </div>
  );

  const renderVolunteer = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium">{data.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="font-medium">{data.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="font-medium">{data.city?.split(' / ')[0]}</p>
            {data.constituency && (
              <p className="text-xs text-muted-foreground">{data.constituency?.split(' / ')[0]}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Availability</p>
            <p className="font-medium">{data.availability?.split(' / ')[0] || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Additional Location */}
      {(data.area || data.polling_booth) && (
        <>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            {data.area && (
              <div>
                <p className="text-xs text-muted-foreground">Area</p>
                <p className="font-medium">{data.area}</p>
              </div>
            )}
            {data.polling_booth && (
              <div>
                <p className="text-xs text-muted-foreground">Polling Booth</p>
                <p className="font-medium text-sm">{data.polling_booth}</p>
              </div>
            )}
          </div>
        </>
      )}

      <Separator />

      {/* Interests */}
      <div>
        <p className="text-sm font-medium mb-2">Areas of Interest</p>
        <div className="flex flex-wrap gap-2">
          {data.interests?.map((interest: string) => (
            <Badge key={interest} variant="secondary" className="capitalize">
              {interest.replace(/-/g, ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Submission Info */}
      {data.submission_type && (
        <>
          <Separator />
          <div className="text-sm text-muted-foreground">
            <p>Registered via: <span className="font-medium capitalize">{data.submission_type}</span> submission</p>
          </div>
        </>
      )}

      {/* Timestamp */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Registered on {fmtIST(data.created_at)}</span>
      </div>
    </div>
  );

  const getTitle = () => {
    switch (type) {
      case 'suggestion': return 'Suggestion Details';
      case 'grievance': return 'Grievance Details';
      case 'volunteer': return 'Volunteer Details';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTitle()}
            <Badge variant="outline" className="ml-2">
              ID: {data.id?.slice(0, 8)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        {type === 'volunteer' ? renderVolunteer() : renderSuggestionOrGrievance()}
      </DialogContent>
    </Dialog>
  );
};

export default DetailModal;