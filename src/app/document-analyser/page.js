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
  MessageCirclePlus,
  Copy,
  Check,
  MessageCircleQuestion
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, database } from '../../../firebase-config';
import { ref, push, onValue, remove, get, set, update } from 'firebase/database';
import { useRouter } from 'next/navigation';
import Lottie from 'lottie-react';

// Legal Glossary for term highlighting
const legalGlossary = {
  "contract": {
    definition: "A legally binding agreement between two or more parties"
  },
  "liability": {
    definition: "Legal responsibility for damages or harm"
  },
  "jurisdiction": {
    definition: "The authority of a court to hear and decide cases"
  },
  "plaintiff": {
    definition: "The party who brings a case against another in a court of law"
  },
  "defendant": {
    definition: "The party being sued or accused in a court of law"
  },
  "statute": {
    definition: "A written law passed by a legislative body"
  },
  "precedent": {
    definition: "A legal decision that serves as an example for future cases"
  },
  "tort": {
    definition: "A wrongful act that causes harm to another person"
  },
  "negligence": {
    definition: "Failure to exercise reasonable care, resulting in harm"
  },
  "damages": {
    definition: "Money awarded to compensate for loss or injury"
  }
};

// Enhanced Markdown Renderer with Legal Term Highlighting
const MarkdownRenderer = ({ content, darkMode, glossaryTerms = legalGlossary }) => {
  const [copiedCode, setCopiedCode] = useState(null);
  const [hoveredTerm, setHoveredTerm] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const highlightLegalTerms = (text) => {
    let highlightedText = text;
    
    Object.keys(glossaryTerms).forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, 
        `<span class="legal-term cursor-help border-b border-dotted border-blue-500 text-blue-600 hover:bg-blue-50" data-term="${term}">$&</span>`
      );
    });
    
    return highlightedText;
  };

  const formatMarkdown = (text) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let codeBlockId = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      parts.push({
        type: 'codeblock',
        language: match[1] || 'text',
        content: match[2].trim(),
        id: `code-${codeBlockId++}`
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts.map((part, index) => {
      if (part.type === 'codeblock') {
        return (
          <div key={index} className={`my-4 rounded-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className={`flex justify-between items-center px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} border-b`}>
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {part.language}
              </span>
              <button
                onClick={() => copyToClipboard(part.content, part.id)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${darkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
              >
                {copiedCode === part.id ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className={`p-4 overflow-x-auto text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              <code>{part.content}</code>
            </pre>
          </div>
        );
      } else {
        return (
          <div 
            key={index} 
            dangerouslySetInnerHTML={{ 
              __html: formatTextMarkdown(highlightLegalTerms(part.content), darkMode) 
            }}
            onMouseOver={(e) => {
              if (e.target.classList.contains('legal-term')) {
                const term = e.target.getAttribute('data-term');
                setHoveredTerm(term);
                const rect = e.target.getBoundingClientRect();
                setTooltipPosition({
                  x: rect.left + window.scrollX,
                  y: rect.top + window.scrollY - 60
                });
              }
            }}
            onMouseOut={(e) => {
              if (e.target.classList.contains('legal-term')) {
                setHoveredTerm(null);
              }
            }}
          />
        );
      }
    });
  };

  const formatTextMarkdown = (text, darkMode) => {
    return text
      .replace(/^### (.*$)/gm, `<h3 class="text-lg font-semibold mt-4 mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}"">$1</h3>`)
      .replace(/^## (.*$)/gm, `<h2 class="text-xl font-semibold mt-4 mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}">$1</h2>`)
      .replace(/^# (.*$)/gm, `<h1 class="text-2xl font-bold mt-4 mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}">$1</h1>`)
      .replace(/\*\*(.*?)\*\*/g, `<strong class="${darkMode ? 'text-white' : 'text-gray-900'}">$1</strong>`)
      .replace(/\*(.*?)\*/g, `<em class="${darkMode ? 'text-gray-200' : 'text-gray-700'}">$1</em>`)
      .replace(/`([^`]+)`/g, `<code class="px-1 py-0.5 rounded text-sm ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'} font-mono">$1</code>`)
      .replace(/^\* (.*$)/gm, `<li class="ml-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}">• $1</li>`)
      .replace(/^- (.*$)/gm, `<li class="ml-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}">• $1</li>`)
      .replace(/^\d+\. (.*$)/gm, (match, content, offset, string) => {
        const lines = string.slice(0, offset).split('\n');
        const currentLineIndex = lines.length - 1;
        const currentLine = lines[currentLineIndex];
        const number = currentLine.match(/^(\d+)\./)?.[1] || '1';
        return `<li class="ml-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}" style="list-style-type: decimal; margin-left: 1.5rem;">${content}</li>`;
      })
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" class="text-blue-500 hover:text-blue-600 underline" target="_blank" rel="noopener noreferrer">$1</a>`)
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/(<li[^>]*>.*?<\/li>(?:\s*<li[^>]*>.*?<\/li>)*)/gs, '<ul class="my-2 space-y-1">$1</ul>');
  };

  return (
    <div className="prose prose-sm max-w-none relative">
      {formatMarkdown(content)}
      
      {/* Glossary tooltip */}
      {hoveredTerm && glossaryTerms[hoveredTerm] && (
        <div 
          className="fixed z-50 p-3 bg-black text-white text-sm rounded-lg shadow-lg max-w-xs pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`
          }}
        >
          <div className="font-semibold">{hoveredTerm}</div>
          <div className="mt-1">{glossaryTerms[hoveredTerm].definition}</div>
        </div>
      )}
    </div>
  );
};

