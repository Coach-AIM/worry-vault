import { GoogleGenAI, Type, Schema } from "@google/genai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!apiKey || apiKey === "MISSING_API_KEY") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY_MISSING" },
        { status: 400 },
      );
    }
    const ai = new GoogleGenAI({ apiKey });
    const body = await req.json();
    const { type } = body;
    let prompt = body.prompt;

    if (typeof prompt === "object" && prompt !== null) {
      const situation = prompt.situation || "";
      const thought = prompt.automaticThought || prompt.thought || "";
      let emotions = "";
      if (prompt.emotionsJson) {
        try {
          const parsed =
            typeof prompt.emotionsJson === "string"
              ? JSON.parse(prompt.emotionsJson)
              : prompt.emotionsJson;
          if (Array.isArray(parsed)) {
            emotions = parsed
              .map((e: any) => `${e.name} (${e.weight}%)`)
              .join(", ");
          } else {
            emotions = JSON.stringify(parsed);
          }
        } catch (e) {
          emotions = String(prompt.emotionsJson);
        }
      }
      prompt = `Situation: ${situation}\nThought: ${thought}\nEmotions: ${emotions}`;
    }

    let systemInstruction = "";
    let responseSchema: Schema | undefined = undefined;

    if (type === "vault") {
      systemInstruction = `You are a calm, supportive mental wellness assistant. Generate exactly 3 highly actionable, small, manageable tasks to help someone process or mitigate the following worry. Follow Calm Tech principles. Keep it non-gamified. Always output an array of 3 task objects.`;
      responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "A gentle, actionable task",
            },
            estimatedTime: {
              type: Type.STRING,
              description: "Estimated completion time, e.g. 5 mins",
            },
            emotionalIntensity: {
              type: Type.STRING,
              description: "Low, Medium, or High",
            },
          },
          required: ["title", "estimatedTime", "emotionalIntensity"],
        },
      };
    } else if (type === "journal") {
      systemInstruction = `Analyze the following user situation and thoughts for Cognitive Behavioral Therapy (CBT). You must respond with a raw JSON object containing these exact keys: "emotions", "distortions", and "reframed_thought".`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          emotions: {
            type: Type.OBJECT,
            description:
              "Key-value pairs of emotions and starting intensity weights e.g. {'Anxious': 90, 'Frustrated': 75}",
          },
          distortions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              "Cognitive distortion names, e.g. ['Catastrophizing', 'Mind Reading']",
          },
          reframed_thought: {
            type: Type.STRING,
            description: "Objective, compassionate reframed thought",
          },
        },
        required: ["emotions", "distortions", "reframed_thought"],
      };

      prompt = `Analyze the following user situation and thoughts for Cognitive Behavioral Therapy (CBT).
You must respond with a raw JSON object containing these exact keys:
{
  "emotions": { [key: string]: number }, // e.g., {"Anxious": 90, "Frustrated": 75}
  "distortions": string[], // e.g., ["Catastrophizing", "Mind Reading"]
  "reframed_thought": string
}
User Input: ${prompt}`;
    } else if (type === "emotions") {
      systemInstruction = `You are a calm, highly empathetic mental wellness assistant. Analyze the triggering situation and generate a JSON array containing exactly 3 to 5 distinct emotions that are most likely being felt, along with a suggested starting intensity weight (between 10 and 100). Follow Calm Tech principles. Keep it focused on typical CBT emotions (e.g., Anxiety, Overwhelm, Sadness, Anger, Frustration, Guilt, Loneliness).`;
      responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Name of the emotion (e.g. Anxiety)",
            },
            weight: {
              type: Type.INTEGER,
              description: "Intensity weight, 10 to 100",
            },
          },
          required: ["name", "weight"],
        },
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    if (!response.text) throw new Error("No text returned from Gemini");

    return NextResponse.json({ result: JSON.parse(response.text) });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 },
    );
  }
}
