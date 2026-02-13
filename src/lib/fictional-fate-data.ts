export type ArchetypeKey =
  | "obsidian"
  | "radiant"
  | "blueprint"
  | "kinetic"
  | "sentimental";

export type Weights = Partial<Record<ArchetypeKey, number>>;

export type Question = {
  id: string;
  prompt: string;
  left: {
    label: string;
    imageUrl: string;
    judge: string;
    weights: Weights;
  };
  right: {
    label: string;
    imageUrl: string;
    judge: string;
    weights: Weights;
  };
};

export type CoupleMatch = {
  id: string;
  archetypeKey: ArchetypeKey;
  coupleName: string;
  from: string;
  compatibilityTagline: string;
  whyYouMatch: string;
  imageUrl: string;
};

export const ARCHETYPE_LABEL: Record<ArchetypeKey, string> = {
  obsidian: "Obsidian Introvert",
  radiant: "Radiant Companion",
  blueprint: "Blueprint Architect",
  kinetic: "Kinetic Maverick",
  sentimental: "Sentimental Sincerist",
};

export const QUESTIONS: Question[] = [
  {
    id: "wyd-text",
    prompt: "It’s 1:13 AM. You get a “wyd 👀” text.",
    left: {
      label: "Read. Lock. Sleep.",
      imageUrl: "/img/cozy.webp",
      judge: "Silent mode is a personality and you’re committed. Respect.",
      weights: { obsidian: 3, blueprint: 1, sentimental: 1 },
    },
    right: {
      label: "Meme + a plan",
      imageUrl: "/img/party.jfif",
      judge: "Flirting via memes is a love language. You’re dangerous.",
      weights: { radiant: 2, kinetic: 3 },
    },
  },
  {
    id: "first-date",
    prompt: "First date scene is…",
    left: {
      label: "Bookstore + pastry",
      imageUrl: "/img/cafe.jpeg",
      judge: "A little romance, a little quiet, a little main character. Nice.",
      weights: { sentimental: 2, obsidian: 1, blueprint: 1 },
    },
    right: {
      label: "Arcade + chaos",
      imageUrl: "/img/arcade.jfif",
      judge: "You flirt like it’s a boss fight. Iconic behavior.",
      weights: { kinetic: 3, radiant: 1 },
    },
  },
  {
    id: "conflict",
    prompt: "They say “we need to talk.” You…",
    left: {
      label: "Ask for time + notes",
      imageUrl: "/img/coversation.jpg",
      judge: "You’re drafting a peace treaty. Negotiation king/queen.",
      weights: { blueprint: 3, obsidian: 2 },
    },
    right: {
      label: "Call now. Feelings now.",
      imageUrl: "/img/hugging.jpg",
      judge: "Direct communication? In this timeline? Green flag.",
      weights: { radiant: 2, sentimental: 2, blueprint: 1 },
    },
  },
  {
    id: "affection",
    prompt: "You show love by…",
    left: {
      label: "Fixing tiny problems",
      imageUrl: "/img/planner.webp",
      judge: "You say ‘I love you’ by making life easier. Quietly lethal.",
      weights: { obsidian: 3, blueprint: 1 },
    },
    right: {
      label: "Hype. Loudly. Publicly.",
      imageUrl: "/img/party.jfif",
      judge: "Emotional support human detected. Please never log off.",
      weights: { radiant: 3, sentimental: 1 },
    },
  },
  {
    id: "future-talk",
    prompt: "Vacation planning: you are the…",
    left: {
      label: "Vibes-only navigator",
      imageUrl: "/img/roadtrip.jpg",
      judge: "You don’t make plans. You make lore.",
      weights: { kinetic: 3, radiant: 1, obsidian: 1 },
    },
    right: {
      label: "Google Sheets warlord",
      imageUrl: "/img/planner.webp",
      judge: "You future-proof like it’s a competitive sport. Terrifying. Hot.",
      weights: { blueprint: 4, sentimental: 1 },
    },
  },
];

