import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Mail, Lock, MapPin, Building2 } from 'lucide-react';
import { constituenciesByCity } from '@/lib/constituencies';
import { DEPARTMENTS } from '@/lib/departments';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const allConstituencies = Object.entries(constituenciesByCity).flatMap(([city, constituencies]) => 
  constituencies.map(c => ({ city, constituency: c }))
);

type AccRole = 'moderator' | 'admin' | 'department';

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<AccRole>('moderator');
  const [department, setDepartment] = useState('');
  const [selectedConstituencies, setSelectedConstituencies] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleConstituency = (constituency: string) => {
    if (selectedConstituencies.includes(constituency)) {
      setSelectedConstituencies(selectedConstituencies.filter(c => c !== constituency));
    } else {
      setSelectedConstituencies([...selectedConstituencies, constituency]);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password || !displayName) {
      toast.error('Please fill all required fields');
      return;
    }

    if (role === 'moderator' && selectedConstituencies.length === 0) {
      toast.error('Please select at least one constituency for moderator');
      return;
    }
    if (role === 'department' && !department) {
      toast.error('Please select a department');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          displayName,
          role,
          constituencies: role === 'moderator' ? selectedConstituencies : [],
          department: role === 'department' ? department : undefined,
        },
      });

      if (error) throw error;

      toast.success(`${role === 'admin' ? 'Admin' : role === 'department' ? 'Department officer' : 'Moderator'} account created successfully!`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setRole('moderator');
    setDepartment('');
    setSelectedConstituencies([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create New Account
          </DialogTitle>
          <DialogDescription>
            Create a new admin or moderator account with constituency-based access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              placeholder="Enter display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password *
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AccRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moderator">Moderator (Constituency-scoped)</SelectItem>
                <SelectItem value="admin">Admin (Full Access)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Department selector */}
          {role === 'department' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Department *
              </Label>
              <p className="text-xs text-muted-foreground">
                Officer will only see problems &amp; escalations for this department.
              </p>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.icon} {d.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Constituency Selection for Moderators */}
          {role === 'moderator' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Assign Constituencies *
              </Label>
              <p className="text-xs text-muted-foreground">
                Moderator will only see data from selected constituencies
              </p>
              <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                {Object.entries(constituenciesByCity).map(([city, constituencies]) => (
                  <div key={city} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {city.split(' / ')[0]}
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {constituencies.map((c) => (
                        <label
                          key={c}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                            selectedConstituencies.includes(c) 
                              ? 'bg-tvk-maroon/10 border border-tvk-maroon' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Checkbox
                            checked={selectedConstituencies.includes(c)}
                            onCheckedChange={() => toggleConstituency(c)}
                          />
                          <span className="text-xs">{c.split(' / ')[0]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {selectedConstituencies.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedConstituencies.length} constituencies
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="flex-1 bg-tvk-maroon hover:bg-tvk-maroon/90"
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAccountModal;