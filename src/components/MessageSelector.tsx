import React, { useState } from 'react';
import { Check, X, Search, MessageSquare } from 'lucide-react';

interface MessageSelectorProps {
  messages: string[];
  selectedMessage: string;
  onSelect: (message: string) => void;
  onClose: () => void;
}

export default function MessageSelector({ 
  messages, 
  selectedMessage, 
  onSelect, 
  onClose 
}: MessageSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Filter messages based on search term
  const filteredMessages = searchTerm.trim() === '' 
    ? messages 
    : messages.filter(message => 
        message.toLowerCase().includes(searchTerm.toLowerCase())
      );
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-xl overflow-hidden max-w-md w-full max-h-[80vh] shadow-lg animate-slideUp" 
        style={{ animationDelay: '0.1s' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Select a Greeting
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted hover:bg-gray-50 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted" />
            </div>
            <input
              type="text"
              placeholder="Search for a greeting..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 bg-gray-50 border-transparent focus:bg-white"
            />
          </div>
        </div>
        
        {/* Messages List */}
        <div className="overflow-y-auto max-h-[50vh] p-2">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-gray-50 mb-3">
                <MessageSquare className="h-6 w-6 text-muted" />
              </div>
              <p className="text-foreground font-medium">No messages found</p>
              <p className="text-muted text-sm mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            filteredMessages.map((message, index) => (
              <div
                key={index}
                onClick={() => {
                  onSelect(message);
                  onClose();
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 relative ${
                  selectedMessage === message 
                    ? 'bg-green-50 border border-primary shadow-sm' 
                    : hoveredIndex === index 
                      ? 'bg-gray-50' 
                      : 'hover:bg-gray-50'
                }`}
              >
                <p className="text-foreground pr-6">{message}</p>
                {selectedMessage === message && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-outline mr-2"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
} 