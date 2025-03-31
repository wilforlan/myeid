import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { fileToBase64, validateImage } from '@/utils/image-utils';
import { Upload, X, Image as ImageIcon, Camera, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (base64: string, file: File) => void;
}

export default function ImageUpload({ onImageSelected }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: any[]) => {
    // Handle file rejections from react-dropzone
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === 'file-invalid-type') {
        setError('Invalid file type. Please upload a JPEG, PNG, or GIF image only.');
      } else if (rejection.errors[0].code === 'file-too-large') {
        setError(`File is too large. Please upload an image smaller than 5MB.`);
      } else {
        setError(rejection.errors[0].message);
      }
      return;
    }
    
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    const validationError = validateImage(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      const base64 = await fileToBase64(file);
      setPreview(base64);
      onImageSelected(base64, file);
    } catch (err) {
      setError('Failed to process the image. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onImageSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
  };

  return (
    <div className="w-full">
      <div 
        {...getRootProps()} 
        className={`relative overflow-hidden transition-all duration-300 ${
          !preview ? 'border-2 border-dashed rounded-lg p-6' : 'rounded-lg'
        } ${
          isDragActive ? 'border-primary bg-green-50' : 'border-border'
        } ${
          error ? 'border-error bg-red-50' : ''
        } cursor-pointer hover:shadow-md`}
      >
        <input {...getInputProps()} />
        
        {!preview ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-4 animate-fadeIn">
            <div className={`p-4 rounded-full ${isDragActive ? 'bg-green-100' : 'bg-gray-50'} transition-colors duration-300`}>
              <Upload className={`h-10 w-10 ${isDragActive ? 'text-primary' : 'text-muted'}`} />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                {isDragActive ? 'Drop your photo here' : 'Upload your photo'}
              </p>
              <p className="text-sm text-muted mt-1">
                Drag and drop your image here, or click to select
              </p>
              <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-100">
                <p className="text-xs text-blue-700 flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" /> 
                  <strong>For best results:</strong> Clear face photo, JPG/PNG format, under 5MB
                </p>
                <ul className="text-xs text-blue-700 mt-1 list-disc list-inside pl-1">
                  <li>Images should have a clear background</li>
                  <li>Photos with transparency work best</li>
                  <li>Single person photos recommended</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative animate-fadeIn">
            <div className="overflow-hidden rounded-lg">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-auto object-contain rounded-lg transition-transform duration-300 hover:scale-[1.02]"
              />
            </div>
            <button
              onClick={handleRemoveImage}
              className="absolute top-3 right-3 bg-black bg-opacity-60 backdrop-blur-sm rounded-full p-2 hover:bg-opacity-80 transition-all duration-200 transform hover:scale-105"
              aria-label="Remove image"
            >
              <X className="h-4 w-4 text-white" />
            </button>
            <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
              <div className="bg-black bg-opacity-30 text-white px-4 py-2 rounded-full backdrop-blur-sm">
                Click to change photo
              </div>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center backdrop-blur-sm animate-fadeIn">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-foreground">Processing image...</p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-error bg-red-50 p-2 rounded-md border border-red-100 animate-slideUp">
          <p className="flex items-center gap-1">
            <X className="h-4 w-4" /> {error}
          </p>
        </div>
      )}
    </div>
  );
} 