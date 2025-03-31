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

// Maximum image size in bytes
const MAX_IMAGE_SIZE_STABILITY = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE_OPENAI = 4 * 1024 * 1024;

// Stability AI API endpoint
const STABILITY_API_ENDPOINT = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image';

// Create a special mask for text areas only
// This creates a mask that protects the central face area
// but allows more space for text elements
async function createTextMask() {
  const maskPath = path.join(os.tmpdir(), `text-mask-${Date.now()}.png`);
  
  // Create a mask with black central area (protected) and white areas for text
  // Allowing larger areas for text at top and bottom
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 } // Black background (protected)
    }
  })
  .composite([{
    input: Buffer.from(
      `<svg width="1024" height="1024">
        <rect x="0" y="0" width="1024" height="200" fill="white"/>
        <rect x="0" y="824" width="1024" height="200" fill="white"/>
        <rect x="0" y="0" width="150" height="1024" fill="white"/>
        <rect x="874" y="0" width="150" height="1024" fill="white"/>
      </svg>`
    ),
    blend: 'over'
  }])
  .png()
  .toFile(maskPath);
  
  return maskPath;
}

// Convert base64 string to a buffer
function base64ToBuffer(base64String: string): Buffer {
  // Remove data URL prefix if present
  let cleanBase64 = base64String;
  if (base64String.includes(';base64,')) {
    cleanBase64 = base64String.split(';base64,')[1];
  }
  return Buffer.from(cleanBase64, 'base64');
}

