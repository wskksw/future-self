import { PromptCategory } from "@prisma/client";

const valueTemplates = [
  "Your card says '{value}' is a core value. How did that show up for you today?",
  "Your card says '{value}' matters deeply. Where did you notice it influencing your choices today?",
  "Your card says '{value}' is part of who you're becoming. What small moment reflected that today?",
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export type GeneratedPrompt = {
  id: string;
  text: string;
  category: PromptCategory;
  cardField: string;
};

export function generateValuePrompt(values: string[]): Omit<GeneratedPrompt, "id"> {
  if (!values.length) {
    return {
      text: "It looks like your card is still blank. What matters most to the future you you're imagining?",
      category: PromptCategory.VALUE,
      cardField: "values",
    };
  }

  const value = pickRandom(values);
  const template = pickRandom(valueTemplates);
  const promptText = template
    .replace("{value}", value)
    .concat(` (Based on your value: '${value}')`);

  return {
    text: promptText,
    category: PromptCategory.VALUE,
    cardField: value,
  };
}

