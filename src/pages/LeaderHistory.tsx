import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, Calendar, Award, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeaderData {
  id: string;
  name: string;
  tamilName: string;
  title: string;
  tamilTitle: string;
  period: string;
  image: string;
  shortBio: string;
  tamilShortBio: string;
  fullBio: string[];
  tamilFullBio: string[];
  achievements: string[];
  tamilAchievements: string[];
  quotes: { text: string; tamilText: string }[];
}

const leadersData: Record<string, LeaderData> = {
  periyar: {
    id: 'periyar',
    name: 'Periyar E.V. Ramasamy',
    tamilName: 'பெரியார் ஈ.வெ. ராமசாமி',
    title: 'Father of Dravidian Movement',
    tamilTitle: 'திராவிட இயக்கத்தின் தந்தை',
    period: '1879 - 1973',
    image: '👨‍🦳',
    shortBio: 'Revolutionary leader who fought against caste discrimination and social inequality.',
    tamilShortBio: 'சாதி பாகுபாடு மற்றும் சமூக சமத்துவமின்மைக்கு எதிராக போராடிய புரட்சியாளர்.',
    fullBio: [
      'Erode Venkatappa Ramasamy, commonly known as Periyar, was born on September 17, 1879 in Erode, Tamil Nadu.',
      'He was the founder of the Self-Respect Movement and Dravidar Kazhagam.',
      'Periyar fought tirelessly against Brahminical supremacy, caste discrimination, and the subjugation of women.',
      'His rationalist ideology and social reform movements transformed Tamil society.',
    ],
    tamilFullBio: [
      'ஈரோடு வெங்கட்டப்ப ராமசாமி, பொதுவாக பெரியார் என்று அழைக்கப்படுபவர், 1879 செப்டம்பர் 17 அன்று தமிழ்நாட்டின் ஈரோட்டில் பிறந்தார்.',
      'அவர் சுயமரியாதை இயக்கம் மற்றும் திராவிடர் கழகத்தை நிறுவியவர்.',
      'பெரியார் பிராமண மேலாதிக்கம், சாதி பாகுபாடு மற்றும் பெண்கள் அடக்குமுறைக்கு எதிராக இடைவிடாமல் போராடினார்.',
      'அவரது பகுத்தறிவு சிந்தனையும் சமூக சீர்திருத்த இயக்கங்களும் தமிழ் சமூகத்தை மாற்றியமைத்தன.',
    ],
    achievements: [
      'Founded the Self-Respect Movement (1925)',
      'Established Dravidar Kazhagam (1944)',
      'Led the Vaikom Satyagraha for temple entry rights',
      'Championed women\'s rights and widow remarriage',
      'Promoted rationalism and scientific temper',
    ],
    tamilAchievements: [
      'சுயமரியாதை இயக்கத்தை நிறுவினார் (1925)',
      'திராவிடர் கழகத்தை நிறுவினார் (1944)',
      'கோயில் நுழைவு உரிமைக்கான வைக்கம் சத்தியாகிரகத்தை வழிநடத்தினார்',
      'பெண்கள் உரிமை மற்றும் விதவை மறுமணத்தை ஆதரித்தார்',
      'பகுத்தறிவு மற்றும் அறிவியல் மனப்பான்மையை ஊக்குவித்தார்',
    ],
    quotes: [
      { text: 'He who created god was a fool, he who spreads his name is a scoundrel, and he who worships him is a barbarian.', tamilText: 'கடவுளை உருவாக்கியவன் முட்டாள், அவன் பெயரை பரப்புபவன் அயோக்கியன், அவனை வணங்குபவன் காட்டுமிராண்டி.' },
      { text: 'There is no god, there is no god at all. He who invented god is a fool.', tamilText: 'கடவுள் இல்லை, கடவுளே இல்லை. கடவுளை கண்டுபிடித்தவன் முட்டாள்.' },
    ],
  },
  annadurai: {
    id: 'annadurai',
    name: 'C.N. Annadurai',
    tamilName: 'சி.என். அண்ணாதுரை',
    title: 'Arignar Anna - First DMK Chief Minister',
    tamilTitle: 'அறிஞர் அண்ணா - முதல் திமுக முதலமைச்சர்',
    period: '1909 - 1969',
    image: '👨‍💼',
    shortBio: 'Brilliant orator and writer who brought Dravidian ideology to political power.',
    tamilShortBio: 'திராவிட சித்தாந்தத்தை அரசியல் அதிகாரத்திற்கு கொண்டு வந்த அற்புதமான பேச்சாளர் மற்றும் எழுத்தாளர்.',
    fullBio: [
      'Conjeevaram Natarajan Annadurai was born on September 15, 1909 in Kanchipuram.',
      'He was a scholar, orator, and political leader who founded the DMK party.',
      'Anna became the first non-Congress Chief Minister of Tamil Nadu in 1967.',
      'He was instrumental in renaming Madras State to Tamil Nadu.',
    ],
    tamilFullBio: [
      'கொண்ஜீவரம் நடராஜன் அண்ணாதுரை 1909 செப்டம்பர் 15 அன்று காஞ்சிபுரத்தில் பிறந்தார்.',
      'அவர் திமுக கட்சியை நிறுவிய அறிஞர், பேச்சாளர் மற்றும் அரசியல் தலைவர்.',
      '1967-ல் தமிழ்நாட்டின் முதல் காங்கிரஸ் அல்லாத முதலமைச்சரானார்.',
      'மெட்ராஸ் மாநிலத்தை தமிழ்நாடு என மறுபெயரிடுவதில் முக்கிய பங்காற்றினார்.',
    ],
    achievements: [
      'Founded Dravida Munnetra Kazhagam (1949)',
      'First Dravidian Chief Minister of Tamil Nadu (1967)',
      'Renamed Madras State to Tamil Nadu',
      'Prolific writer and filmmaker',
      'Champion of Tamil language and culture',
    ],
    tamilAchievements: [
      'திராவிட முன்னேற்ற கழகத்தை நிறுவினார் (1949)',
      'தமிழ்நாட்டின் முதல் திராவிட முதலமைச்சர் (1967)',
      'மெட்ராஸ் மாநிலத்தை தமிழ்நாடு என மறுபெயரிட்டார்',
      'சிறந்த எழுத்தாளர் மற்றும் திரைப்படக் கலைஞர்',
      'தமிழ் மொழி மற்றும் கலாச்சாரத்தின் காவலர்',
    ],
    quotes: [
      { text: 'What we need is not a change of government, but a change of system.', tamilText: 'நமக்கு தேவை அரசாங்க மாற்றம் அல்ல, முறை மாற்றம்.' },
      { text: 'Language is the life of a race.', tamilText: 'மொழி ஒரு இனத்தின் உயிர்.' },
    ],
  },
  kamaraj: {
    id: 'kamaraj',
    name: 'K. Kamaraj',
    tamilName: 'கா. காமராஜ்',
    title: 'Kingmaker - Black Gandhi',
    tamilTitle: 'கிங்மேக்கர் - கருப்பு காந்தி',
    period: '1903 - 1975',
    image: '👨‍🦰',
    shortBio: 'Selfless leader who transformed Tamil Nadu\'s education system.',
    tamilShortBio: 'தமிழ்நாட்டின் கல்வி முறையை மாற்றியமைத்த தன்னலமற்ற தலைவர்.',
    fullBio: [
      'Kumaraswami Kamaraj was born on July 15, 1903 in Virudhunagar.',
      'He served as Chief Minister of Tamil Nadu from 1954 to 1963.',
      'Kamaraj was known for his simple lifestyle and dedication to education.',
      'He was instrumental in making education accessible to the poor through the mid-day meal scheme.',
    ],
    tamilFullBio: [
      'குமாரசாமி காமராஜ் 1903 ஜூலை 15 அன்று விருதுநகரில் பிறந்தார்.',
      '1954 முதல் 1963 வரை தமிழ்நாட்டின் முதலமைச்சராக பணியாற்றினார்.',
      'காமராஜ் தனது எளிமையான வாழ்க்கை முறை மற்றும் கல்விக்கான அர்ப்பணிப்புக்கு பெயர் பெற்றவர்.',
      'மதிய உணவு திட்டத்தின் மூலம் ஏழைகளுக்கு கல்வியை அணுகக்கூடியதாக மாற்றுவதில் முக்கிய பங்காற்றினார்.',
    ],
    achievements: [
      'Chief Minister of Tamil Nadu (1954-1963)',
      'Introduced free education and mid-day meal scheme',
      'President of Indian National Congress (1963-1967)',
      'Known as the Kingmaker of Indian politics',
      'Awarded Bharat Ratna posthumously (1976)',
    ],
    tamilAchievements: [
      'தமிழ்நாடு முதலமைச்சர் (1954-1963)',
      'இலவச கல்வி மற்றும் மதிய உணவு திட்டத்தை அறிமுகப்படுத்தினார்',
      'இந்திய தேசிய காங்கிரஸ் தலைவர் (1963-1967)',
      'இந்திய அரசியலின் கிங்மேக்கர் என்று அறியப்படுகிறார்',
      'மரணத்திற்குப் பின் பாரத ரத்னா விருது (1976)',
    ],
    quotes: [
      { text: 'Education is the birthright of every child.', tamilText: 'கல்வி ஒவ்வொரு குழந்தையின் பிறப்புரிமை.' },
      { text: 'Service to the people is service to God.', tamilText: 'மக்கள் சேவையே மகேசன் சேவை.' },
    ],
  },
};

