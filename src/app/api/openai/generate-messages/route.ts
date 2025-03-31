import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client on the server
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    
    const personalizedIntro = name ? `for ${name}` : '';
    
    // Default messages to return if API call fails
    const defaultMessages = [
      `Eid Mubarak ${personalizedIntro}! May this special day bring peace, happiness, and prosperity to your life.`,
      `Wishing you a joyous Eid ${personalizedIntro}! May the blessings of Allah fill your life with happiness and success.`,
      `Happy Eid ${personalizedIntro}! May Allah accept your good deeds, forgive your transgressions and ease the suffering of all people around the globe.`,
      `Eid Mubarak ${personalizedIntro}! May this Eid bring joy, health and wealth to you and your family.`,
      `Sending Eid wishes ${personalizedIntro}! May your faith bring you peace and prosperity on this special day.`
    ];
    
    const prompt = `Generate 5 warm, personalized Eid greeting messages ${personalizedIntro}. 
    Each message should be short (under 150 characters), uplifting, and include "Eid Mubarak" or similar Eid greetings.
    The messages should be diverse in tone and content.
    Format the output as a JSON array of strings.`;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Using a more cost-effective model
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0]?.message?.content;
    if (content) {
      try {
        const parsedContent = JSON.parse(content);
        if (Array.isArray(parsedContent.messages) && parsedContent.messages.length > 0) {
          return NextResponse.json({ messages: parsedContent.messages });
        }
      } catch (err) {
        console.error('Error parsing AI-generated messages:', err);
      }
    }
    
    // Return default messages if API call fails or parsing error occurs
    return NextResponse.json({ messages: defaultMessages });
  } catch (error: any) {
    console.error('Error generating messages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate messages' },
      { status: 500 }
    );
  }
} 