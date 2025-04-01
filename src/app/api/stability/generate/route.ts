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
    
    // Combine the prompt with Eid-specific instructions - simplified and focused on text
    const enhancedPrompt = `Professional Eid greeting card with the text "EID MUBARAK!" prominently displayed.

MOST IMPORTANT REQUIREMENT:
- The words "EID MUBARAK!" must be rendered in LARGE, BOLD, GOLD LETTERS at the top of the image.
- Keep the exact same person with unchanged identity and facial features
- Add decorative Islamic elements (crescent moons, stars, patterns)
- Professional typography like commercial greeting cards
- Text should have high contrast against background

${message ? `Secondary requirement: Include this message in elegant smaller text: "${message}"` : ''}

This MUST look like a professional Eid greeting card with PROMINENT "EID MUBARAK!" TEXT.`;

console.log('Simplified prompt with extreme focus on text rendering');
    
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
      
      // Use the supported dimensions that gives us more vertical space: 1152x896
      const targetWidth = 1152;
      const targetHeight = 896;
      
      console.log(`Using supported dimensions: ${targetWidth}x${targetHeight}`);
      
      // First resize the image to fit within the bottom portion of our target dimensions
      // This creates space at the top for text while maintaining aspect ratio
      const resizedBuffer = await sharp(imageBuffer)
        .resize({
          width: targetWidth,
          height: Math.floor(targetHeight * 0.65), // Reduce to 65% to create more space for text
          fit: 'inside',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toBuffer();
      
      // Now place this resized image onto a white canvas of the target dimensions
      // This gives us space at the top for the text
      const paddedBuffer = await sharp({
        create: {
          width: targetWidth,
          height: targetHeight,
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
      
      console.log('Created image with expanded space at top specifically for text (35% of height)');
      
      // Save the buffer to a temporary file
      tempFilePath = path.join(os.tmpdir(), `image-${Date.now()}.png`);
      fs.writeFileSync(tempFilePath, paddedBuffer);
      
      console.log('Using even lower image_strength: 0.45 to allow more text freedom');
      console.log('Using maximum cfg_scale: 25 to enforce text requirements');
      
      // Create form data for Stability API
      const formData = new FormData();
      
      // Read file content and create a blob
      const fileContent = readFileSync(tempFilePath);
      const blob = new Blob([fileContent], { type: 'image/png' });
      
      // Append form fields with extreme focus on text
      formData.append('init_image', blob, 'image.png');
      formData.append('text_prompts[0][text]', enhancedPrompt);
      formData.append('text_prompts[0][weight]', '1.5'); // Significantly increase weight to force text
      // Add a negative prompt with strong focus on avoiding missing text
      formData.append('text_prompts[1][text]', 'no text, missing text, blurry text, illegible text, small text, different person, altered face, changed ethnicity, different skin tone, deformed face');
      formData.append('text_prompts[1][weight]', '-1.0'); // Maximum negative weight
      formData.append('init_image_mode', 'IMAGE_STRENGTH');
      formData.append('image_strength', '0.45'); // Even lower to ensure text freedom
      formData.append('cfg_scale', '25'); // Maximum to force text to appear
      formData.append('samples', '1');
      formData.append('steps', '50'); // Maximum allowed steps
      formData.append('style_preset', 'photographic'); // Add style preset for better quality
      
      console.log('Using maximized parameters: positive prompt weight 1.5, negative prompt weight -1.0');
      
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