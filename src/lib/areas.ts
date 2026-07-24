// Sample areas data for constituencies
// This provides default areas when no custom areas exist in the database

export const defaultAreasByConstituency: Record<string, { area_name: string; polling_booths: string[] }[]> = {
  // Chennai constituencies
  'Alandur / ஆலந்தூர்': [
    { area_name: 'Alandur Main / ஆலந்தூர் மெயின்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Community Hall', 'Booth 3 - Primary School'] },
    { area_name: 'St. Thomas Mount / செயின்ட் தாமஸ் மவுண்ட்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Church Hall'] },
    { area_name: 'Nanganallur / நாங்கநல்லூர்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Temple Premises', 'Booth 3 - Community Center'] },
    { area_name: 'Adambakkam / ஆதம்பாக்கம்', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Marriage Hall'] },
  ],
  'Anna Nagar / அண்ணா நகர்': [
    { area_name: 'Anna Nagar East / அண்ணா நகர் கிழக்கு', polling_booths: ['Booth 1 - DAV School', 'Booth 2 - Community Hall', 'Booth 3 - Corporation Office'] },
    { area_name: 'Anna Nagar West / அண்ணா நகர் மேற்கு', polling_booths: ['Booth 1 - SBOA School', 'Booth 2 - Tower Park'] },
    { area_name: 'Shanthi Colony / சாந்தி காலனி', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Temple Hall'] },
    { area_name: 'Thirumangalam / திருமங்கலம்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Community Center'] },
  ],
  'T.Nagar / தியாகராய நகர்': [
    { area_name: 'T.Nagar Main / தியாகராய நகர் மெயின்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Pondy Bazaar Community Hall'] },
    { area_name: 'Kodambakkam / கோடம்பாக்கம்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Film Chamber Hall'] },
    { area_name: 'West Mambalam / மேற்கு மாம்பலம்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Temple Premises'] },
    { area_name: 'Saidapet / சைதாப்பேட்டை', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Community Hall'] },
  ],
  'Velachery / வேளச்சேரி': [
    { area_name: 'Velachery Main / வேளச்சேரி மெயின்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Phoenix Mall Area', 'Booth 3 - Community Center'] },
    { area_name: 'Taramani / தாரமணி', polling_booths: ['Booth 1 - TIDEL Park Area School', 'Booth 2 - IT Corridor Hall'] },
    { area_name: 'Perungudi / பெருங்குடி', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - OMR Junction'] },
    { area_name: 'Guindy / கிண்டி', polling_booths: ['Booth 1 - IIT Area School', 'Booth 2 - RAC Ground'] },
  ],
  'Mylapore / மயிலாப்பூர்': [
    { area_name: 'Mylapore Main / மயிலாப்பூர் மெயின்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Kapaleeswarar Temple Area'] },
    { area_name: 'Mandaveli / மண்டவெளி', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Community Hall'] },
    { area_name: 'Alwarpet / ஆழ்வார்பேட்டை', polling_booths: ['Booth 1 - Govt Higher Sec School', 'Booth 2 - CP Art Centre'] },
    { area_name: 'Teynampet / தேனாம்பேட்டை', polling_booths: ['Booth 1 - Corporation Office', 'Booth 2 - Public Library'] },
  ],
  
  // Coimbatore constituencies
  'Coimbatore North / கோயம்புத்தூர் வடக்கு': [
    { area_name: 'Gandhipuram / காந்திபுரம்', polling_booths: ['Booth 1 - Town Hall', 'Booth 2 - Corporation School'] },
    { area_name: 'RS Puram / ஆர்.எஸ். புரம்', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Community Center'] },
    { area_name: 'Saibaba Colony / சாய்பாபா காலனி', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Temple Hall'] },
  ],
  'Coimbatore South / கோயம்புத்தூர் தெற்கு': [
    { area_name: 'Race Course / ரேஸ் கோர்ஸ்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Club House'] },
    { area_name: 'Peelamedu / பீளமேடு', polling_booths: ['Booth 1 - Engineering College', 'Booth 2 - Community Hall'] },
    { area_name: 'Singanallur / சிங்காநல்லூர்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Bus Stand Area'] },
  ],
  'Pollachi / பொள்ளாச்சி': [
    { area_name: 'Pollachi Town / பொள்ளாச்சி டவுன்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Market Area'] },
    { area_name: 'Anaimalai / ஆனைமலை', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Temple Premises'] },
    { area_name: 'Kinathukadavu / கீனத்துக்கடவு', polling_booths: ['Booth 1 - Community Hall', 'Booth 2 - Panchayat Office'] },
  ],
  
  // Madurai constituencies
  'Madurai Central / மதுரை மத்தி': [
    { area_name: 'Meenakshi Temple Area / மீனாட்சி கோவில் பகுதி', polling_booths: ['Booth 1 - Temple Premises', 'Booth 2 - Corporation School'] },
    { area_name: 'Town Hall / டவுன் ஹால்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Community Center'] },
    { area_name: 'Periyar Bus Stand / பெரியார் பேருந்து நிலையம்', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Market Hall'] },
  ],
  'Madurai East / மதுரை கிழக்கு': [
    { area_name: 'Mattuthavani / மாட்டுத்தாவணி', polling_booths: ['Booth 1 - Bus Stand School', 'Booth 2 - Community Hall'] },
    { area_name: 'Anna Nagar / அண்ணா நகர்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Temple Premises'] },
    { area_name: 'KK Nagar / கே.கே. நகர்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Park Area'] },
  ],
  'Madurai North / மதுரை வடக்கு': [
    { area_name: 'Tallakulam / தல்லாக்குளம்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Community Hall'] },
    { area_name: 'Vilangudi / விளாங்குடி', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Panchayat Office'] },
  ],
  
  // Salem constituencies
  'Salem North / சேலம் வடக்கு': [
    { area_name: 'Five Roads / ஐந்து சாலை', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Community Hall'] },
    { area_name: 'Hasthampatti / ஹஸ்தம்பட்டி', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Temple Premises'] },
    { area_name: 'Suramangalam / சூரமங்கலம்', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Market Area'] },
  ],
  'Salem South / சேலம் தெற்கு': [
    { area_name: 'Alagapuram / அலகாபுரம்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Community Center'] },
    { area_name: 'Kondalampatti / கொண்டலாம்பட்டி', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Temple Hall'] },
  ],
  
  // Trichy constituencies
  'Srirangam / ஸ்ரீரங்கம்': [
    { area_name: 'Srirangam Temple Area / ஸ்ரீரங்கம் கோவில் பகுதி', polling_booths: ['Booth 1 - Temple Premises', 'Booth 2 - Govt School'] },
    { area_name: 'Thiruvanaikovil / திருவானைக்கோவில்', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Community Hall'] },
    { area_name: 'TVS Nagar / டி.வி.எஸ். நகர்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Factory Area'] },
  ],
  'Tiruchirappalli East / திருச்சி கிழக்கு': [
    { area_name: 'Cantonment / கன்டோன்மென்ட்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Army Area'] },
    { area_name: 'Puthur / புத்தூர்', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Community Center'] },
    { area_name: 'Woraiyur / வரையூர்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Market Area'] },
  ],
  'Tiruchirappalli West / திருச்சி மேற்கு': [
    { area_name: 'Thillai Nagar / தில்லை நகர்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Community Hall'] },
    { area_name: 'K.K. Nagar / கே.கே. நகர்', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Temple Premises'] },
    { area_name: 'Khajamalai / கஜமலை', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - College Area'] },
  ],
  
  // Tirunelveli constituencies
  'Tirunelveli / திருநெல்வேலி': [
    { area_name: 'Palayamkottai / பாளையங்கோட்டை', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Community Hall'] },
    { area_name: 'Junction / ஜங்ஷன்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Market Area'] },
    { area_name: 'Melapalayam / மேலப்பாளையம்', polling_booths: ['Booth 1 - Primary School', 'Booth 2 - Temple Premises'] },
  ],
  
  // Thanjavur constituencies
  'Thanjavur / தஞ்சாவூர்': [
    { area_name: 'Big Temple Area / பெரிய கோவில் பகுதி', polling_booths: ['Booth 1 - Temple Premises', 'Booth 2 - Govt School'] },
    { area_name: 'Railway Station / ரயில்வே நிலையம்', polling_booths: ['Booth 1 - Corporation School', 'Booth 2 - Community Hall'] },
    { area_name: 'Medical College / மருத்துவக் கல்லூரி', polling_booths: ['Booth 1 - College Area', 'Booth 2 - Hospital Premises'] },
  ],
  'Kumbakonam / கும்பகோணம்': [
    { area_name: 'Kumbakonam Town / கும்பகோணம் டவுன்', polling_booths: ['Booth 1 - Govt School', 'Booth 2 - Temple Area'] },
    { area_name: 'Darasuram / தாராசுரம்', polling_booths: ['Booth 1 - Temple Premises', 'Booth 2 - Primary School'] },
    { area_name: 'Swamimalai / சுவாமிமலை', polling_booths: ['Booth 1 - Community Hall', 'Booth 2 - Temple Premises'] },
  ],
};

export const getDefaultAreasForConstituency = (constituency: string): { area_name: string; polling_booths: string[] }[] => {
  return defaultAreasByConstituency[constituency] || [];
};