// Document Analysis Modal Component
const DocumentAnalysisModal = ({ isOpen, onClose, analysis, darkMode }) => {
  if (!isOpen || !analysis) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`max-w-2xl w-full mx-4 p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} max-h-96 overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Document Analysis: {analysis.filename}
          </h3>
          <button
            onClick={onClose}
            className={`text-gray-500 hover:text-gray-700 ${darkMode ? 'hover:text-gray-300' : ''}`}
          >
            ×
          </button>
        </div>
        <div className={`space-y-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          <div>
            <h4 className="font-medium mb-2">Summary:</h4>
            <p>{analysis.summary}</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Key Points:</h4>
            <ul className="list-disc list-inside space-y-1">
              {analysis.keyPoints?.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [documentAnalysis, setDocumentAnalysis] = useState(null);
  const [showQA, setShowQA] = useState(false);

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

  // Helper Functions
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
    if (!database || !user) return;
    
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
      // Strip markdown for speech
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'code block')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,6}\s+(.*)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/<[^>]*>/g, '')
        .replace(/&[^;]+;/g, '');
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
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

      const response = await fetch('https://document-parser-backend-nywv.onrender.com/chat', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.error("Backend error:", errorData);
          errorMessage += `, message: ${errorData.detail || errorData.message || 'Unknown error'}`;
        } catch (parseError) {
          console.error("Could not parse error response:", parseError);
          errorMessage += ', message: Could not parse error response';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Check if document analysis is included
      if (data.document_analysis) {
        setDocumentAnalysis({
          filename: uploadedFile?.name || 'Document',
          summary: data.document_analysis.summary,
          keyPoints: data.document_analysis.key_points || []
        });
      }

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
      
      let userFriendlyMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error.message.includes('Failed to fetch')) {
        userFriendlyMessage = 'Cannot connect to the server. Please check if the backend is running.';
      } else if (error.message.includes('File size exceeds')) {
        userFriendlyMessage = 'File is too large. Please upload a file smaller than 10MB.';
      } else if (error.message.includes('Unsupported file type')) {
        userFriendlyMessage = 'Unsupported file type. Please upload PDF, DOCX, or image files.';
      } else if (error.message.includes('AI service error')) {
        userFriendlyMessage = 'AI service is temporarily unavailable. Please try again.';
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: userFriendlyMessage,
        timestamp: new Date().toISOString()
      };
      
      setMessages([...newMessages, errorMessage]);
      setError(error.message);
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

      {/* Document Analysis Modal */}
      <DocumentAnalysisModal 
        isOpen={showQA}
        onClose={() => setShowQA(false)}
        analysis={documentAnalysis}
        darkMode={darkMode}
      />

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full ${showSidebar ? 'w-64' : 'w-18'} transition-all duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-500'} border-r flex flex-col z-40`}>
        {/* Sidebar Header */}
        <div className="p-4 border-gray-200">
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
          <div className={`w-full flex items-center space-x-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
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
                        ? darkMode ? 'bg-[#CBE5F6]' : 'bg-[#D2E5F0]'
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

        {/* Dark Mode Toggle */}
        <div className="p-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center space-x-2 p-3 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
          >
            {darkMode ? (
              <Sun className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
            ) : (
              <Moon className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
            )}
            {showSidebar && (
              <span className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>
        </div>

        {/* Bottom Sign Out - Inside Sidebar */}
        <div className="p-4 mt-auto">
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center space-x-2 p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-red-400 hover:bg-gray-600' : 'bg-gray-100 text-red-500 hover:bg-gray-200'} transition-colors`}
          >
            <LogOut className="h-4 w-4" />
            {showSidebar && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Fixed Top Header */}
      <div className={`fixed top-0 right-0 left-0 transition-all duration-300 ${showSidebar ? 'ml-64' : 'ml-18'} z-30`}>
        <div className={`p-2 px-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex items-center justify-between`}
          style={{
            backgroundImage: "url(/chatbot-bg.png)",
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div>
            <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-[#1E8DD0]'}`}>
              AI Assistant
            </h1>
            {temporaryMode && (
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Temporary mode - messages won&apos;t be saved
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Settings button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
            >
              {darkMode ? (
                <Sun className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
              ) : (
                <Moon className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
              )}
            </button>
            <button
              onClick={handleSignOut}
              className={`flex items-center space-x-2 p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-red-400 hover:bg-gray-600' : 'bg-gray-100 text-red-500 hover:bg-gray-200'} transition-colors`}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area - Now properly positioned */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${showSidebar ? 'ml-64' : 'ml-18'} pb-16 pt-14`}>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4"
          style={{
            backgroundImage: "url(/chatbot-bg.png)",
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
              bg-gradient-to-r from-[#62D5DE] to-[#1E8DD0]`}>
                Confused by Legal Jargon?
              </h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Let our AI break it down – upload a file and understand it in seconds
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-2xl px-4 py-3 mb-5 font-sans rounded-2xl ${message.type === 'user'
                  ? 'bg-[#37A6D5] text-white'
                  : darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 border border-[#37A6D5]'
                }`}>
                <div className="flex items-start space-x-2">
                  {message.type === 'bot' && (
                    <Bot className="h-5 w-5 mt-0.5 flex-shrink-0 text-[#3088ae]" />
                  )}
                  <div className="flex-1">
                    {message.file && (
                      <div className={`mb-2 p-2 rounded-lg ${message.type === 'user' ? 'bg-[#F3F4F6] text-black' : 'bg-gray-600'} flex items-center space-x-2`}>
                        {message.file.type.startsWith('image/') ? (
                          <Image className="h-4 w-4" />
                        ) : (
                          <File className="h-4 w-4" />
                        )}
                        <span className="text-sm truncate">{message.file.name}</span>
                        {documentAnalysis && message.file.name === documentAnalysis.filename && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            Analyzed
                          </span>
                        )}
                      </div>
                    )}
                    {message.type === 'bot' ? (
                      <MarkdownRenderer 
                        content={message.content} 
                        darkMode={darkMode}
                        glossaryTerms={legalGlossary}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    {message.type === 'bot' && (
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => isSpeaking ? stopSpeaking() : speakText(message.content)}
                          className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                        >
                          {isSpeaking ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </button>
                        {documentAnalysis && (
                          <button
                            onClick={() => setShowQA(true)}
                            className={`p-1 rounded text-blue-600 hover:text-blue-800 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                          >
                            <MessageCircleQuestion className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
      </div>

      {/* Fixed Input Area */}
      <div className={`fixed bottom-0 right-0 left-0 transition-all duration-300 ${showSidebar ? 'ml-64' : 'ml-18'} z-30`}>
        <div className={`p-2 px-4 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
          style={{
            backgroundImage: "url(/chatbot-bg.png)",
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

          <div className="flex items-center space-x-3 w-full">
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
              className={` flex-1 px-4 py-3 rounded-2xl border resize-none ${darkMode
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