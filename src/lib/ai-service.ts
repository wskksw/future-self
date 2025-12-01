import OpenAI from "openai";
import type { FutureSelfCardModel } from "@/generated/prisma/models/FutureSelfCard";

type FutureSelfCard = FutureSelfCardModel;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MASTER_SYSTEM_PROMPT = `You are a reflection support system for Future-Self Card Studio. Your role is to help users explore their identity through journaling and their Future-Self Card.

CRITICAL CONSTRAINTS:
1. Never predict the user's future
2. Never prescribe actions ("you should...")
3. Never diagnose or interpret user's mental state
4. Always cite which card element grounds your response
5. Frame all observations as questions or hypotheses, not truths
6. Preserve ambiguity - not everything needs interpretation

YOUR CAPABILITIES:
- Generate reflection prompts based on card values/goals
- Notice patterns in user's language
- Surface tensions between card and behavior
- Ask questions that help users deepen their thinking

USER AGENCY:
- User interprets their own experience (you scaffold, don't analyze)
- User can dismiss, edit, or ignore any suggestion

TONE:
- Curious, not judgmental
- Tentative, not authoritative ("I notice..." not "You are...")
- Supportive of identity revision (goals can change)`;

type PromptCategory = "VALUE" | "TEMPORAL" | "ANTI_GOAL" | "CONSTRAINT" | "GOAL";

type ConsentedEntry = {
  content: string;
  createdAt: Date;
};

export type GeneratedPrompt = {
  text: string;
  category: PromptCategory;
  cardField: string;
};

