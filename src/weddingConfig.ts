/**
 * Royal Hindu Wedding E-Invitation Configuration Object
 * Easily customize any aspect of the wedding invitation here!
 */

export interface WeddingEvent {
  id: string;
  name: string;
  hindiName?: string;
  date: string; // e.g. "Tuesday, 24th November 2026"
  time: string; // e.g. "8:00 PM onwards"
  venueName: string;
  venueAddress: string;
  mapEmbedUrl: string; // Google Maps Iframe Embed URL
  mapDirectionsUrl: string; // Google Maps Search/Directions URL
  imageUrl: string; // Representative image
  accentColor: string;
}

export interface WeddingConfig {
  heroImageUrl: string;
  bride: {
    name: string;
    fatherName: string;
    motherName: string;
    imageUrl: string;
    bio: string;
  };
  groom: {
    name: string;
    fatherName: string;
    motherName: string;
    imageUrl: string;
    bio: string;
  };
  weddingDate: string; // For countdown (ISO format: YYYY-MM-DDTHH:mm:ss)
  displayDate: string; // Human readable e.g., "Wednesday, 25th November 2026"
  hashtag: string; // e.g. #NamanWedsNishi
  musicUrl: string; // Audio URL (Shehnai / Sitar instrumental)
  youtubeEmbedUrl: string; // YouTube video embed link
  envelopeIconUrl?: string; // Optional custom envelope icon
  thankYouImageUrl?: string; // Optional custom thank you portrait
  heroTagline: string;
  gallerySubtitle: string;
  showGallery?: boolean; // Control visibility of photo gallery section
  showRsvp?: boolean; // Control visibility of RSVP section on website (default false)
  galleryImages: {
    url: string;
    caption: string;
  }[];
  events: WeddingEvent[];
  socialLinks: {
    facebook: string;
    instagram: string;
  };
  familyDetails: {
    message: string;
    welcomingText: string;
    names: string[];
  };
  welcomeMessage: {
    title: string;
    subtitle: string;
    text: string;
  };
}

