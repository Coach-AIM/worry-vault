import { GoogleGenAI, Type, Schema } from '@google/genai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!apiKey || apiKey === 'MISSING_API_KEY') {
      return NextResponse.json({ error: "GEMINI_API_KEY_MISSING" }, { status: 400 });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { prompt, type } = await req.json();
    
    let systemInstruction = "";
    let responseSchema: Schema | undefined = undefined;
    
    if (type === 'vault') {
      systemInstruction = `You are a calm, supportive mental wellness assistant. Generate exactly 3 highly actionable, small, manageable tasks to help someone process or mitigate the following worry. Follow Calm Tech principles. Keep it non-gamified. Always output an array of 3 task objects.`;
      responseSchema = {
          type: Type.ARRAY,
          items: {
              type: Type.OBJECT,
              properties: {
                  title: { type: Type.STRING, description: "A gentle, actionable task" },
                  estimatedTime: { type: Type.STRING, description: "Estimated completion time, e.g. 5 mins" },
                  emotionalIntensity: { type: Type.STRING, description: "Low, Medium, or High" }
              },
              required: ["title", "estimatedTime", "emotionalIntensity"]
          }
      };
    } else if (type === 'journal') {
      systemInstruction = `You are a gentle CBT (Cognitive Behavioral Therapy) assistant. Analyze the entry for cognitive distortions. Return an object with 'insights' containing a supportive brief string identifying the pattern. Also return a 'reframeSuggestions' array containing 2-3 objective, compassionate reframes written from a third-party perspective. Finally, return an array of strings in 'suggestedDistortions' matching any of these exact categories if they apply: "all-or-nothing", "catastrophizing", "should-statements", "mind-reading", "emotional-reasoning", "overgeneralization".`;
      responseSchema = {
          type: Type.OBJECT,
          properties: {
              insights: { type: Type.STRING, description: "The gentle analysis" },
              reframeSuggestions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "2-3 objective, third-party perspective reframes" 
              },
              suggestedDistortions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of cognitive distortions identified, e.g. ['all-or-nothing', 'catastrophizing']"
              }
          },
          required: ["insights", "reframeSuggestions", "suggestedDistortions"]
      };
    } else if (type === 'emotions') {
      systemInstruction = `You are a calm, highly empathetic mental wellness assistant. Analyze the triggering situation and generate a JSON array containing exactly 3 to 5 distinct emotions that are most likely being felt, along with a suggested starting intensity weight (between 10 and 100). Follow Calm Tech principles. Keep it focused on typical CBT emotions (e.g., Anxiety, Overwhelm, Sadness, Anger, Frustration, Guilt, Loneliness).`;
      responseSchema = {
          type: Type.ARRAY,
          items: {
              type: Type.OBJECT,
              properties: {
                  name: { type: Type.STRING, description: "Name of the emotion (e.g. Anxiety)" },
                  weight: { type: Type.INTEGER, description: "Intensity weight, 10 to 100" }
              },
              required: ["name", "weight"]
          }
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    if (!response.text) throw new Error("No text returned from Gemini");
    
    return NextResponse.json({ result: JSON.parse(response.text) });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