export async function generateAIPrompt(params: {
  card: FutureSelfCard;
  recentEntries?: ConsentedEntry[];
  previousPrompts?: string[];
}): Promise<GeneratedPrompt> {
  const { card, recentEntries = [], previousPrompts = [] } = params;

  // Randomly select category
  const categories: PromptCategory[] = ["VALUE", "TEMPORAL", "ANTI_GOAL", "CONSTRAINT", "GOAL"];
  const category = categories[Math.floor(Math.random() * categories.length)];

  let cardElement = "";
  let cardField = "";

  switch (category) {
    case "VALUE":
      if (card.values.length > 0) {
        cardField = card.values[Math.floor(Math.random() * card.values.length)];
        cardElement = `value: "${cardField}"`;
      }
      break;
    case "TEMPORAL":
      cardField = Math.random() > 0.5 ? "sixMonthGoal" : "fiveYearGoal";
      const goalValue = cardField === "sixMonthGoal" ? card.sixMonthGoal : card.fiveYearGoal;
      cardElement = `${cardField === "sixMonthGoal" ? "6-month" : "5-year"} goal: "${goalValue}"`;
      break;
    case "ANTI_GOAL":
      cardElement = `anti-goal: "${card.antiGoals}"`;
      cardField = "antiGoals";
      break;
    case "CONSTRAINT":
      cardElement = `constraint: "${card.constraints}"`;
      cardField = "constraints";
      break;
    case "GOAL":
      cardField = "sixMonthGoal";
      cardElement = `goal: "${card.sixMonthGoal}"`;
      break;
  }

  if (!cardElement) {
    return {
      text: "Your card is still forming. What values or goals feel important to you right now?",
      category,
      cardField: "general",
    };
  }

  const contextInfo = recentEntries.length > 0
    ? `\n\nRECENT JOURNAL PATTERNS:\n${recentEntries.slice(0, 7).map((e) => `- ${e.content.slice(0, 200)}`).join("\n")}`
    : "";

  const previousInfo = previousPrompts.length > 0
    ? `\n\nPREVIOUS PROMPTS TO AVOID:\n${previousPrompts.join("\n")}`
    : "";

  const userMessage = `Generate a 1-2 sentence reflection prompt using this card element:

CARD ELEMENT TO REFERENCE: ${cardElement}
PROMPT CATEGORY: ${category}

REQUIREMENTS:
1. Start with "Your card says '[exact card text]'"
2. Ask open-ended question (no yes/no)
3. Avoid "should" language
4. Max 2 sentences
5. Include explicit citation: "(Based on your ${cardField}: '[text]')"

EXAMPLE:
"Your card says 'creativity' is a core value. What did you create today—even something small? (Based on your value: 'creativity')"
${contextInfo}${previousInfo}

GENERATE PROMPT:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MASTER_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    const promptText = completion.choices[0]?.message?.content?.trim() ||
      `Your card says "${cardField}". How did that show up for you today?`;

    return {
      text: promptText,
      category,
      cardField,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Fallback to template-based prompt
    return {
      text: `Your card says "${cardField}". How did that show up for you today? (Based on your ${category.toLowerCase()}: '${cardField}')`,
      category,
      cardField,
    };
  }
}

export type MarginNoteCategory =
  | "CARD_TENSION"
  | "TEMPORAL_PATTERN"
  | "VALIDATED_CONSTRAINT"
  | "OPEN_QUESTION";

type CardEditSupport = {
  field: "values" | "constraints" | "sixMonthGoal" | "fiveYearGoal" | "antiGoals" | "identityStmt";
  suggestion: string;
  severity?: "low" | "medium" | "high";
  refinedJustification?: string;
};

export type MarginNoteDraft = {
  id: string;
  category: MarginNoteCategory;
  summary: string;
  body: string;
  provenance?: Record<string, unknown>;
  supportsCardEdit?: CardEditSupport;
};

export type InlineQuestionDraft = {
  id: string;
  text: string;
  anchorSentence?: string;
  cardElement?: string | null;
};

type KeywordStat = {
  keyword: string;
  count: number;
  dates: string[];
};

type ConstraintSignal = {
  constraint: string;
  occurrences: number;
  dates: string[];
  origin: "card" | "entry";
};

type ContradictionSignal = {
  label: string;
  sentence: string;
  relatedCardElement?: string;
  historicalDates?: string[];
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "that",
  "with",
  "from",
  "this",
  "have",
  "just",
  "about",
  "been",
  "into",
  "they",
  "them",
  "then",
  "than",
  "because",
  "while",
  "when",
  "what",
  "your",
  "have",
  "were",
  "will",
  "would",
  "could",
  "there",
  "their",
  "even",
  "over",
  "also",
  "some",
  "more",
]);

const CONSTRAINT_KEYWORDS = [
  "fatigue",
  "exhaustion",
  "health",
  "budget",
  "money",
  "financial",
  "childcare",
  "visa",
  "energy",
  "time",
  "caregiving",
  "access",
];

const EMOTION_KEYWORDS = [
  "tired",
  "exhausted",
  "hollow",
  "drained",
  "thrilled",
  "alive",
  "afraid",
  "anxious",
  "angry",
  "resentful",
  "hopeful",
  "spacious",
  "restless",
  "excited",
  "nervous",
  "conflicted",
];

const TENSION_KEYWORDS = ["again", "still", "despite", "though", "but", "yet", "keep", "couldn't"];

function normalizeWord(word: string) {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

function extractKeywords(content: string) {
  return content
    .toLowerCase()
    .split(/\s+/)
    .map(normalizeWord)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
}

function splitSentences(content: string) {
  return content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function computeKeywordStats(entryContent: string, historicalEntries: ConsentedEntry[]): KeywordStat[] {
  const now = new Date();
  const entries = [{ content: entryContent, createdAt: now }, ...historicalEntries];
  const map = new Map<string, { keyword: string; count: number; dates: Set<string> }>();

  for (const entry of entries) {
    const daysElapsed = Math.abs((now.getTime() - entry.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysElapsed > 14) continue;

    const keywords = extractKeywords(entry.content);
    for (const keyword of keywords) {
      const record = map.get(keyword) ?? { keyword, count: 0, dates: new Set<string>() };
      record.count += 1;
      record.dates.add(entry.createdAt.toISOString().split("T")[0]);
      map.set(keyword, record);
    }
  }

  return [...map.values()]
    .filter((stat) => stat.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((stat) => ({
      keyword: stat.keyword,
      count: stat.count,
      dates: [...stat.dates].sort(),
    }));
}

function extractConstraintSignals(
  card: FutureSelfCard | null,
  entryContent: string,
  historicalEntries: ConsentedEntry[],
): ConstraintSignal[] {
  const signals: ConstraintSignal[] = [];
  const cardConstraints = (card?.constraints ?? "")
    .split(/[,;\n]/)
    .map((constraint) => constraint.trim())
    .filter(Boolean);
  const aggregatedEntries = [{ content: entryContent, createdAt: new Date() }, ...historicalEntries];

  for (const constraint of cardConstraints) {
    const matches = aggregatedEntries.filter((entry) =>
      entry.content.toLowerCase().includes(constraint.toLowerCase()),
    );
    if (matches.length > 0) {
      signals.push({
        constraint,
        occurrences: matches.length,
        dates: matches.slice(0, 5).map((entry) => entry.createdAt.toISOString().split("T")[0]),
        origin: "card",
      });
    }
  }

  const lowerEntry = entryContent.toLowerCase();
  for (const keyword of CONSTRAINT_KEYWORDS) {
    if (lowerEntry.includes(keyword) && !cardConstraints.some((constraint) =>
      constraint.toLowerCase().includes(keyword)
    )) {
      signals.push({
        constraint: keyword,
        occurrences: 1,
        dates: [new Date().toISOString().split("T")[0]],
        origin: "entry",
      });
    }
  }

  return signals;
}

function detectContradictionSignals(
  entryContent: string,
  historicalEntries: ConsentedEntry[],
  card: FutureSelfCard | null,
): ContradictionSignal[] {
  const signals: ContradictionSignal[] = [];
  const sentences = splitSentences(entryContent);
  const tensionSentences = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return TENSION_KEYWORDS.some((keyword) => lower.includes(keyword));
  });

  for (const sentence of tensionSentences.slice(0, 4)) {
    const lower = sentence.toLowerCase();
    const historicalDates = historicalEntries
      .filter((entry) => entry.content.toLowerCase().includes(lower.slice(0, 30)))
      .map((entry) => entry.createdAt.toISOString().split("T")[0])
      .slice(0, 5);
    signals.push({
      label: "Repeated tension phrasing",
      sentence,
      historicalDates,
    });
  }

  if (card?.antiGoals) {
    const antiGoals = card.antiGoals
      .split(/[,;\n]/)
      .map((goal) => goal.trim())
      .filter(Boolean);
    for (const antiGoal of antiGoals) {
      const lowerGoal = antiGoal.toLowerCase();
      const matches = sentences.filter((sentence) => sentence.toLowerCase().includes(lowerGoal));
      if (matches.length > 0) {
        signals.push({
          label: `Anti-goal echo: ${antiGoal}`,
          sentence: matches[0],
          relatedCardElement: antiGoal,
          historicalDates: historicalEntries
            .filter((entry) => entry.content.toLowerCase().includes(lowerGoal))
            .map((entry) => entry.createdAt.toISOString().split("T")[0])
            .slice(0, 5),
        });
      }
    }
  }

  return signals.slice(0, 6);
}

function pickAnchorSentences(entryContent: string) {
  const sentences = splitSentences(entryContent);
  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    let score = 0;
    for (const keyword of EMOTION_KEYWORDS) {
      if (lower.includes(keyword)) {
        score += 1;
      }
    }
    if (sentence.includes("?")) score += 0.5;
    if (sentence.length > 140) score -= 0.3;
    return { sentence, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.sentence);
}

type ObservationalNoteResponse = {
  notes: Array<{
    id?: string;
    category: MarginNoteCategory;
    summary: string;
    body: string;
    provenance?: Record<string, unknown>;
    supportsCardEdit?: Omit<CardEditSupport, "refinedJustification"> | null;
  }>;
};

export async function generatePostJournalInsights(params: {
  entryContent: string;
  card: FutureSelfCard | null;
  historicalEntries: ConsentedEntry[];
}): Promise<{ notes: MarginNoteDraft[]; inlineQuestions: InlineQuestionDraft[] }> {
  const { entryContent, card, historicalEntries } = params;

  if (!entryContent.trim()) {
    return { notes: [], inlineQuestions: [] };
  }

  const keywordStats = computeKeywordStats(entryContent, historicalEntries);
  const constraintSignals = extractConstraintSignals(card, entryContent, historicalEntries);
  const contradictionSignals = detectContradictionSignals(entryContent, historicalEntries, card);
  const anchorSentences = pickAnchorSentences(entryContent);

  const cardSnippet = card
    ? `Values: ${card.values.join(", ")}\n6-month goal: ${card.sixMonthGoal}\n5-year goal: ${card.fiveYearGoal}\nConstraints: ${card.constraints}\nAnti-goals: ${card.antiGoals}`
    : "No card on file—if you suggest card edits, remind the user they can create the card first.";

  const observationalPrompt = `Generate structured margin notes for a journaling entry.

ENTRY:
${entryContent}

CARD SNAPSHOT:
${cardSnippet}

TEMPORAL KEYWORD COUNTS (last 14 days):
${JSON.stringify(keywordStats, null, 2)}

CONSTRAINT SIGNALS:
${JSON.stringify(constraintSignals, null, 2)}

CONTRADICTION SIGNALS:
${JSON.stringify(contradictionSignals, null, 2)}

GUIDELINES:
- Return 3-5 notes spanning the categories CARD_TENSION, TEMPORAL_PATTERN, VALIDATED_CONSTRAINT, and optionally OPEN_QUESTION.
- Never repeat the same keyword twice. If the card has explicit constraints, ensure at least one VALIDATED_CONSTRAINT note.
- Cite concrete evidence in \`provenance\` (keywords, counts, or dates).
- Summaries should start with tags like "[Pattern noticed]" or "[Constraint recognized]".
- \`body\` expands on the summary and ends with a question or prompt for interpretation.
- Set \`supportsCardEdit\` only when a contradiction or constraint appears multiple times or the entry explicitly questions the card. Include which card field to edit and why.
- Keep tone invitational and hypothesis-driven.

Return JSON: {"notes": [ { "id": "note-1", "category": "...", "summary": "...", "body": "...", "provenance": {...}, "supportsCardEdit": {...} } ] }`;

  let observationalNotes: MarginNoteDraft[] = [];
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MASTER_SYSTEM_PROMPT },
        { role: "user", content: observationalPrompt },
      ],
      temperature: 0.6,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as ObservationalNoteResponse;
      observationalNotes = (parsed.notes ?? []).slice(0, 5).map((note, index) => ({
        id: note.id ?? `note-${index + 1}`,
        category: note.category,
        summary: note.summary,
        body: note.body,
        provenance: note.provenance ?? {},
        supportsCardEdit: note.supportsCardEdit
          ? {
              field: note.supportsCardEdit.field,
              suggestion: note.supportsCardEdit.suggestion,
              severity: note.supportsCardEdit.severity ?? "low",
            }
          : undefined,
      }));
    }
  } catch (error) {
    console.error("OpenAI error while generating observational notes:", error);
  }

  const inlinePrompt = `Create 1-2 inline reflection questions inserted beneath the entry.

ENTRY:
${entryContent}

ANCHOR SENTENCES (high affect):
${anchorSentences.join("\n")}

CARD SNAPSHOT:
${cardSnippet}

RULES:
- Questions begin with "Reflection question:" in bold.
- Tie each question to a quoted phrase from the entry.
- Do not mention counts—let margin notes handle data.
- Return JSON: {"questions": [{"id": "q1","text": "**Reflection question:** ...","anchorSentence": "...","cardElement": "<optional>"}]}`;

  let inlineQuestions: InlineQuestionDraft[] = [];
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MASTER_SYSTEM_PROMPT },
        { role: "user", content: inlinePrompt },
      ],
      temperature: 0.8,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });
    const payload = completion.choices[0]?.message?.content;
    if (payload) {
      const parsed = JSON.parse(payload) as { questions?: Array<{ id?: string; text: string; anchorSentence?: string; cardElement?: string }> };
      inlineQuestions = (parsed.questions ?? []).slice(0, 2).map((question, index) => ({
        id: question.id ?? `question-${index + 1}`,
        text: question.text,
        anchorSentence: question.anchorSentence,
        cardElement: question.cardElement,
      }));
    }
  } catch (error) {
    console.error("OpenAI error while generating inline questions:", error);
  }

  const notesNeedingRefinement = observationalNotes.filter((note) => note.supportsCardEdit);
  if (notesNeedingRefinement.length > 0) {
    try {
      const refinementPrompt = `Refine card edit justifications for modal copy.

NOTES:
${JSON.stringify(notesNeedingRefinement, null, 2)}

Respond as JSON {"refinements":[{"noteId":"...","modalCopy":"..."}]} where modalCopy is one sentence referencing the specific contradiction or constraint.`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: MASTER_SYSTEM_PROMPT },
          { role: "user", content: refinementPrompt },
        ],
        temperature: 0.5,
        max_tokens: 250,
        response_format: { type: "json_object" },
      });

      const payload = completion.choices[0]?.message?.content;
      if (payload) {
        const parsed = JSON.parse(payload) as { refinements?: Array<{ noteId: string; modalCopy: string }> };
        const refinementMap = new Map(parsed.refinements?.map((item) => [item.noteId, item.modalCopy]));
        observationalNotes = observationalNotes.map((note) => {
          if (note.supportsCardEdit) {
            return {
              ...note,
              supportsCardEdit: {
                ...note.supportsCardEdit,
                refinedJustification: refinementMap.get(note.id),
              },
            };
          }
          return note;
        });
      }
    } catch (refinementError) {
      console.error("OpenAI error refining card edit suggestions:", refinementError);
    }
  }

  return { notes: observationalNotes, inlineQuestions };
}

