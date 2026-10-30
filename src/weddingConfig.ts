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
    imageUrl: "https://cdn.phototourl.com/member/2026-10-29-1755b09b-2d53-4486-9894-363532543d65.jpg",
    bio: "Graceful, compassionate, and full of life, Nishi illuminates every room with her radiant smile and kind heart. She is the cherished daughter of the Agrawal family."
  },
  groom: {
    name: "Naman Agrawal",
    fatherName: "S/O Late shri Rajesh Agrawal ji",
    motherName: "Mrs Mamta Agrawal Ji",
    imageUrl: "https://cdn.phototourl.com/member/2026-10-29-5ef996e2-9ec8-46d9-b624-c18181841df0.jpg",
    bio: "A warm-hearted, visionary soul with deep respect for family values, Naman brings warmth, intelligence, and joy to every moment. He is the beloved son of the Agrawal family."
  },
  weddingDate: "2026-11-25T14:00:00",
  displayDate: "Wednesday, 25th November 2026",
  hashtag: "#nishman",
  heroTagline: "We Are Getting Married",
  musicUrl: "https://videotourl.com/audio/1793027155947-97c816cd-e025-4fd7-bc2f-8455c6260135.mp3",
  youtubeEmbedUrl: "",
  envelopeIconUrl: "/ganesha.png",
  thankYouImageUrl: "https://cdn.phototourl.com/member/2026-10-26-ef4e3f7c-de06-41d3-aca5-caecb158e6af.jpg",
  showGallery: true,
  showRsvp: false,
  gallerySubtitle: "Glimpses of Our Journey",
  galleryImages: [
    {
      caption: "Eternal Togetherness ✨",
      url: "https://cdn.phototourl.com/member/2026-10-26-82602818-68b6-4fb8-96e7-65bc49d41457.jpg"
    },
    {
      caption: "Hand in Hand 💖",
      url: "https://cdn.phototourl.com/member/2026-10-26-2893966d-4aa2-4fb8-8c4b-031dd9021bc7.jpg"
    },
    {
      url: "https://cdn.phototourl.com/member/2026-10-26-08304c70-512e-41e2-bcb3-a012c71fc0fe.jpg",
      caption: "Celebrations of Joy ✨"
    },
    {
      url: "https://cdn.phototourl.com/member/2026-10-26-15991930-45ca-430a-a499-1e950620ae7a.jpg",
      caption: "The Sacred Mandap 😍"
    },
    {
      url: "https://cdn.phototourl.com/member/2026-10-26-cb999368-a102-4f39-b409-bdb40d6c51b6.jpg",
      caption: "👰Love birds 🤵"
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
      mapEmbedUrl: "",
      mapDirectionsUrl: "https://maps.google.com/?q=Shanvi+Landmark+Panna",
      imageUrl: "https://cdn.phototourl.com/member/2026-10-26-8568f815-889a-4dba-9b80-4691c9cfbfa0.png",
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
      mapEmbedUrl: "",
      mapDirectionsUrl: "https://maps.google.com/?q=Hotel+Shanvi+Landmark+Panna",
      imageUrl: "https://cdn.phototourl.com/member/2026-10-26-93a2954a-2b3d-4384-ad23-52dfaa055640.png",
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
      mapEmbedUrl: "",
      mapDirectionsUrl: "https://maps.google.com/?q=Hotel+Shanvi+Landmark+Panna",
      imageUrl: "https://cdn.phototourl.com/member/2026-10-26-39ad2849-6ae9-4257-807a-7fed513ba64a.png",
      accentColor: "from-royal-red-800 to-royal-red-950"
    },
    {
      id: "haldi-mehndi-ceremony",
      name: "Nishi ki Haldi & Mehndi Ceremony",
      hindiName: "॥ हल्दी एवं मेहँदी रस्म ॥",
      date: "Friday, 23rd October 2026",
      time: "12:00 PM onwards",
      venueName: "Hotel Mohan Raj Vilas Panna",
      venueAddress: "Hotel Mohan Raj Vilas, Panna, Madhya Pradesh",
      mapEmbedUrl: "",
      mapDirectionsUrl: "https://maps.google.com/?q=Hotel+Mohan+Raj+Vilas+Panna",
      imageUrl: "https://cdn.phototourl.com/member/2026-10-26-ab69b998-6000-4096-91f1-9a6782c24f26.png",
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
