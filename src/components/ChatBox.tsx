'use client';

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface Message {
  id: string;
  username: string;
  text: string;
  tier: string;
  timestamp: string;
}

export default function ChatBox({ 
    currentUser, 
    socket,
    myLocation // <-- 1. Add myLocation as a prop
  }: { 
    currentUser: any; 
    socket: Socket | null; 
    myLocation: { lat: number, lng: number }; // <-- 2. Define its type
  }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg].slice(-50)); // Keep only the last 50 messages to prevent lag
    };

    socket.on('receive_message', handleNewMessage);

    return () => {
      socket.off('receive_message', handleNewMessage);
    };
  }, [socket]);

  // Auto-scroll to bottom when a new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !currentUser) return;

    // Send the message AND your location to the backend
    socket.emit('send_message', {
      username: currentUser.username,
      text: inputText,
      tier: currentUser.membership_tier,
      lat: myLocation.lat, // <-- 3. Pass your exact latitude
      lng: myLocation.lng  // <-- 4. Pass your exact longitude
    });

    setInputText('');
  };

  return (
    <div className="absolute top-4 right-4 z-10 w-80 h-96 flex flex-col bg-black/80 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
      
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-3">
        <h3 className="text-pink-500 font-bold text-sm uppercase tracking-wider">Local Chat</h3>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-xs text-center italic mt-10">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className={`font-bold mr-2 ${msg.tier === 'elite' ? 'text-purple-400' : 'text-gray-300'}`}>
                {msg.username} {msg.tier === 'elite' && '✦'}
              </span>
              <span className="text-white break-words">{msg.text}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-700 bg-gray-900 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-black text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-pink-500"
        />
        <button 
          type="submit"
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Send
        </button>
      </form>

    </div>
  );
}