export type PatternSummary = {
  recurringPhrases: { phrase: string; count: number }[];
  themesConnectedToCard: string[];
  questionsRaised: string[];
};

export async function generatePatternAnalysis(params: {
  consentedEntries: ConsentedEntry[];
  card: FutureSelfCard;
}): Promise<PatternSummary> {
  const { consentedEntries, card } = params;

  const entriesContext = consentedEntries
    .map((e) => `[${e.createdAt.toISOString().split("T")[0]}] ${e.content}`)
    .join("\n\n");

  const userMessage = `Analyze consented entries and generate pattern summary.

CONSENTED ENTRIES:
${entriesContext}

CARD:
Values: ${card.values.join(", ")}
6-month goal: ${card.sixMonthGoal}
5-year goal: ${card.fiveYearGoal}
Constraints: ${card.constraints}
Anti-goals: ${card.antiGoals}

OUTPUT STRUCTURE:
1. RECURRING PHRASES:
   - Extract exact phrases appearing 3+ times
   - Include counts
   - Max 5 phrases

2. THEMES CONNECTED TO CARD:
   - Match entry content to card elements
   - State connections explicitly
   - Identify tensions (behavior vs. aspiration)

3. QUESTIONS PATTERNS RAISE:
   - Generate 2-4 open-ended questions
   - Frame as exploration, not problems to fix
   - Avoid prescriptive questions

REQUIREMENTS:
- Present as hypotheses ("This might suggest...")
- Include confidence qualifiers ("seems to", "appears")
- No clinical language or diagnoses
- Cite specific entry dates for transparency

Return as JSON:
{
  "recurringPhrases": [{"phrase": "...", "count": 3}],
  "themesConnectedToCard": ["..."],
  "questionsRaised": ["..."]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MASTER_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.6,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return {
        recurringPhrases: [],
        themesConnectedToCard: [],
        questionsRaised: [],
      };
    }

    return JSON.parse(response) as PatternSummary;
  } catch (error) {
    console.error("OpenAI API error for pattern analysis:", error);
    return {
      recurringPhrases: [],
      themesConnectedToCard: [],
      questionsRaised: [],
    };
  }
}