export const weddingConfig: WeddingConfig = {
  heroImageUrl: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=100&w=3840&auto=format&fit=crop",
  bride: {
    name: "Nishi Agrawal",
    fatherName: "Mr Sharad Agrawal",
    motherName: "Mrs Kavita Agrawal",
    imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop",
    bio: "Graceful, compassionate, and full of life, Nishi illuminates every room with her radiant smile and kind heart. She is the cherished daughter of the Agrawal family."
  },
  groom: {
    name: "Naman Agrawal",
    fatherName: "S/O Late shri Rajesh Agrawal ji",
    motherName: "Mrs Mamta Agrawal Ji",
    imageUrl: "https://images.unsplash.com/photo-1594191632832-7da2260682fa?q=80&w=800&auto=format&fit=crop",
    bio: "A warm-hearted, visionary soul with deep respect for family values, Naman brings warmth, intelligence, and joy to every moment. He is the beloved son of the Agrawal family."
  },
  weddingDate: "2026-11-25T14:00:00", // 25th November 2026, 2:00 PM onwards
  displayDate: "Wednesday, 25th November 2026",
  hashtag: "#NamanWedsNishi",
  heroTagline: "We Are Getting Married",
  // Royal Indian wedding shehnai & instrumental melody
  musicUrl: "https://videotourl.com/audio/1793027155947-97c816cd-e025-4fd7-bc2f-8455c6260135.mp3",
  youtubeEmbedUrl: "https://www.youtube.com/embed/N4YdD_19F0Y",
  envelopeIconUrl: "/ganesha.png",
  thankYouImageUrl: "",
  showGallery: true,
  showRsvp: false,
  gallerySubtitle: "Glimpses of Our Journey",
  galleryImages: [
    {
      url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800",
      caption: "Eternal Togetherness"
    },
    {
      url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800",
      caption: "Hand in Hand"
    },
    {
      url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800",
      caption: "Celebrations of Joy"
    },
    {
      url: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800",
      caption: "The Sacred Mandap"
    }
  ],
  events: [
    {
      id: "sangeet-ring-ceremony",
      name: "Sangeet & Ring ceremony",
      hindiName: "॥ संगीत एवं मुद्रिका रस्म ॥",
      date: "Tuesday, 24th November 2026",
      time: "8:00 PM onwards",
      venueName: "Shanvi Landmark Panna",
      venueAddress: "Shanvi Landmark, Panna, Madhya Pradesh",
      mapEmbedUrl: "https://maps.google.com/maps?q=Shanvi+Landmark+Panna&t=&z=13&ie=UTF8&iwloc=&output=embed",
      mapDirectionsUrl: "https://maps.google.com/?q=Shanvi+Landmark+Panna",
      imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800",
      accentColor: "from-indigo-800 to-purple-950"
    },
    {
      id: "carnival-party",
      name: "Carnival Party",
      hindiName: "॥ कार्निवल उत्सव ॥",
      date: "Wednesday, 25th November 2026",
      time: "7:00 AM onwards",
      venueName: "Hotel Shanvi Landmark Panna",
      venueAddress: "Hotel Shanvi Landmark, Panna, Madhya Pradesh",
      mapEmbedUrl: "https://maps.google.com/maps?q=Hotel+Shanvi+Landmark+Panna&t=&z=13&ie=UTF8&iwloc=&output=embed",
      mapDirectionsUrl: "https://maps.google.com/?q=Hotel+Shanvi+Landmark+Panna",
      imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800",
      accentColor: "from-cyan-800 to-sky-950"
    },
    {
      id: "wedding-ceremony",
      name: "Wedding Ceremony",
      hindiName: "॥ शुभ विवाह (फेरे) ॥",
      date: "Wednesday, 25th November 2026",
      time: "2:00 PM onwards",
      venueName: "Hotel Shanvi Landmark",
      venueAddress: "Hotel Shanvi Landmark Panna, Madhya Pradesh",
      mapEmbedUrl: "https://maps.google.com/maps?q=Hotel+Shanvi+Landmark+Panna&t=&z=13&ie=UTF8&iwloc=&output=embed",
      mapDirectionsUrl: "https://maps.google.com/?q=Hotel+Shanvi+Landmark+Panna",
      imageUrl: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=800",
      accentColor: "from-royal-red-800 to-royal-red-950"
    },
    {
      id: "haldi-mehndi-ceremony",
      name: "Haldi , Mehndi Ceremony",
      hindiName: "॥ हल्दी एवं मेहँदी रस्म ॥",
      date: "Friday, 23rd October 2026",
      time: "12:00 PM onwards",
      venueName: "Hotel Mohan Raj Vilas Panna",
      venueAddress: "Hotel Mohan Raj Vilas, Panna, Madhya Pradesh",
      mapEmbedUrl: "https://maps.google.com/maps?q=Hotel+Mohan+Raj+Vilas+Panna&t=&z=13&ie=UTF8&iwloc=&output=embed",
      mapDirectionsUrl: "https://maps.google.com/?q=Hotel+Mohan+Raj+Vilas+Panna",
      imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800",
      accentColor: "from-amber-600 to-yellow-900"
    }
  ],
  socialLinks: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com"
  },
  familyDetails: {
    message: "With the divine blessings of Lord Ganesha and our revered ancestors, we cordially invite you and your family to grace the auspicious wedding ceremony of Naman & Nishi and bestow your hearty blessings upon the newlyweds.",
    welcomingText: "Warmly Welcomed By:",
    names: [
      "Agrawal Family (Panna)",
      "Agrawal Family",
      "All Relatives and Friends"
    ]
  },
  welcomeMessage: {
    title: "Two Hearts, One Journey",
    subtitle: "We invite you to celebrate our love",
    text: "Because you have played a very special role in our lives, we would love for you to join us as we embark on this beautiful adventure of marriage. Together with our families, we invite you to share our joy, laughter, and sacred vows."
  }
};
