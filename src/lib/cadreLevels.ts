export const CADRE_LEVELS = [
  { id: 'state_admin', label: 'State Admin' },
  { id: 'state_secretary', label: 'State Secretary' },
  { id: 'zonal_in_charge', label: 'Zonal In-charge' },
  { id: 'district_head', label: 'District Head' },
  { id: 'district_secretary', label: 'District Secretary' },
  { id: 'parliament_in_charge', label: 'Parliament Constituency In-charge' },
  { id: 'constituency_coordinator', label: 'Assembly Constituency Coordinator' },
  { id: 'union_in_charge', label: 'Union / Block In-charge' },
  { id: 'town_in_charge', label: 'Town / Panchayat In-charge' },
  { id: 'ward_organizer', label: 'Ward Organizer' },
  { id: 'booth_in_charge', label: 'Booth In-charge' },
  { id: 'booth_volunteer', label: 'Booth Volunteer' },
  { id: 'youth_wing', label: 'Youth Wing' },
  { id: 'women_wing', label: 'Women Wing' },
  { id: 'student_wing', label: 'Student Wing' },
  { id: 'it_wing', label: 'IT Wing' },
  { id: 'legal_wing', label: 'Legal Wing' },
  { id: 'media_wing', label: 'Media / Spokesperson' },
  { id: 'social_media', label: 'Social Media Volunteer' },
  { id: 'field_volunteer', label: 'Field Volunteer' },
] as const;

export type CadreLevelId = typeof CADRE_LEVELS[number]['id'];