export const COUPLES_DATA: CoupleMatch[] = [
  {
    id: "blueprint-carmy-sydney",
    archetypeKey: "blueprint",
    coupleName: "Carmy & Sydney",
    from: "The Bear",
    compatibilityTagline: "The Future-Proof Power Team",
    whyYouMatch:
      "You build love like a system: clear goals, steady effort, and honest check-ins. Together, you thrive when the plan is real and the feelings are handled like adults.",
    imageUrl: "/img/couples/Carmy%20%26%20Sydney.avif",
  },
  {
    id: "obsidian-wednesday-enid",
    archetypeKey: "obsidian",
    coupleName: "Wednesday & Enid",
    from: "Wednesday",
    compatibilityTagline: "Monochrome Meets Sunshine",
    whyYouMatch:
      "Your calm, selective vibe pairs best with someone who can soften the edges without pushing your boundaries. You love deeply—just quietly.",
    imageUrl: "/img/couples/Wednesday%20%26%20Enid.avif",
  },
  {
    id: "radiant-david-patrick",
    archetypeKey: "radiant",
    coupleName: "David & Patrick",
    from: "Schitt’s Creek",
    compatibilityTagline: "The Safe-Place Duo",
    whyYouMatch:
      "You show up with warmth, hype, and real support. Your best match is someone who trusts your optimism—and meets it with consistent love.",
    imageUrl: "/img/couples/David%20%26%20Patrick.avif",
  },
  {
    id: "sentimental-jim-pam",
    archetypeKey: "sentimental",
    coupleName: "Jim & Pam",
    from: "The Office",
    compatibilityTagline: "The Micromance Blueprint",
    whyYouMatch:
      "You don’t need grand gestures to feel chosen. You fall for the tiny, daily ‘I saw this and thought of you’ moments that make love feel safe.",
    imageUrl: "/img/couples/Jim%20%26%20Pam.webp",
  },
  {
    id: "kinetic-kate-yelena",
    archetypeKey: "kinetic",
    coupleName: "Kate Bishop & Yelena Belova",
    from: "Marvel",
    compatibilityTagline: "The Chaotic Catalyst",
    whyYouMatch:
      "You bond through banter, momentum, and bold energy. Your best match can keep up, laugh it off, and still choose you when the dust settles.",
    imageUrl: "/img/couples/Kate%20Bishop%20%26%20Yelena%20Belova.webp",
  },
  {
    id: "blueprint-eleven-mike",
    archetypeKey: "blueprint",
    coupleName: "Eleven & Mike",
    from: "Stranger Things",
    compatibilityTagline: "The Promise Keepers",
    whyYouMatch:
      "You value loyalty that lasts and love that’s consistent. When things get weird, you don’t disappear—you stay and build stability.",
    imageUrl: "/img/couples/eleven-and-mike.avif",
  },
  {
    id: "obsidian-anthony-kate",
    archetypeKey: "obsidian",
    coupleName: "Anthony Bridgerton & Kate Sharma",
    from: "Bridgerton",
    compatibilityTagline: "The Slow-Burn Stoic",
    whyYouMatch:
      "You trust slowly, then love fiercely. Your ideal match respects your space, earns your loyalty, and builds a private world with you.",
    imageUrl: "/img/couples/Anthony%20Bridgerton%20%26%20Kate%20Sharma.jpeg",
  },
  {
    id: "sentimental-katniss-peeta",
    archetypeKey: "sentimental",
    coupleName: "Katniss & Peeta",
    from: "The Hunger Games",
    compatibilityTagline: "The Dandelion Effect",
    whyYouMatch:
      "You heal through gentleness, not pressure. Your best match brings steady warmth and shows love through tiny moments that add up.",
    imageUrl: "/img/couples/Katniss%20%26%20Peeta.webp",
  },
  {
    id: "radiant-peter-mj",
    archetypeKey: "radiant",
    coupleName: "Peter Parker & MJ",
    from: "Spider-Man (MCU)",
    compatibilityTagline: "Goofy, Loyal, Unbreakable",
    whyYouMatch:
      "You’re playful and supportive, but not shallow—you want a partner who laughs with you and still shows up when it matters.",
    imageUrl: "/img/couples/Peter%20Parker%20%26%20MJ.webp",
  },
  {
    id: "kinetic-april-andy",
    archetypeKey: "kinetic",
    coupleName: "April & Andy",
    from: "Parks and Recreation",
    compatibilityTagline: "Weirdly Perfect",
    whyYouMatch:
      "You don’t do boring. Your best match celebrates the chaos, chooses you daily, and keeps life feeling like a fun side quest.",
    imageUrl: "/img/couples/April%20%26%20Andy.webp",
  },
];
