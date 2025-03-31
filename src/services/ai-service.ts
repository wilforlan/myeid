/**
 * AI service for generating Eid images and messages
 * This service uses backend API routes to interact with OpenAI and Stability AI
 */

// Image generator providers
export type AIProvider = 'openai' | 'stability' | 'combined';

/**
 * Generate an AI image based on a source image and custom prompt
 */
export async function generateEidImage(
  base64Image: string,
  message: string,
  provider: AIProvider = 'stability'
): Promise<string | null> {
  try {
    // Choose the API endpoint based on the provider
    let endpoint;
    switch(provider) {
      case 'stability':
        endpoint = '/api/stability/generate';
        break;
      case 'openai':
        endpoint = '/api/generate';
        break;
      case 'combined':
        endpoint = '/api/combined-generate';
        break;
      default:
        endpoint = '/api/stability/generate';
    }
    
    console.log(`Using ${provider} API for image generation`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || response.statusText;
      
      console.error(`${provider.toUpperCase()} API Error:`, errorMessage);
      
      // Provide specific error messages based on common error patterns
      if (errorMessage.includes('too large') || errorMessage.includes('size')) {
        const maxSize = provider === 'stability' ? '10MB' : '4MB';
        throw new Error(`Image is too large. Please use a smaller image (maximum ${maxSize}).`);
      } else if (errorMessage.includes('API key')) {
        throw new Error(`${provider.toUpperCase()} API key error. Please contact support for assistance.`);
      } else if (errorMessage.includes('format') || errorMessage.includes('not supported') || errorMessage.includes('Invalid input image')) {
        throw new Error('Image format is not supported. Please use a JPEG or PNG image with a clear face photo.');
      } else if (errorMessage.includes('content policy')) {
        throw new Error('Image may contain inappropriate content. Please try a different image that clearly shows a face.');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        throw new Error('We have reached our API rate limits. Please try again in a few minutes.');
      } else if (response.status === 429) {
        throw new Error('Too many requests. Please try again in a few minutes.');
      } else if (response.status === 500) {
        throw new Error('Server error. Our team has been notified and is working on it. Please try again later.');
      }
      
      throw new Error(`Failed to generate image: ${errorMessage}`);
    }

    const data = await response.json();
    return data.image;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error generating image:', error.message);
      throw error; // Rethrow the error to be handled by the caller
    } else {
      console.error('Unknown error generating image:', error);
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }
}

/**
 * Fetch an image from base64 and convert to blob
 */
async function fetchImageAsBlob(base64Image: string): Promise<File> {
  const response = await fetch(base64Image);
  const blob = await response.blob();
  return new File([blob], 'image.png', { type: 'image/png' });
}

/**
 * Generate personalized Eid messages
 */
export async function generateEidMessages(
  name?: string
): Promise<string[]> {
  const defaultMessages = [
    `Eid Mubarak! May this special day bring peace, happiness, and prosperity to your life.`,
    `Wishing you a joyous Eid! May the blessings of Allah fill your life with happiness and success.`,
    `Happy Eid! May Allah accept your good deeds, forgive your transgressions and ease the suffering of all people around the globe.`,
    `Eid Mubarak! May this Eid bring joy, health and wealth to you and your family.`,
    `Sending Eid wishes! May your faith bring you peace and prosperity on this special day.`
  ];
  
  try {
    // Call our backend API instead of OpenAI directly
    const response = await fetch('/api/openai/generate-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    
    if (!response.ok) {
      const errorMessage = await response.text();
      console.error('Error generating messages:', errorMessage);
      return defaultMessages;
    }
    
    const data = await response.json();
    return data.messages || defaultMessages;
  } catch (error) {
    console.error('Error generating messages:', error);
    return defaultMessages;
  }
} 