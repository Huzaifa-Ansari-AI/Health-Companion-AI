// Emergency Detection Module - Mandatory Medical Safety Layer
// Pure function, zero external dependencies. Usable across Client, Edge Functions, and Tests.
// Evaluates inputs for life-threatening medical emergencies with rule-based red flag detection.

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

// Negation prefix regex: matches phrases indicating negation within 1-3 words before a term
const NEGATION_PREFIX_REGEX = /\b(?:no|not|neither|nor|without|never|haven'?t|don'?t|denies|ruled\s*out|zero)\s+(?:\w+\s+){0,3}/i;

/**
 * Checks if a specific match in a text is preceded by a direct negation.
 * Example: "no chest pain" -> negated
 * But: "no nausea, but severe chest pain" -> "chest pain" is NOT negated.
 */
function isMatchNegated(fullText: string, matchIndex: number): boolean {
  // Look at text slice up to 35 characters immediately preceding the match
  const startOffset = Math.max(0, matchIndex - 35);
  const precedingSlice = fullText.substring(startOffset, matchIndex);
  
  // If the preceding slice contains a negation prefix right before the match
  const match = precedingSlice.match(NEGATION_PREFIX_REGEX);
  if (!match) return false;

  // If there is a clause breaker like "but", "however", "although" between negation and match, it's NOT negated
  const clauseBreakerIndex = Math.max(
    precedingSlice.lastIndexOf("but"),
    precedingSlice.lastIndexOf("however"),
    precedingSlice.lastIndexOf("although"),
    precedingSlice.lastIndexOf("except"),
    precedingSlice.lastIndexOf(",")
  );

  const negationIndex = precedingSlice.lastIndexOf(match[0]);
  if (clauseBreakerIndex > negationIndex) {
    return false; // Negation was in an earlier clause
  }

  return true;
}

/**
 * Evaluates user input text for life-threatening emergency medical signals.
 * Deterministic, fast, and conservative (when in doubt, prioritizes patient safety).
 */
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
        // Verify whether this specific pattern occurrence was negated
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
