/* =====================================================================
   site.ts — THE ONE FILE TO EDIT.
   ---------------------------------------------------------------------
   Almost everything you see on the website (your name, the wording,
   your jobs, your skills, your links, which photo shows where) is set
   right here. Change the text between the "quotes", save, and the site
   updates. You do NOT need to touch any other file for normal edits.

   To swap a photo: put the new image in  public/images/  and update the
   matching "image:" path below (keep the leading slash, e.g. /images/x.jpg).
   ===================================================================== */

/** Your name, contact details, and the headline shown at the top. */
export const identity = {
  name: "Francisco Cardenas",
  initials: "FC", // the little monogram in the top-left corner
  /** Shown in the hero line: "<title> at City Tech, Brooklyn". */
  title: "Civil Engineering & Construction Management",
  /** The short phrase after the dash in the hero line. Keep it punchy. */
  tagline: "building toward estimating & project controls",
  location: "Brooklyn, New York",
  school: "NYC College of Technology — CUNY (City Tech)",
  /** Small status line under the hero. */
  status: "Expected May 2027 · Open to internships & co-ops",
  linkedin: "https://www.linkedin.com/in/francisco-cardenas-58a6b32b1",
  email: "franciscocardenasj1@gmail.com",
};

/* ---------------------------------------------------------------------
   The drawing block in the bottom-right corner (like a real blueprint
   title block). Cosmetic — tweak the labels if you like.
   --------------------------------------------------------------------- */
export const titleBlock = {
  sheet: "A-00 · Cover",
  discipline: "Civil / Construction",
};

/* ---------------------------------------------------------------------
   Captions printed under the photos. The "key" (jobsite/asce/careerfair)
   must match the image keys used in the sections below.
   --------------------------------------------------------------------- */
export const photoCaptions: Record<string, string> = {
  jobsite: "On site — Haugland Group project",
  asce: "ASCE student chapter",
  careerfair: "Industry career fair",
};

/* ---------------------------------------------------------------------
   The photo files. Drop new images into public/images and point here.
   --------------------------------------------------------------------- */
export const photos: Record<string, string> = {
  jobsite: "/images/jobsite.jpg",
  asce: "/images/asce.jpg",
  careerfair: "/images/careerfair.jpg",
};

/* =====================================================================
   SECTIONS ("stations") — read left to right on the drawing sheet.
   Each one becomes a numbered callout card and a tab along the bottom.
   You can reorder them, edit the text, or add/remove facts freely.
   ===================================================================== */
export type Station = {
  id: string;
  num: string; // the big number on the card, e.g. "01"
  tab: string; // short label in the bottom nav
  title: string; // headline shown on the card and in the slide-out panel
  kicker: string; // tiny label, e.g. "A / WHO"
  body: string; // the main paragraph
  facts?: [string, string][]; // label + value rows
  roles?: { role: string; org: string; date: string; note: string }[];
  software?: [string, string][]; // tool name + what you use it for (shows bars)
  learning?: string[]; // extra skills shown as little tags
  photos?: string[]; // image keys from "photos" above
  links?: [label: string, value: string, kind: "linkedin" | "email" | "resume"][];
};