export async function POST(req: Request) {
  let tempFilePath: string | null = null;
  let maskPath: string | null = null;
  let stabilityResultPath: string | null = null;
  
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
    
    // STEP 1: STABILITY AI PROCESSING
    // Prepare prompt for Stability AI (focus on image enhancement, not text)
    const stabilityPrompt = `Photorealistic Eid greeting card featuring this exact person with unchanged identity.

CRITICAL: Preserve 100% of the person's facial features, skin tone, and identity exactly as shown.

Create a decorative Eid-themed background with:
- Gold crescent moons and stars
- Festive Islamic patterns as a frame
- Elegant gold/silver accents and subtle sparkle effects
- Add "EID MUBARAK!" text at the top or bottom in beautiful gold lettering

Keep the person's identity completely unchanged - this is the most important aspect.
${message ? `Include the message: "${message}" in elegant text.` : ''}`;

console.log('Step 1: Processing with Stability AI...');
console.log('Stability AI prompt includes text generation as backup');
    
    // Convert base64 to buffer
    const imageBuffer = base64ToBuffer(image);
    
    // Check if the image is too large for Stability
    if (imageBuffer.length > MAX_IMAGE_SIZE_STABILITY) {
      throw new Error(`Image is too large (${Math.round(imageBuffer.length / 1024 / 1024)}MB). Must be under 10MB for Stability AI.`);
    }
    
    // Resize image for Stability AI
    const resizedBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toBuffer();
    
    // Save to temporary file
    tempFilePath = path.join(os.tmpdir(), `stability-input-${Date.now()}.png`);
    fs.writeFileSync(tempFilePath, resizedBuffer);
    
    // Create form data for Stability API
    const formData = new FormData();
    const fileContent = fs.readFileSync(tempFilePath);
    const blob = new Blob([fileContent], { type: 'image/png' });
    
    // Append form fields for Stability AI
    formData.append('init_image', blob, 'image.png');
    formData.append('text_prompts[0][text]', stabilityPrompt);
    formData.append('text_prompts[0][weight]', '1');
    formData.append('text_prompts[1][text]', 'different person, altered face, changed ethnicity, different skin tone, deformed face, bad anatomy, disfigured face, watermark, signature');
    formData.append('text_prompts[1][weight]', '-0.8');
    formData.append('init_image_mode', 'IMAGE_STRENGTH');
    formData.append('image_strength', '0.55');
    formData.append('cfg_scale', '12');
    formData.append('samples', '1');
    formData.append('steps', '40');
    
    // Call Stability API
    const stabilityResponse = await fetch(STABILITY_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });
    
    if (!stabilityResponse.ok) {
      const errorData = await stabilityResponse.json().catch(() => ({}));
      console.error('Stability API Error:', stabilityResponse.status, errorData);
      throw new Error(`Stability API error: ${errorData?.message || stabilityResponse.statusText}`);
    }
    
    const stabilityData = await stabilityResponse.json();
    console.log('Received response from Stability AI');
    
    // Extract base64 image from Stability response
    if (!stabilityData.artifacts || stabilityData.artifacts.length === 0) {
      throw new Error('No image generated by Stability AI');
    }
    
    const stabilityResult = stabilityData.artifacts[0].base64;
    const stabilityBuffer = Buffer.from(stabilityResult, 'base64');
    
    // Save Stability result for OpenAI processing
    stabilityResultPath = path.join(os.tmpdir(), `stability-result-${Date.now()}.png`);
    fs.writeFileSync(stabilityResultPath, stabilityBuffer);
    
    // STEP 2: OPENAI PROCESSING
    // Now use OpenAI to add text elements
    console.log('Step 2: Adding text elements with OpenAI...');
    console.log('Text mask allows large areas at top and bottom for text placement');
    console.log('Text prompt prioritizes large, visible "EID MUBARAK!" text');
    
    // Create text-only mask for OpenAI
    maskPath = await createTextMask();
    
    // Check if the image is too large for OpenAI
    if (stabilityBuffer.length > MAX_IMAGE_SIZE_OPENAI) {
      // Compress if needed
      const compressedBuffer = await sharp(stabilityBuffer)
        .png({ quality: 80, compressionLevel: 9 })
        .toBuffer();
      
      if (compressedBuffer.length > MAX_IMAGE_SIZE_OPENAI) {
        throw new Error(`Image is too large for OpenAI processing. Please try again with a smaller image.`);
      }
      
      // Save the compressed version
      fs.writeFileSync(stabilityResultPath, compressedBuffer);
    }
    
    // Prepare OpenAI prompt (focused only on adding text)
    const textPrompt = `Add LARGE, PROMINENT "EID MUBARAK!" TEXT to this image. 
    
    IMPORTANT INSTRUCTIONS:
    1. The text MUST be very bold, large, and clearly visible
    2. Place the text at the top or bottom of the image
    3. Use elegant gold/metallic styling with Islamic decorative elements
    4. Text should be the main focal point after the person's face
    
    ${message ? `Also add this personalized message in stylish text: "${message}"` : ''}
    
    Make sure the text is impossible to miss - it should be the most eye-catching element after the person.`;
    
    try {
      const openaiResponse = await openai.images.edit({
        image: fs.createReadStream(stabilityResultPath),
        mask: fs.createReadStream(maskPath),
        prompt: textPrompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      });
      
      const finalImageUrl = openaiResponse.data[0]?.url || '';
      console.log('Successfully completed two-step generation process');
      
      return NextResponse.json({ image: finalImageUrl });
    } catch (openaiError: any) {
      console.error('OpenAI Error:', openaiError);
      
      // If OpenAI fails, add basic text overlay with Sharp and return the result
      console.log('Falling back to manual text overlay with Sharp');
      try {
        // Create a new image with text overlay
        const textOverlayPath = path.join(os.tmpdir(), `text-overlay-${Date.now()}.png`);
        
        // Add text to the stability result
        await sharp(stabilityResultPath)
          .composite([{
            input: Buffer.from(
              `<svg width="1024" height="1024">
                <style>
                  .title { fill: gold; font-size: 80px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
                  .subtitle { fill: white; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
                </style>
                <text x="512" y="120" text-anchor="middle" class="title">EID MUBARAK!</text>
                ${message ? `<text x="512" y="940" text-anchor="middle" class="subtitle">${message}</text>` : ''}
              </svg>`
            ),
            blend: 'over'
          }])
          .toBuffer()
          .then(data => {
            fs.writeFileSync(textOverlayPath, data);
            return textOverlayPath;
          });
        
        // Convert to base64 for response
        const textOverlayBuffer = fs.readFileSync(textOverlayPath);
        const textOverlayBase64 = textOverlayBuffer.toString('base64');
        
        // Clean up
        if (fs.existsSync(textOverlayPath)) {
          try {
            fs.unlinkSync(textOverlayPath);
          } catch (err) {
            console.error('Error deleting text overlay file:', err);
          }
        }
        
        return NextResponse.json({
          image: `data:image/png;base64,${textOverlayBase64}`,
          note: 'Used fallback text overlay'
        });
      } catch (fallbackError) {
        console.error('Error in fallback text overlay:', fallbackError);
        
        // If all else fails, return the Stability result as is
        console.log('Returning Stability AI result without text');
        return NextResponse.json({
          image: `data:image/png;base64,${stabilityResult}`,
          note: 'Text addition failed, returning enhanced image only'
        });
      }
    }
    
  } catch (error: any) {
    console.error('Error in combined generation:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    const filesToCleanup = [tempFilePath, maskPath, stabilityResultPath];
    
    for (const file of filesToCleanup) {
      if (file && fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (err) {
          console.error(`Error deleting temporary file ${file}:`, err);
        }
      }
    }
  }
} 