/*
 * VOLVE launch invitations: the one file to edit.
 *
 * Every date, time, address and link used by both invitations,
 * the calendar files, the static cards and the WhatsApp previews comes from here.
 * Fields marked CONFIRM are not yet confirmed and are listed in OPEN_ITEMS.md.
 */
window.VOLVE_CONFIG = {
  // Public address the pages will live at, with no trailing slash, e.g. "https://invite.myvolve.com".
  // CONFIRM: leave empty until publishing is approved. While empty, pages share their own address.
  baseUrl: "https://invite.myvolve.com", // approved 31 Oct 2026; hosted on GitHub Pages

  brand: {
    name: "VOLVE",
    pillars: ["Arts", "Movement", "Community", "Transformation"],
    email: "booking@myvolve.com",
    website: "https://www.myvolve.com",
  },

  venue: {
    name: "VOLVE",
    lines: ["126, Aram Nagar Part 2, JP Road,", "Versova, Andheri West, Mumbai 400061"],
    singleLine: "VOLVE, 126 Aram Nagar Part 2, JP Road, Versova, Andheri West, Mumbai 400061",
    // The studio's own Google Maps pin (place "VOLVE", 19.1334987, 72.8142631), supplied 31 Oct 2026.
    // Checked: the link resolves to the Versova studio, not the registered office in Powai.
    mapsUrl: "https://maps.app.goo.gl/Mk4wmQ7941QApeSA9",
    geo: { lat: 19.1334987, lng: 72.8142631 },
    // Same place, as Google's embeddable map. Loaded only when a guest taps "Show map", to keep the page light.
    embedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3769.410536772503!2d72.81426309999999!3d19.133498699999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7b794dbd78ba3%3A0x765c8bca7d711b6!2sVOLVE!5e0!3m2!1sen!2sin!4v1793424837038!5m2!1sen!2sin",
  },

  timezone: "Asia/Kolkata",
  utcOffset: "+05:30",

  // Who signs the invitation.
  hostLine: "With love, the VOLVE family",

  events: {
    pooja: {
      id: "pooja",
      path: "/pooja/",
      title: "VOLVE Launch Pooja",
      shortTitle: "Launch Pooja",
      date: "2026-11-06", // confirmed 31 Oct 2026
      dateConfirmed: true, // confirmed by the MD, 31 Oct 2026
      start: "11:00",
      end: null, // no end time, by decision (31 Oct 2026): calendar entries carry the start time only
      calendarDescription:
        "The Launch Pooja of VOLVE. We gather to seek blessings for the studio and for everyone who will learn, move, create and connect here.",
      preview: {
        title: "You're invited · VOLVE Launch Pooja",
        description: "Join us at 11:00 AM on Friday, 6 November 2026 as we seek blessings for VOLVE, Versova.",
        image: "/assets/og/og-pooja.jpg",
      },
      staticCard: "/assets/cards/VOLVE_Launch-Pooja_Invitation.jpg",
      ics: "/assets/calendar/volve-launch-pooja.ics",
    },
    evening: {
      id: "evening",
      path: "/evening/",
      title: "VOLVE Evening Launch",
      shortTitle: "Evening Launch",
      date: "2026-11-06",
      dateConfirmed: true, // confirmed by the MD, 31 Oct 2026
      start: "18:00",
      end: null,
      calendarDescription:
        "The Evening Launch of VOLVE: the first evening of a new home for arts, movement, community and transformation.",
      preview: {
        title: "You're invited · The VOLVE Evening Launch",
        description: "6:00 PM, Friday, 6 November 2026. The first evening of VOLVE, Versova. Come and be part of it.",
        image: "/assets/og/og-evening.jpg",
      },
      staticCard: "/assets/cards/VOLVE_Evening-Launch_Invitation.jpg",
      ics: "/assets/calendar/volve-evening-launch.ics",
    },
  },

  // Optional background music, generated in the browser (no recordings, nothing to license).
  // It is on by default and starts with the guest's first tap (browsers block sound before that);
  // the speaker button turns it off. Set soundStartsOn: false to make it opt-in instead. Options are in shared/music.js:
  //   pooja:   "pooja-bhairav" (morning alaap) · "pooja-bilawal" (bright beginning) · "pooja-bells" (tanpura and temple bells)
  //   evening: "evening-rising" · "evening-constellation" · "evening-pulse" (heartbeat) · "evening-yaman" (evening raga)
  // Set sound: false to remove the sound button entirely.
  sound: { pooja: "pooja-bilawal", evening: "evening-pulse" }, // chosen 31 Oct 2026
  soundStartsOn: true, // decided 31 Oct 2026
};
