import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { serverEnv, isAIAvailable } from "~/env";

// Initialize the OpenAI model if API key is available
const initializeModel = () => {
  if (isAIAvailable()) {
    return openai("gpt-4o", { apiKey: serverEnv.OPENAI_API_KEY });
  }
  return null;
};

// Conditionally initialize the model
const model = initializeModel();

// Common system prompt for childcare context
const CHILDCARE_SYSTEM_PROMPT = `
You are an AI assistant specialized in childcare and child development. 
Your role is to help nannies and parents communicate effectively about children's 
activities, development, and wellbeing. Be professional, supportive, and focused 
on child development best practices.
`;

/**
 * Summarizes a series of messages about a child into a concise update
 * @param messages Array of message objects with content and sender information
 * @param childName The name of the child the messages are about
 * @returns A concise summary of the messages focused on child development
 */
export async function summarizeMessages(messages: { content: string; senderName: string }[], childName: string) {
  if (!messages.length) return "";
  
  // Return a placeholder if AI is not available
  if (!isAIAvailable() || !model) {
    console.log("AI summary generation unavailable - OpenAI API key not configured");
    return "";
  }
  
  const messagesText = messages
    .map((msg) => `${msg.senderName}: ${msg.content}`)
    .join("\n\n");
  
  const prompt = `
Below are several messages exchanged between a nanny and parent about a child named ${childName}.
Please summarize these messages into a concise child development update focusing on:
1. Key activities or events mentioned
2. Any developmental milestones or progress
3. Any concerns or issues raised
4. Any action items or follow-ups needed

Keep the summary professional, factual, and focused on the child's development and wellbeing.

MESSAGES:
${messagesText}

SUMMARY:
`;

  try {
    const { text } = await generateText({
      model,
      system: CHILDCARE_SYSTEM_PROMPT,
      prompt,
      maxTokens: 300,
    });
    
    return text;
  } catch (error) {
    console.error("Error generating message summary:", error);
    return "Unable to generate summary at this time.";
  }
}

/**
 * Analyzes an observation and generates relevant tags for categorization
 * @param observationText The text content of the observation
 * @param observationType The type of observation (TEXT, PHOTO, VIDEO, AUDIO)
 * @returns An array of relevant tags as a JSON string
 */
export async function generateObservationTags(observationText: string, observationType: string) {
  // Return default tags if AI is not available
  if (!isAIAvailable() || !model) {
    console.log("AI tag generation unavailable - OpenAI API key not configured");
    return JSON.stringify(["observation", observationType.toLowerCase()]);
  }

  const prompt = `
Analyze the following child observation and generate 3-5 relevant tags that categorize this observation.
Focus on developmental domains (physical, cognitive, social-emotional, language), activities, and skills demonstrated.

Observation Type: ${observationType}
Observation Content: ${observationText}

Return ONLY a JSON array of tags, for example: ["physical development", "fine motor skills", "drawing"]
`;

  try {
    const { text } = await generateText({
      model,
      system: CHILDCARE_SYSTEM_PROMPT,
      prompt,
      maxTokens: 100,
    });
    
    // Ensure the response is a valid JSON array
    try {
      const tags = JSON.parse(text);
      if (Array.isArray(tags)) {
        return JSON.stringify(tags);
      }
      // If not an array, extract tags from text and format as array
      return JSON.stringify(extractTagsFromText(text));
    } catch {
      return JSON.stringify(extractTagsFromText(text));
    }
  } catch (error) {
    console.error("Error generating observation tags:", error);
    return JSON.stringify(["observation"]);
  }
}

