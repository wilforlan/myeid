/**
 * Converts a File object to a base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Resizes an image to the specified dimensions
 */
export const resizeImage = (
  base64Image: string,
  maxWidth = 512,
  maxHeight = 512
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Image;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      // Make sure the image is square (for Stable Diffusion)
      const size = Math.min(maxWidth, maxHeight);
      canvas.width = size;
      canvas.height = size;

      // Center the image in the square canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      
      // Draw the image centered
      const offsetX = (size - width) / 2;
      const offsetY = (size - height) / 2;
      ctx.drawImage(img, offsetX, offsetY, width, height);
      
      // Get the resized image as base64
      const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
      resolve(resizedBase64);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
  });
};

/**
 * Validates an image file (size and type)
 */
export const validateImage = (file: File): string | null => {
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return 'Please upload a valid image file (JPEG, PNG, or GIF only)';
  }
  
  // Check file size (max 5MB)
  const maxSizeInBytes = 5 * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return `Image size should be less than 5MB. Your image is ${(file.size / (1024 * 1024)).toFixed(2)}MB`;
  }
  
  return null; // No errors
}; 