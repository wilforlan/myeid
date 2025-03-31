import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { readFileSync } from 'fs';
import sharp from 'sharp';

// Maximum image size in bytes (10MB for Stability AI)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Use Stability API endpoint that's more reliable for text rendering
// The base SDXL model has better text capabilities in certain cases
const STABILITY_API_ENDPOINT = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image';

export async function POST(req: Request) {
  let tempFilePath: string | null = null;
  
  try {
    // Check if Stability API key exists
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      throw new Error('STABILITY_API_KEY is not set in environment variables');
    }
    
    const { image, message } = await req.json();
    
    if (!image) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }
    
    // Combine the prompt with Eid-specific instructions
    const enhancedPrompt = `Professional Eid greeting card with clear visible "EID MUBARAK!" text.

The image MUST have:
- Very large, bold, golden "EID MUBARAK!" text at the top of the image
- Text that is clearly visible and readable
- The exact same person from the photo with unchanged identity and features
- Decorative Islamic elements including crescent moons, stars, and ornate patterns

The "EID MUBARAK!" text should be:
- Centered at the top
- Large and impossible to miss
- Gold or metallic in appearance
- Surrounded by a subtle glow or sparkle effect
- Professional typography similar to commercial greeting cards

${message ? `Also include this message in smaller text below: "${message}"` : ''}

This is a professional photo greeting card with text overlay, like Hallmark or American Greetings cards.`;

console.log('Complete prompt restructure focusing on guaranteed text rendering');
console.log('Using greeting card styling reference to ensure text appears');
    
    // Extract the base64 data
    let base64Data = image;
    if (image.includes(';base64,')) {
      base64Data = image.split(';base64,')[1];
    }
    
    try {
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Check if the image is too large
      if (imageBuffer.length > MAX_IMAGE_SIZE) {
        throw new Error(`Image is too large (${Math.round(imageBuffer.length / 1024 / 1024)}MB). Must be under 10MB.`);
      }
      
      // Use sharp to resize the image to 1024x1024 as required by Stability AI
      // We'll only resize without any other processing
      const resizedBuffer = await sharp(imageBuffer)
        .resize(1024, 1024, {
          fit: 'contain', // Maintain aspect ratio and fit within dimensions
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for transparent areas
        })
        .toBuffer();
      
      console.log('Sending image to Stability AI with prompt:', enhancedPrompt.substring(0, 100) + '...');
      console.log('Using image_strength:', 0.55, '(lower values allow more modifications to the image)');
      console.log('Using cfg_scale:', 20, '(higher values force the model to follow instructions more precisely)');
      
      // For better processing with text, create a version of the image with more space at the top
      // This gives the model room to add the text
      const paddedBuffer = await sharp({
        create: {
          width: 1024,
          height: 1180, // Extra space at top for text
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .composite([{
        input: resizedBuffer,
        gravity: 'south' // Position the original image at the bottom
      }])
      .png()
      .toBuffer();
      
      // Save the buffer to a temporary file
      tempFilePath = path.join(os.tmpdir(), `image-${Date.now()}.png`);
      fs.writeFileSync(tempFilePath, paddedBuffer);
      
      console.log('Added extra padding at the top of the image to create space for text');
      
      // Create form data for Stability API
      const formData = new FormData();
      
      // Read file content and create a blob
      const fileContent = readFileSync(tempFilePath);
      const blob = new Blob([fileContent], { type: 'image/png' });
      
      // Append form fields
      formData.append('init_image', blob, 'image.png');
      formData.append('text_prompts[0][text]', enhancedPrompt);
      formData.append('text_prompts[0][weight]', '1.2'); // Increase weight for the positive prompt
      // Add a negative prompt to avoid unwanted elements but specifically emphasize text MUST appear
      formData.append('text_prompts[1][text]', 'different person, altered face, changed ethnicity, different skin tone, deformed face, bad anatomy, disfigured, ugly, blurry, low quality, watermark, signature, missing text, small text, no text, illegible text, no decorations, plain background, minimal decoration');
      formData.append('text_prompts[1][weight]', '-0.9');
      formData.append('init_image_mode', 'IMAGE_STRENGTH');
      formData.append('image_strength', '0.55'); // Lower to allow more transformation for text
      formData.append('cfg_scale', '20'); // Even higher to force text to appear
      formData.append('samples', '1');
      formData.append('steps', '50'); // Maximum allowed steps
      formData.append('style_preset', 'photographic'); // Add style preset for better quality
      
      console.log('Using maximum allowed steps (50) with increased cfg_scale (20) and reduced image_strength (0.55)');
      console.log('Added style_preset: photographic, increased positive prompt weight to 1.2');
      
      // Call Stability API
      const response = await fetch(STABILITY_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Stability API Error:', response.status, errorData);
        throw new Error(`Stability API error: ${errorData?.message || response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('Received response from Stability AI');
      
      // Extract image URL from Stability AI response
      if (responseData.artifacts && responseData.artifacts.length > 0) {
        const generatedImage = responseData.artifacts[0];
        const base64Image = generatedImage.base64;
        
        // Return the base64 image directly
        return NextResponse.json({
          image: `data:image/png;base64,${base64Image}`
        });
      } else {
        throw new Error('No image generated by Stability AI');
      }
      
    } catch (processingError: any) {
      console.error('Error processing image:', processingError);
      let errorMessage = 'Failed to process the image. Please ensure it is a valid image file.';
      
      if (processingError.message && processingError.message.includes('too large')) {
        errorMessage = `Image is too large. Maximum size is 10MB.`;
      } else if (processingError.message && processingError.message.includes('dimensions')) {
        errorMessage = `Image dimensions are not supported. Please try a different image.`;
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error('Error deleting temporary file:', err);
      }
    }
  }
} 