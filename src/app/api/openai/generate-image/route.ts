import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Initialize OpenAI client on the server
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Maximum image size in bytes (4MB)
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

export async function POST(req: Request) {
  let tempFilePath: string | null = null;
  
  try {
    const { base64Image, prompt } = await req.json();
    
    if (!base64Image) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }
    
    // Combine the prompt with Eid-specific instructions
    const enhancedPrompt = `Transform the person in this image into a festive Eid celebration portrait. 
    Add decorative Eid elements, crescent moons, lanterns, and festive ornaments around them.
    Make the image vibrant and colorful with a greeting message saying "Eid Mubarak!".
    Maintain the person's likeness while adding a festive and celebratory Eid mood. 
    ${prompt || ''}`;
    
    try {
      // Extract the base64 data
      let base64Data = base64Image;
      if (base64Image.includes(';base64,')) {
        base64Data = base64Image.split(';base64,')[1];
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Process with sharp to convert to PNG and optimize size
      const pngBuffer = await sharp(imageBuffer)
        .png({ quality: 80 }) // Convert to PNG with some compression
        .resize(1024, 1024, { // Resize to fit OpenAI's requirements
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();
      
      // Check if the processed image is still too large
      if (pngBuffer.length > MAX_IMAGE_SIZE) {
        throw new Error(`Image is too large (${Math.round(pngBuffer.length / 1024 / 1024)}MB). Must be under 4MB.`);
      }
      
      // Save the buffer to a temporary file
      tempFilePath = path.join(os.tmpdir(), `image-${Date.now()}.png`);
      fs.writeFileSync(tempFilePath, pngBuffer);
      
      console.log('Temp file path:', tempFilePath);
      console.log('Enhanced prompt:', enhancedPrompt);
      
      // Generate image using OpenAI - using their file handling
      const aiResponse = await openai.images.edit({
        image: fs.createReadStream(tempFilePath),
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      });
      
      console.log('AI response:', aiResponse);

      return NextResponse.json({ url: aiResponse.data[0].url });
    } catch (conversionError: any) {
      console.error('Error processing image:', conversionError);
      return NextResponse.json(
        { error: conversionError.message || 'Failed to process the image. Please ensure it is a valid image file.' },
        { status: 400 }
      );
    } finally {
      // Clean up the temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.error('Error deleting temporary file:', err);
        }
      }
    }
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
} 