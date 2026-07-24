// Coimbatore-only district focus
export const constituenciesByCity: Record<string, string[]> = {
  'Coimbatore / கோயம்புத்தூர்': [
    'Coimbatore North / கோயம்புத்தூர் வடக்கு',
    'Coimbatore South / கோயம்புத்தூர் தெற்கு',
    'Kavundampalayam / கவுண்டம்பாளையம்',
    'Kinathukadavu / கீனத்துக்கடவு',
    'Mettupalayam / மேட்டுப்பாளையம்',
    'Pollachi / பொள்ளாச்சி',
    'Singanallur / சிங்காநல்லூர்',
    'Sulur / சூலூர்',
    'Thondamuthur / தொண்டாமுத்தூர்',
    'Valparai / வால்பாறை',
  ],
};

export const getCitiesFromConstituency = (): string[] => {
  return Object.keys(constituenciesByCity);
};

export const getConstituenciesForCity = (city: string): string[] => {
  return constituenciesByCity[city] || [];
};

// Helpful constants for any UI that wants to hard-lock to Coimbatore.
export const DEFAULT_DISTRICT = 'Coimbatore / கோயம்புத்தூர்';
export const COIMBATORE_CONSTITUENCIES = constituenciesByCity[DEFAULT_DISTRICT];
