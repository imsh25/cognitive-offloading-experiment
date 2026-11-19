export type CondId = "A" | "B";

export interface Pointer {
  title: string;
  text: string;
}

export interface Topic {
  id: "T1" | "T2";
  name: string;
  instruction: string;
  pointers: Pointer[];
}

export const TOPICS: Topic[] = [
  {
    id: "T1",
    name: "The Influence of Social Media on Young Adults",
    instruction:
      "Discuss how social media influences the everyday lives of young adults. Consider its effects on communication, relationships, learning, attention, and personal well-being.",
    pointers: [
      {
        title: "Communication and connectivity",
        text: "How social media enables communication and maintains relationships.",
      },
      {
        title: "Information and learning",
        text: "Access to educational resources, information, and opportunities.",
      },
      {
        title: "Attention and productivity",
        text: "Distraction, multitasking, and difficulties maintaining concentration.",
      },
      {
        title: "Social comparison",
        text: "Exposure to idealized lifestyles and its influence on self-perception.",
      },
      {
        title: "Mental and emotional well-being",
        text: "Possible effects on stress, confidence, and emotional health.",
      },
      {
        title: "Balanced use",
        text: "Responsible use, digital boundaries, and maintaining offline relationships.",
      },
    ],
  },
  {
    id: "T2",
    name: "The Importance of Financial Literacy Among Young Adults",
    instruction:
      "Discuss why financial literacy is important for young adults. Consider how financial knowledge influences everyday decisions, future planning, and financial independence.",
    pointers: [
      {
        title: "Understanding financial literacy",
        text: "Basic knowledge of money management and financial decision-making.",
      },
      {
        title: "Budgeting and spending",
        text: "Managing income, expenses, and everyday purchases.",
      },
      {
        title: "Saving habits",
        text: "Importance of saving and preparing for unexpected expenses.",
      },
      {
        title: "Debt and borrowing",
        text: "Understanding loans, credit, interest, and financial risks.",
      },
      {
        title: "Financial independence",
        text: "Making informed decisions and planning for future responsibilities.",
      },
      {
        title: "Financial education",
        text: "Role of families, schools, universities, and digital resources.",
      },
    ],
  },
];

export const getTopic = (id: string): Topic => TOPICS.find((t) => t.id === id) ?? TOPICS[0];

export interface Condition {
  id: CondId;
  framing: "Gain" | "Loss";
  initialMarks: number;
  scoreHeading: string;
  paragraphs: string[];
}

export const CONDITIONS: Record<CondId, Condition> = {
  A: {
    id: "A",
    framing: "Gain",
    initialMarks: 0,
    scoreHeading: "Your Current Score: 0 Marks",
    paragraphs: [
      "You currently have zero marks for this task.",
      "You are required to write an essay on the topic presented below.",
      "Your objective is to write a comprehensive response covering the important aspects of the topic. Including the relevant points will help you obtain a good score.",
      "Before beginning, you may choose to view a help guide containing some important points that can be included in your essay.",
      "Viewing the guide is optional.",
    ],
  },
  B: {
    id: "B",
    framing: "Loss",
    initialMarks: 10,
    scoreHeading: "Your Current Score: 10/20 Marks",
    paragraphs: [
      "You have already been awarded 10 marks for this task.",
      "You are now required to write an essay on the topic presented below.",
      "Your response will be evaluated based on how comprehensively you address the topic. Marks may be deducted for missing important points, incomplete explanations, spelling mistakes, or failure to cover relevant aspects.",
      "Before beginning, you may choose to view a help guide containing important points that should be covered in your essay.",
      "Viewing the guide is optional.",
    ],
  },
};

/** Four counterbalanced sequences: [first task, second task] */
export const SEQUENCES: Record<number, [{ cond: CondId; topic: Topic["id"] }, { cond: CondId; topic: Topic["id"] }]> = {
  1: [
    { cond: "A", topic: "T1" },
    { cond: "B", topic: "T2" },
  ],
  2: [
    { cond: "B", topic: "T1" },
    { cond: "A", topic: "T2" },
  ],
  3: [
    { cond: "A", topic: "T2" },
    { cond: "B", topic: "T1" },
  ],
  4: [
    { cond: "B", topic: "T2" },
    { cond: "A", topic: "T1" },
  ],
};

/** Flat rows for the "Topic and Pointers" sheet (exactly what participants see). */
export const topicRows = () =>
  TOPICS.flatMap((t) =>
    t.pointers.map((p, i) => ({
      Topic_ID: t.id,
      Topic_Name: t.name,
      Essay_Instruction: t.instruction,
      Pointer_Number: i + 1,
      Pointer_Content: `${p.title}: ${p.text}`,
    }))
  );