export const stations: Station[] = [
  {
    id: "about",
    num: "01",
    tab: "About",
    title: "The brief",
    kicker: "A / WHO",
    body:
      "I'm a Civil Engineering and Construction Management student at City Tech in " +
      "Brooklyn, drawn to the part of the job where the drawing meets the dirt — " +
      "estimating, site safety, and field coordination. I like the math behind a bid " +
      "as much as I like being on site when it gets built.",
    facts: [
      ["Focus", "Estimating · Site safety · Field coordination"],
      ["Based", "Brooklyn, NY"],
      ["Status", "Open to internships & co-ops"],
    ],
  },
  {
    id: "education",
    num: "02",
    tab: "Education",
    title: "City Tech",
    kicker: "B / SCHOOL",
    body:
      "New York City College of Technology (CUNY) — pursuing a B.S. in Civil " +
      "Engineering and an A.A.S. in Construction Management. Coursework across " +
      "structures, materials, surveying, estimating, and construction documents.",
    facts: [
      ["Degrees", "B.S. Civil Engineering · A.A.S. Construction Management"],
      ["Graduating", "Expected May 2027"],
      [
        "Coursework",
        "Construction Drawings I & II · Estimating · Statics · Strength of Materials · Surveying · Building Systems",
      ],
    ],
  },
  {
    id: "experience",
    num: "03",
    tab: "Experience",
    title: "On the job",
    kicker: "C / WORK",
    body:
      "Time in the estimating office and on active construction sites — takeoffs, " +
      "cost, and safety. Here's where I've worked.",
    photos: ["jobsite", "careerfair"],
    roles: [
      {
        role: "Estimator Intern",
        org: "Artheon — New York, NY",
        date: "Jun 2026 – Aug 2026",
        note:
          "Marked up construction drawings in Bluebeam Revu for quantity takeoffs and " +
          "cost estimates; prepared material & labor estimates for bidding and budgeting; " +
          "used AI tools to speed up document review and takeoffs.",
      },
      {
        role: "Site Safety Intern",
        org: "Haugland Group LLC — Brooklyn, NY",
        date: "Jun 2025 – Present",
        note:
          "Support health & safety on an active site — daily briefings, on-site " +
          "evaluations, hazard identification with field supervisors, and documentation " +
          "for internal audits and external inspections.",
      },
      {
        role: "Online Tech Incubator",
        org: "Industry Scholars Program — Queens, NY",
        date: "Apr 2023 – Jun 2023",
        note:
          "Competitive incubator for early-stage startups; designed and launched a " +
          "personal portfolio site and kept a weekly blog tracking project milestones.",
      },
    ],
  },
  {
    id: "skills",
    num: "04",
    tab: "Skills",
    title: "The toolbox",
    kicker: "D / SOFTWARE",
    body:
      "The software I work in today, plus the languages I build with. Point me at a " +
      "new stack and I'll be productive fast.",
    software: [
      ["Bluebeam Revu", "Markups, takeoffs & coordination"],
      ["AutoCAD", "Drafting & construction documents"],
      ["RSMeans", "Cost data & estimating"],
    ],
    learning: [
      "Microsoft Excel",
      "Procore",
      "HTML / CSS",
      "JavaScript",
      "React",
      "Next.js",
      "Git / GitHub",
    ],
    facts: [
      [
        "Certifications",
        "OSHA 10-Hour · OSHA 30-Hour · Scaffold User · Excavator Training · MTA Track Safety",
      ],
      ["Languages", "English · Spanish"],
    ],
  },
  {
    id: "involvement",
    num: "05",
    tab: "Involvement",
    title: "ASCE",
    kicker: "E / COMMUNITY",
    body:
      "Active with the American Society of Civil Engineers student chapter at City " +
      "Tech — mentorship, networking, and giving back.",
    photos: ["asce"],
    facts: [
      ["Member", "ASCE — CUNY City Tech (Jan 2025 – Present)"],
      [
        "Volunteer",
        "Youth spokesperson at the Intrepid Museum, teaching kids about civil engineering & infrastructure",
      ],
    ],
  },
  {
    id: "contact",
    num: "06",
    tab: "Contact",
    title: "Let's talk",
    kicker: "F / REACH ME",
    body:
      "Looking for internships and co-ops in estimating, project controls, or site " +
      "safety. LinkedIn or email is the fastest way to reach me — résumé available on " +
      "request.",
    links: [
      ["LinkedIn", "francisco-cardenas", "linkedin"],
      ["Email", "franciscocardenasj1@gmail.com", "email"],
      ["Résumé", "Available on request", "resume"],
    ],
  },
];

/** Order the sections appear in the one-page Résumé view. */
export const resumeOrder = [
  "about",
  "education",
  "experience",
  "skills",
  "involvement",
  "contact",
];
