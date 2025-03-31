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

// Create a mask that allows OpenAI to add text in optimal areas
// This creates a mask with editable areas at the top, bottom, and sides
async function createTextMask() {
  const maskPath = path.join(os.tmpdir(), `mask-${Date.now()}.png`);
  
  // Create a mask with black center (protected) and white areas for text
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
        <rect x="0" y="0" width="1024" height="240" fill="white"/>
        <rect x="0" y="784" width="1024" height="240" fill="white"/>
        <rect x="0" y="0" width="160" height="1024" fill="white"/>
        <rect x="864" y="0" width="160" height="1024" fill="white"/>
      </svg>`
    ),
    blend: 'over'
  }])
  .png()
  .toFile(maskPath);
  
  console.log('Created text mask with large editable areas at top/bottom/sides')
  return maskPath;
}

export async function POST(req: Request) {
  let tempFilePath: string | null = null;
  let correctedTempFilePath: string | null = null;
  let maskPath: string | null = null;
  
  try {
    const { image, message } = await req.json();
    
    if (!image) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }
    
    // Combine the prompt with Eid-specific instructions
    const enhancedPrompt = `Create an Eid greeting card that preserves the person's identity exactly.

CRITICAL INSTRUCTIONS:
1. ADD LARGE, BOLD "EID MUBARAK!" TEXT at the top or bottom of the image in beautiful gold/metallic lettering
2. The text must be very prominent and easy to read - make it stand out
3. Add decorative Islamic patterns, gold crescent moons, and stars around the borders
4. Keep the central person completely unchanged - preserve all facial features and identity

The "EID MUBARAK!" text should be the most eye-catching element after the person.
${message ? `Also add this message in elegant text: "${message}"` : ''}`;
    
    // Extract the base64 data
    let base64Data = image;
    if (image.includes(';base64,')) {
      base64Data = image.split(';base64,')[1];
    }
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Process with sharp to convert to PNG and optimize size
    // Ensure we convert to RGBA format (with alpha channel) as required by OpenAI
    try {
      const pngBuffer = await sharp(imageBuffer)
        .ensureAlpha() // Add alpha channel to ensure RGBA format
        .toFormat('png') // Explicitly set the output format to PNG
        .png({ quality: 90, compressionLevel: 6 }) // Higher quality PNG with moderate compression
        .resize(1024, 1024, { // Resize to fit OpenAI's requirements
          fit: 'inside',
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3 // Better quality resizing algorithm
        })
        .toBuffer();
      
      // Check if the processed image is still too large
      if (pngBuffer.length > MAX_IMAGE_SIZE) {
        throw new Error(`Image is too large (${Math.round(pngBuffer.length / 1024 / 1024)}MB). Must be under 4MB.`);
      }
      
      // Save the buffer to a temporary file
      tempFilePath = path.join(os.tmpdir(), `image-${Date.now()}.png`);
      fs.writeFileSync(tempFilePath, pngBuffer);
      
      // Create mask for OpenAI API
      maskPath = await createTextMask();
      
      // Generate image using OpenAI
      console.log('Sending image to OpenAI with focus on adding prominent text');
      console.log('Using large editable areas in mask for better text placement');
      
      try {
        const aiResponse = await openai.images.edit({
          image: fs.createReadStream(tempFilePath),
          mask: fs.createReadStream(maskPath),
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'url',
        });
        
        const imageUrl = aiResponse.data[0]?.url || '';
        console.log('Received response from OpenAI:', imageUrl.substring(0, 50) + '...');
        return NextResponse.json({ image: imageUrl });
      } catch (apiError: any) {
        // If we encounter an image format error, try once more with a different approach
        if (apiError.message && apiError.message.includes("Invalid input image")) {
          console.log("Attempting image format correction...");
          
          // Create a new image with white background and place the original image on top
          // This ensures we have the correct RGBA format
          const correctedBuffer = await sharp({
            create: {
              width: 1024,
              height: 1024,
              channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
          })
          .composite([{ 
            input: pngBuffer, 
            gravity: 'center',
            blend: 'over' // Ensure proper alpha blending
          }])
          .png({ quality: 90, compressionLevel: 6 }) // Match quality settings from above
          .toBuffer();
          
          // Save the corrected buffer to a new temporary file
          correctedTempFilePath = path.join(os.tmpdir(), `image-corrected-${Date.now()}.png`);
          fs.writeFileSync(correctedTempFilePath, correctedBuffer);
          
          // Try again with the corrected image
          console.log('Attempting second try with corrected image format...');
          const secondAttemptResponse = await openai.images.edit({
            image: fs.createReadStream(correctedTempFilePath),
            mask: fs.createReadStream(maskPath),
            prompt: enhancedPrompt,
            n: 1,
            size: '1024x1024',
            response_format: 'url',
          });
          
          const secondImageUrl = secondAttemptResponse.data[0]?.url || '';
          console.log('Received second attempt response:', secondImageUrl.substring(0, 50) + '...');
          return NextResponse.json({ image: secondImageUrl });
        }
        
        // If it's not a format error, provide a better error message
        let errorMessage = apiError.message || 'Failed to generate image';
        
        if (errorMessage.includes('format') || errorMessage.includes('Invalid input')) {
          errorMessage = 'The image format is not supported. Please try a different image with a clear face.';
        } else if (errorMessage.includes('content policy')) {
          errorMessage = 'The image may contain inappropriate content. Please try a different image.';
        }
        
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
    } catch (processingError: any) {
      console.error('Error processing image:', processingError);
      let errorMessage = 'Failed to process the image. Please ensure it is a valid image file.';
      
      if (processingError.message && processingError.message.includes('too large')) {
        errorMessage = `Image is too large. Maximum size is 4MB.`;
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  } finally {
    // Clean up any temporary files
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error('Error deleting temporary file:', err);
      }
    }
    
    if (correctedTempFilePath && fs.existsSync(correctedTempFilePath)) {
      try {
        fs.unlinkSync(correctedTempFilePath);
      } catch (err) {
        console.error('Error deleting corrected temporary file:', err);
      }
    }
    
    if (maskPath && fs.existsSync(maskPath)) {
      try {
        fs.unlinkSync(maskPath);
      } catch (err) {
        console.error('Error deleting mask file:', err);
      }
    }
  }
} 