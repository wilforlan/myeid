"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import { 
  Download, 
  Loader2, 
  RefreshCw, 
  MessageSquare,
} from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { resizeImage } from "@/utils/image-utils";
import { generateEidImage, generateEidMessages, AIProvider } from "@/services/ai-service";
import { 
  FacebookShareButton, 
  TwitterShareButton, 
  WhatsappShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon
} from "react-share";
import MessageSelector from '@/components/MessageSelector';

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [provider] = useState<AIProvider>("stability");

  // Generate Eid messages on initial load
  useEffect(() => {
    async function loadMessages() {
      const generatedMessages = await generateEidMessages();
      setMessages(generatedMessages);
      setSelectedMessage(generatedMessages[0] || "");
    }
    loadMessages();
  }, []);

  // Handle image selection from upload
  const handleImageSelected = async (base64: string, file: File) => {
    try {
      // Resize the image to appropriate dimensions for AI processing
      const resizedImage = await resizeImage(base64);
      setOriginalImage(resizedImage);
      
      // Reset generated image when new image is uploaded
      setGeneratedImage(null);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process the image. Please try again.");
    }
  };

  // Generate the AI Eid greeting
  const handleGenerateImage = async () => {
    if (!originalImage) {
      toast.error("Please upload an image first");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateEidImage(originalImage, selectedMessage, provider);
      
      if (result) {
        setGeneratedImage(result);
        toast.success("Eid greeting created!");
      } else {
        toast.error("Failed to generate image. Please try again.");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      
      // Display more specific error messages based on what was thrown from the service
      if (error instanceof Error) {
        toast.error(error.message, {
          duration: 5000, // Show longer for detailed error messages
          style: {
            maxWidth: '500px',
          }
        });
      } else {
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate new Eid messages based on name
  const handleRegenerateMessages = async () => {
    toast.promise(
      generateEidMessages(userName || undefined).then(newMessages => {
        setMessages(newMessages);
        setSelectedMessage(newMessages[0] || "");
      }),
      {
        loading: 'Generating messages...',
        success: 'New Eid messages created!',
        error: 'Failed to create messages'
      }
    );
  };

  // Download the generated image
  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = "eid-greeting.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Toggle message selection modal
  const toggleMessageModal = () => {
    setIsMessageModalOpen(!isMessageModalOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-gray-100">
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: 'white',
            color: '#2D3748',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        }}
      />
      
      {/* Header with animated gradient */}
      <header className="py-8">
        <div className="eid-container">
          <div className="text-center animate-fadeIn">
            <div className="inline-block eid-gradient p-1 rounded-xl mb-6">
              <div className="bg-white px-6 py-3 rounded-lg">
                <h1 className="text-4xl font-bold text-primary mb-1">
                  Eid Greeting Creator
                </h1>
              </div>
            </div>
            <p className="text-muted max-w-xl mx-auto animate-slideUp">
              Upload your photo and create a beautiful AI-generated Eid greeting to share with family and friends
            </p>
          </div>
        </div>
      </header>
      
      <main className="eid-container pb-16 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left side - Image upload & Generation */}
          <div className="flex-1 space-y-6">
            {/* Upload section */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center mr-2 text-sm">1</span>
                Upload Your Photo
              </h2>
              <ImageUpload onImageSelected={handleImageSelected} />
            </div>
            
            {/* Personalization section */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="bg-secondary text-white w-7 h-7 rounded-full flex items-center justify-center mr-2 text-sm">2</span>
                Personalize Your Message
              </h2>
              <div className="space-y-4">
                {/* Name input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="input"
                  />
                </div>
                
                {/* Message selection */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-foreground">
                      Greeting Message
                    </label>
                    <button 
                      onClick={handleRegenerateMessages}
                      className="text-sm text-primary flex items-center gap-1 hover:text-primary-hover transition-colors duration-200"
                    >
                      <RefreshCw className="h-3 w-3" /> 
                      Regenerate
                    </button>
                  </div>
                  
                  <div 
                    className="relative p-4 border border-border rounded-md min-h-[80px] cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-sm"
                    onClick={toggleMessageModal}
                  >
                    <p className="text-foreground">{selectedMessage}</p>
                    <MessageSquare className="absolute bottom-2 right-2 h-5 w-5 text-muted" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Generate button */}
            <button
              onClick={handleGenerateImage}
              disabled={!originalImage || isGenerating}
              className={`btn btn-hover-effect w-full py-3 flex items-center justify-center gap-2 ${
                !originalImage || isGenerating 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'btn-primary'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating Your Eid Greeting...
                </>
              ) : (
                <>
                  <span className="relative z-10">Create Eid Greeting</span>
                </>
              )}
            </button>
          </div>
          
          {/* Right side - Generated image & Sharing */}
          <div className="flex-1 space-y-6">
            {/* Preview section */}
            <div className="card p-6 relative min-h-[400px] flex items-center justify-center">
              <h2 className="absolute top-4 left-6 text-xl font-semibold flex items-center">
                <span className="bg-accent text-white w-7 h-7 rounded-full flex items-center justify-center mr-2 text-sm">3</span>
                Your Eid Greeting
              </h2>
              
              <div className="w-full pt-12">
                {generatedImage ? (
                  <div className="transition-all duration-300 transform hover:scale-[1.02]">
                    <img
                      src={generatedImage}
                      alt="Generated Eid Greeting"
                      className="w-full h-auto rounded-lg shadow-md"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full bg-primary-hover opacity-20 animate-ping absolute"></div>
                          <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
                        </div>
                        <p className="text-muted max-w-xs">Creating your personalized Eid greeting with AI magic...</p>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border rounded-xl p-8 w-full">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-gray-50 rounded-full">
                            <img 
                              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjEgMTZ2LTJhNCA0IDAgMDAtNC00aC0zLjVsMS4xLTIuMkEzIDMgMCAwMDEyICgzSDE5YTIgMiAwIDAxMiAydjFoLTcuNWwxLjEtMi4yQTMgMyAwIDAwMTIgM0g4YTIgMiAwIDAwLTIgMnY3bDQtM3YzaDJWN2EyIDIgMCAwMC0yLTJINWEyIDIgMCAwMC0yIDJ2MTNhMiAyIDAgMDAyIDJoMTRhMiAyIDAgMDAyLTJ6IiBmaWxsPSIjMEM4MzQ2Ii8+PC9zdmc+" 
                              alt="Upload" 
                              className="w-16 h-16"
                            />
                          </div>
                          <p className="text-foreground font-medium">Your Eid greeting will appear here</p>
                          <p className="text-muted text-sm">Upload a photo and click "Create" to get started</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Share section */}
            {generatedImage && (
              <div className="card p-6 animate-slideUp">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="bg-success text-white w-7 h-7 rounded-full flex items-center justify-center mr-2 text-sm">4</span>
                  Share Your Greeting
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 btn btn-outline transition-all"
                  >
                    <Download className="h-5 w-5" />
                    Download
                  </button>
                  
                  <div className="flex justify-around items-center bg-gray-50 p-4 rounded-lg">
                    <div className="transform transition-transform hover:scale-110">
                      <FacebookShareButton 
                        url={generatedImage || ""} 
                        hashtag="#EidMubarak"
                      >
                        <FacebookIcon size={40} round />
                      </FacebookShareButton>
                    </div>
                    
                    <div className="transform transition-transform hover:scale-110">
                      <TwitterShareButton url={generatedImage || ""} title={selectedMessage}>
                        <TwitterIcon size={40} round />
                      </TwitterShareButton>
                    </div>
                    
                    <div className="transform transition-transform hover:scale-110">
                      <WhatsappShareButton url={generatedImage || ""} title={selectedMessage}>
                        <WhatsappIcon size={40} round />
                      </WhatsappShareButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Message selection modal */}
      {isMessageModalOpen && (
        <MessageSelector
          messages={messages}
          selectedMessage={selectedMessage}
          onSelect={setSelectedMessage}
          onClose={toggleMessageModal}
        />
      )}
      
      {/* Footer */}
      <footer className="py-8 text-center text-muted text-sm eid-gradient">
        <div className="bg-white/80 backdrop-blur-md py-4">
          <p>Created with ❤️ for Eid celebrations</p>
          <p className="mt-1">© {new Date().getFullYear()} My Eid App</p>
        </div>
      </footer>
    </div>
  );
}
