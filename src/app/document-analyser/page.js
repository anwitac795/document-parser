'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Upload,
  File,
  Image,
  Volume2,
  VolumeX,
  User,
  Bot,
  MessageSquare,
  Trash2,
  Moon,
  Sun,
  Settings,
  Save,
  Clock,
  LogOut,
  Menu,
  MessageCirclePlus
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, database } from '../../../firebase-config'; // Make sure this path is correct
import { ref, push, onValue, remove, get, set, update } from 'firebase/database';
import { useRouter } from 'next/navigation';
import Lottie from 'lottie-react';

export default function ChatBot() {
  const router = useRouter();
  
  // ALL HOOKS MUST BE AT THE TOP - NO CONDITIONAL LOGIC BEFORE HOOKS
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [temporaryMode, setTemporaryMode] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // ALL useEffect hooks must also be at the top
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!database) {
      setError('Firebase database not initialized. Check your configuration.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setError(null);
        if (!temporaryMode) {
          loadChatSessions(u.uid);
        }
        setLoading(false);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router, temporaryMode]);

  useEffect(() => {
    if (!mounted) return;
    scrollToBottom();
  }, [messages, mounted]);

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Fixed loadChatSessions function - moved inside component
  const loadChatSessions = async (userId) => {
    if (!database) {
      console.error('Database not initialized');
      return;
    }

    try {
      const sessionsRef = ref(database, `chats/${userId}`);
      const unsubscribe = onValue(sessionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const sessions = Object.entries(data).map(([id, session]) => {
            const messages = [];
            if (session.messages && typeof session.messages === 'object') {
              Object.values(session.messages).forEach(msg => {
                messages.push({
                  id: msg.id,
                  type: msg.type,
                  content: msg.content,
                  timestamp: msg.timestamp,
                  ...(msg.file && { file: msg.file })
                });
              });
            }
            
            return {
              id,
              title: session.title || 'New Chat',
              createdAt: session.createdAt,
              updatedAt: session.updatedAt,
              messages: messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            };
          }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          
          setChatSessions(sessions);
        } else {
          setChatSessions([]);
        }
      }, (error) => {
        console.error('Error loading chat sessions:', error);
        setError('Failed to load chat sessions');
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up chat sessions listener:', error);
      setError('Failed to initialize chat sessions');
    }
  };

  const createNewChat = async () => {
    if (temporaryMode) {
      setMessages([]);
      setCurrentSessionId(null);
      return;
    }

    if (!database || !user) {
      setError('Cannot create chat: user not authenticated or database not available');
      return;
    }

    setCurrentSessionId(null);
    setMessages([]);
    setError(null);
  };

  const loadChat = (sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages || []);
      setCurrentSessionId(sessionId);
    }
  };

  const deleteChat = async (sessionId) => {
    if (!database || !user) return;

    try {
      await remove(ref(database, `chats/${user.uid}/${sessionId}`));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      setError('Failed to delete chat');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];

      if (allowedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024) {
        setUploadedFile(file);
        setError(null);
      } else {
        setError('Invalid file type or file too large (max 10MB)');
      }
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const saveMessagesToFirebase = async (messagesToSave) => {
    try {
      let sessionId = currentSessionId;
      
      if (!sessionId) {
        const sessionsRef = ref(database, `chats/${user.uid}`);
        const newSessionRef = push(sessionsRef);
        sessionId = newSessionRef.key;
        setCurrentSessionId(sessionId);
      }

      const sessionRef = ref(database, `chats/${user.uid}/${sessionId}`);
      
      const messagesObject = {};
      messagesToSave.forEach((msg, index) => {
        messagesObject[index] = {
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp,
          ...(msg.file && { file: msg.file })
        };
      });

      const sessionData = {
        messages: messagesObject,
        title: messagesToSave[0]?.content?.substring(0, 50) || 'New Chat',
        updatedAt: new Date().toISOString(),
        ...(messagesToSave.length === 2 && { createdAt: new Date().toISOString() })
      };

      await set(sessionRef, sessionData);
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
      setError('Message sent but not saved to history');
    }
  };

  const speakText = (text) => {
    if (synthRef.current && !isSpeaking) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !uploadedFile) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputText || (uploadedFile ? `Uploaded file: ${uploadedFile.name}` : ''),
      file: uploadedFile ? {
        name: uploadedFile.name,
        type: uploadedFile.type,
        size: uploadedFile.size
      } : null,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setUploadedFile(null);
    setIsTyping(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('message', inputText || '');
      formData.append('temporaryMode', temporaryMode.toString());
      formData.append('userId', user.uid);

      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }

      if (!temporaryMode && messages.length > 0) {
        const lastFiveMessages = messages.slice(-5).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));
        formData.append('context', JSON.stringify(lastFiveMessages));
      }

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend error:", errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`);
      }

      const data = await response.json();

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...newMessages, botMessage];
      setMessages(updatedMessages);

      if (!temporaryMode && database && user) {
        await saveMessagesToFirebase(updatedMessages);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error. Please check if the backend server is running and try again.',
        timestamp: new Date().toISOString()
      };
      setMessages([...newMessages, errorMessage]);
      setError('Failed to send message. Check if backend is running.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
    }
  };

  // NOW we can have conditional returns AFTER all hooks
  if (!mounted) return null;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (

      <div className={`min-h-screen flex ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-100">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-white hover:text-gray-200">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-64' : 'w-18'} transition-all duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-500'} border-r flex flex-col`}
      >

        {/* Sidebar Header */}
        <div className="p-4  border-gray-200">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`w-full flex items-center space-x-2 p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Menu className={`h-6 w-6 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
            {showSidebar && (
              <span className={`font-bold font-sans ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                AI Assistant
              </span>
            )}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={createNewChat}
            className={`w-full flex items-center space-x-2 p-3 rounded-lg ${darkMode ? 'bg-[#1E8DD0] hover:bg-[#1E8DD0]' : 'bg-[#1E8DD0] hover:bg-[#43B3D8]'} text-white transition-colors`}
          >
            <MessageCirclePlus className="h-5 w-5" />
            {showSidebar && <span>New Chat</span>}
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="p-4">
          <div className={`w-full flex items-center  space-x-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <Clock className={`h-4 w-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
            {showSidebar && (
              <>
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Temporary
                </span>
                <button
                  onClick={() => setTemporaryMode(!temporaryMode)}
                  className={`w-8 h-4 rounded-full transition-colors ${temporaryMode ? 'bg-blue-500' : darkMode ? 'bg-gray-600' : 'bg-gray-300'} relative`}
                >
                  <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${temporaryMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chat Sessions */}
        {showSidebar && !temporaryMode && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatSessions.length === 0 ? (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-center py-4`}>
                No chat history yet
              </p>
            ) : (
              chatSessions.map((session) => (
                <div key={session.id} className="group relative">
                  <button
                    onClick={() => loadChat(session.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${currentSessionId === session.id
                        ? darkMode ? 'bg-blue-600' : 'bg-blue-100'
                        : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                  >
                    <div className={`font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {session.title}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteChat(session.id)}
                    className={`absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Bottom Controls */}
        <div className="fixed top-3 right-3 flex items-center space-x-3 z-50">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center space-x-2 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-yellow-500" />
            ) : (
              <Moon className="h-4 w-4 text-blue-500" />
            )}
            
          </button>

          <button
            onClick={handleSignOut}
            className={`w-full flex items-center space-x-2 p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-red-400' : 'bg-gray-100 text-red-500'}`}
          >
            <LogOut className="h-4 w-4" />
            <span className="w-18">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">


        {/* Header */}
        <div className={`p-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex items-center justify-between`}
          style={{
       backgroundImage: "url(/chatbot-bg.png)", // your image in public folder
       backgroundSize: '100% 100%',
       backgroundPosition: 'center',
       backgroundRepeat: 'no-repeat',
      }}
        >
          <div>
            <h1 className={`text-xl font-semibold ${darkMode ? 'text-gray-900' : 'text-[#1E8DD0]'}`}>
              AI Assistant
            </h1>
            {temporaryMode && (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Temporary mode - messages won't be saved
              </p>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{
       backgroundImage: "url(/chatbot-bg.png)", // your image in public folder
       backgroundSize: '100% 100%',
       backgroundPosition: 'center',
       backgroundRepeat: 'no-repeat',
      }}
        >

          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="flex justify-center items-center h-30 w-30 mx-auto">
                <Lottie
                  animationData={require("/public/assets/Gradient Loading.json")}
                  loop={true}
                  autoplay={true}
                  className="w-full h-full"
                />
              </div>
              
              <h3 className={`text-3xl font-extrabold mb-2 bg-clip-text text-transparent 
              bg-gradient-to-r from-[#62D5DE]  to-[#1E8DD0]`}>
                Confused by Legal Jargon?
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Let our AI break it down – upload a file and understand it in seconds
              </p>

            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-2xl px-4 py-3 font-sans rounded-2xl ${message.type === 'user'
                  ? 'bg-[#37A6D5] text-white'
                  : darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 border border-[#37A6D5]'
                }`}>
                <div className="flex items-start space-x-3">
                  {message.type === 'bot' && (
                    <Bot className="h-5 w-5 mt-0.5 flex-shrink-0 text-[#3088ae]" />
                  )}
                  <div className="flex-1">
                    {message.file && (
                      <div className={`mb-2 p-2 rounded-lg ${message.type === 'user' ? 'bg-blue-600' : 'bg-gray-600'} flex items-center space-x-2`}>
                        {message.file.type.startsWith('image/') ? (
                          <Image className="h-4 w-4" />
                        ) : (
                          <File className="h-4 w-4" />
                        )}
                        <span className="text-sm truncate">{message.file.name}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.type === 'bot' && (
                      <button
                        onClick={() => speakText(message.content)}
                        className={`mt-2 p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                      >
                        {isSpeaking ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className={`px-4 py-3 rounded-2xl flex items-center space-x-2 ${darkMode ? 'bg-gray-700' : 'bg-white border'}`}>
                <Bot className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
                <div className="flex space-x-1">
                  <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-white' : 'bg-gray-900'}`} style={{ animationDelay: '0ms' }} />
                  <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-white' : 'bg-gray-900'}`} style={{ animationDelay: '150ms' }} />
                  <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-white' : 'bg-gray-900'}`} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`p-4 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
          style={{
            backgroundImage: "url(/chatbot-bg.png)", // your image in public folder
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {uploadedFile && (
            <div className={`mb-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-between`}>
              <div className="flex items-center space-x-2">
                {uploadedFile.type.startsWith('image/') ? (
                  <Image className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
                ) : (
                  <File className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
                )}
                <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {uploadedFile.name}
                </span>
              </div>
              <button
                onClick={() => setUploadedFile(null)}
                className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center space-x-3 w-full"
            
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-full ${darkMode ? 'bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
            >
              <Upload className={`h-5 w-5 ${darkMode ? ' text-white' : 'text-gray-900'}`} />
            </button>

            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-3 rounded-full transition-colors ${isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : darkMode ? 'bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-900'
                }`}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className={`flex-1 px-4 py-3 rounded-2xl border resize-none ${darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-[#43B3D8]`}
              rows={1}
              style={{ maxHeight: '120px' }}
            />

            <button
              onClick={sendMessage}
              disabled={!inputText.trim() && !uploadedFile}
              className={`p-3 rounded-full transition-colors ${inputText.trim() || uploadedFile
                ? 'bg-[#43B3D8] hover:bg-[#37A6D5] text-white'
                : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
              }`}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.docx,image/*"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}