// Helper function to extract tags from text if JSON parsing fails
function extractTagsFromText(text: string): string[] {
  // Try to extract words or phrases that look like tags
  const tagMatches = text.match(/"([^"]*)"/g) || [];
  if (tagMatches.length > 0) {
    return tagMatches.map(tag => tag.replace(/"/g, ''));
  }
  
  // Fallback: split by commas or line breaks and clean up
  return text
    .split(/,|\n/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0 && !tag.includes('[') && !tag.includes(']'));
}

/**
 * Recommends resources based on a child's age, interests, and developmental needs
 * @param childAge The age of the child in months
 * @param interests Any known interests of the child
 * @param developmentalFocus Areas of development to focus on
 * @returns Recommended resources and activities
 */
export async function recommendContent(
  childAge: number,
  interests: string[] = [],
  developmentalFocus: string[] = []
) {
  // Return default recommendations if AI is not available
  if (!isAIAvailable() || !model) {
    console.log("AI content recommendations unavailable - OpenAI API key not configured");
    return [
      {
        title: "Age-appropriate activity",
        description: "Activities appropriate for this age group focus on key developmental milestones.",
        developmentalBenefits: developmentalFocus.length > 0 ? developmentalFocus.join(", ") : "General development",
        materialsNeeded: "Basic household items"
      },
      {
        title: "Reading time",
        description: "Regular reading supports language development at any age.",
        developmentalBenefits: "Language development, bonding",
        materialsNeeded: "Age-appropriate books"
      },
      {
        title: "Outdoor exploration",
        description: "Time outside exploring nature and getting physical activity.",
        developmentalBenefits: "Physical development, sensory development",
        materialsNeeded: "Safe outdoor space"
      }
    ];
  }

  const interestsText = interests.length > 0 ? interests.join(", ") : "unknown";
  const focusText = developmentalFocus.length > 0 ? developmentalFocus.join(", ") : "general development";
  
  const prompt = `
Recommend 3 age-appropriate activities or resources for a ${childAge}-month-old child.

Child's interests: ${interestsText}
Developmental focus areas: ${focusText}

For each recommendation, include:
1. A title
2. A brief description
3. How it supports development
4. Any materials needed

Format as a JSON array of objects with these fields: title, description, developmentalBenefits, materialsNeeded
`;

  try {
    const { text } = await generateText({
      model,
      system: CHILDCARE_SYSTEM_PROMPT,
      prompt,
      maxTokens: 500,
    });
    
    // Try to parse the response as JSON
    try {
      return JSON.parse(text);
    } catch {
      // If parsing fails, return a simplified format
      return [
        {
          title: "Age-appropriate activity",
          description: "Unable to generate specific recommendations at this time.",
          developmentalBenefits: focusText,
          materialsNeeded: "Basic household items"
        }
      ];
    }
  } catch (error) {
    console.error("Error generating content recommendations:", error);
    return [
      {
        title: "Age-appropriate activity",
        description: "Unable to generate recommendations at this time.",
        developmentalBenefits: "General development",
        materialsNeeded: "Basic household items"
      }
    ];
  }
}

/**
 * Provides AI assistance for drafting messages between nannies and parents
 * @param context Information about the message context
 * @param draft The current draft message text
 * @returns Suggested improvements or completions
 */
export async function assistMessageDrafting(
  context: { 
    userRole: "NANNY" | "PARENT",
    childName?: string,
    messageType?: "update" | "question" | "concern" | "general"
  },
  draft: string
) {
  // Return the original draft if AI is not available
  if (!isAIAvailable() || !model) {
    console.log("AI message assistance unavailable - OpenAI API key not configured");
    return draft;
  }

  const roleSpecificPrompt = context.userRole === "NANNY" 
    ? "You're helping a nanny communicate with a parent."
    : "You're helping a parent communicate with their child's nanny.";
  
  const childContext = context.childName 
    ? `This message is about a child named ${context.childName}.`
    : "This message is about a child.";
  
  const messageTypePrompt = context.messageType
    ? `This is a ${context.messageType} message.`
    : "";
  
  const prompt = `
${roleSpecificPrompt} ${childContext} ${messageTypePrompt}

The current draft message is:
"${draft}"

Please suggest improvements to make this message more:
1. Clear and professional
2. Focused on the child's development and wellbeing
3. Constructive and solution-oriented (if addressing a concern)
4. Complete (if it seems unfinished)

Provide your suggested improved version of the message.
`;

  try {
    const { text } = await generateText({
      model,
      system: CHILDCARE_SYSTEM_PROMPT,
      prompt,
      maxTokens: 300,
    });
    
    return text;
  } catch (error) {
    console.error("Error generating message assistance:", error);
    return "Unable to provide message assistance at this time.";
  }
}