const LeaderHistory: React.FC = () => {
  const { leaderId } = useParams<{ leaderId: string }>();
  const leader = leaderId ? leadersData[leaderId] : null;

  if (!leader) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Leader not found</h1>
          <Link to="/">
            <Button className="mt-4">Go Back Home</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="bg-gradient-to-b from-tvk-maroon to-tvk-maroon/90 text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <Link to="/#leadership">
              <Button variant="ghost" className="text-primary-foreground/80 mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leaders
              </Button>
            </Link>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="text-8xl">{leader.image}</div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{leader.tamilName}</h1>
                <h2 className="text-xl md:text-2xl mb-2">{leader.name}</h2>
                <p className="text-tvk-yellow font-semibold">{leader.tamilTitle}</p>
                <p className="text-primary-foreground/80">{leader.title}</p>
                <div className="flex items-center gap-2 mt-4 text-primary-foreground/70">
                  <Calendar className="w-4 h-4" />
                  <span>{leader.period}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bio */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <h3 className="text-2xl font-bold mb-6">வாழ்க்கை வரலாறு / Biography</h3>
            <div className="space-y-4">
              {leader.tamilFullBio.map((para, i) => (
                <p key={i} className="text-foreground">{para}</p>
              ))}
              <div className="border-t pt-4 mt-4">
                {leader.fullBio.map((para, i) => (
                  <p key={i} className="text-muted-foreground text-sm mt-2">{para}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section className="py-12 bg-tvk-cream">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-6 h-6 text-tvk-maroon" />
              <h3 className="text-2xl font-bold">சாதனைகள் / Achievements</h3>
            </div>
            <ul className="space-y-3">
              {leader.tamilAchievements.map((achievement, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-tvk-maroon mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-foreground font-medium">{achievement}</p>
                    <p className="text-sm text-muted-foreground">{leader.achievements[i]}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Quotes */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center gap-2 mb-6">
              <Quote className="w-6 h-6 text-tvk-maroon" />
              <h3 className="text-2xl font-bold">மேற்கோள்கள் / Quotes</h3>
            </div>
            <div className="space-y-6">
              {leader.quotes.map((quote, i) => (
                <blockquote key={i} className="border-l-4 border-tvk-yellow pl-4 py-2">
                  <p className="text-lg text-foreground font-medium italic">"{quote.tamilText}"</p>
                  <p className="text-sm text-muted-foreground mt-1">"{quote.text}"</p>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LeaderHistory;
