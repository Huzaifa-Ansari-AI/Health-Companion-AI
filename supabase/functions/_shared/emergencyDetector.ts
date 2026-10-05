// Emergency Detection Module - Shared Edge Function Version
// Mirrors src/lib/emergencyDetector.ts exactly for Deno / Supabase Edge Functions.

export interface EmergencyCheckResult {
  isEmergency: boolean;
  matchedCategory?: string;
  triggerPhrase?: string;
  emergencyAdvice?: string;
}

export const EMERGENCY_DISCLAIMER_MESSAGE =
  "EMERGENCY WARNING: Your reported symptoms indicate a potential medical emergency. Please immediately call 911 (or your local emergency services) or go to the nearest Emergency Department. Do not delay medical attention.";

interface EmergencyCategory {
  name: string;
  patterns: RegExp[];
}

const EMERGENCY_CATEGORIES: EmergencyCategory[] = [
  {
    name: "Chest Pain / Cardiac Crisis",
    patterns: [
      /\bchest\s*(?:pain|pressure|tightness|heaviness|squeezing|crushing)\b/i,
      /\bheart\s*attack\b/i,
      /\bpain\s*radiating\s*to\s*(?:jaw|left\s*arm|shoulder|back)\b/i,
      /\belephant\b.*?\bchest\b/i,
    ],
  },
  {
    name: "Severe Respiratory Distress",
    patterns: [
      /\b(?:can'?t|cannot|unable\s*to|hard\s*to)\s*(?:breathe|catch\s*my\s*breath)\b/i,
      /\b(?:severe\s*)?(?:shortness\s*of\s*breath|difficulty\s*breathing|trouble\s*breathing)\b/i,
      /\bgasping\s*for\s*air\b/i,
      /\bsuffocating\b/i,
      /\bchoking\b/i,
    ],
  },
  {
    name: "Stroke Symptoms (F.A.S.T.)",
    patterns: [
      /\b(?:facial|face)\b.*?\b(?:droop|drooping|drooped|numb|numbness)\b/i,
      /\b(?:slurred|incoherent)\s*speech\b/i,
      /\b(?:arm|leg)\s*(?:weakness|paralysis)\b/i,
      /\bsudden\s*(?:numbness|loss\s*of\s*balance|vision\s*loss)\b/i,
      /\bstroke\b/i,
    ],
  },
  {
    name: "Severe Bleeding / Hemorrhage",
    patterns: [
      /\b(?:severe|uncontrolled|heavy|profuse)\s*bleeding\b/i,
      /\bvomiting\s*(?:blood|coffee\s*ground)\b/i,
      /\bcoughing\s*up\s*blood\b/i,
      /\bbleeding\s*won'?t\s*stop\b/i,
    ],
  },
  {
    name: "Loss of Consciousness / Syncope",
    patterns: [
      /\b(?:passed\s*out|fainted|loss\s*of\s*consciousness|blacked\s*out|collapsed)\b/i,
      /\bunresponsive\b/i,
    ],
  },
  {
    name: "Sudden Thunderclap Headache",
    patterns: [
      /\bworst\s*headache\s*(?:of\s*my\s*life|ever)\b/i,
      /\bthunderclap\s*headache\b/i,
      /\bsudden\s*(?:severe|explosive)\s*headache\b/i,
    ],
  },
  {
    name: "Crisis / Self-Harm / Overdose",
    patterns: [
      /\b(?:suicide|suicidal|kill\s*myself|want\s*to\s*die|end\s*my\s*life|take\s*my\s*life)\b/i,
      /\b(?:overdose|overdosed|swallowed\s*(?:a\s*bottle|toxic|bleach|pills))\b/i,
      /\bself\s*harm\b/i,
    ],
  },
  {
    name: "Severe Allergic Reaction (Anaphylaxis)",
    patterns: [
      /\b(?:anaphylaxis|anaphylactic)\b/i,
      /\b(?:throat|tongue|lips)\b.*?\b(?:closing|closed|swell(?:ing|ed|s)?|swollen|tight(?:en|ening|ness)?)\b/i,
      /\bcannot\s*swallow\s*(?:or\s*breathe)?\b/i,
    ],
  },
];

const NEGATION_PREFIX_REGEX = /\b(?:no|not|neither|nor|without|never|haven'?t|don'?t|denies|ruled\s*out|zero)\s+(?:\w+\s+){0,3}/i;

function isMatchNegated(fullText: string, matchIndex: number): boolean {
  const startOffset = Math.max(0, matchIndex - 35);
  const precedingSlice = fullText.substring(startOffset, matchIndex);
  
  const match = precedingSlice.match(NEGATION_PREFIX_REGEX);
  if (!match) return false;

  const clauseBreakerIndex = Math.max(
    precedingSlice.lastIndexOf("but"),
    precedingSlice.lastIndexOf("however"),
    precedingSlice.lastIndexOf("although"),
    precedingSlice.lastIndexOf("except"),
    precedingSlice.lastIndexOf(",")
  );

  const negationIndex = precedingSlice.lastIndexOf(match[0]);
  if (clauseBreakerIndex > negationIndex) {
    return false;
  }

  return true;
}

export function detectEmergency(text: string): EmergencyCheckResult {
  if (!text || typeof text !== "string") {
    return { isEmergency: false };
  }

  const cleanText = text.trim();
  if (cleanText.length === 0) {
    return { isEmergency: false };
  }

  for (const category of EMERGENCY_CATEGORIES) {
    for (const pattern of category.patterns) {
      const match = pattern.exec(cleanText);
      if (match) {
        const negated = isMatchNegated(cleanText, match.index);
        if (!negated) {
          return {
            isEmergency: true,
            matchedCategory: category.name,
            triggerPhrase: match[0],
            emergencyAdvice: EMERGENCY_DISCLAIMER_MESSAGE,
          };
        }
      }
    }
  }

  return { isEmergency: false };
}
