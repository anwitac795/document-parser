from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import google.generativeai as genai
import PyPDF2
import docx
from PIL import Image
import io
import json
import os
from typing import Optional, List, Dict
import tempfile
import base64
import asyncio
import time  # Add this import for synchronous sleep
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="AI ChatBot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini AI
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

# In-memory storage for temporary chats (in production, use Redis or similar)
temporary_chats = {}

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        return f"Error extracting PDF text: {str(e)}"

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        with tempfile.NamedTemporaryFile() as tmp_file:
            tmp_file.write(file_content)
            tmp_file.flush()
            doc = docx.Document(tmp_file.name)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        return f"Error extracting DOCX text: {str(e)}"

def process_image(file_content: bytes, file_type: str) -> str:
    """Process image and extract information using Gemini Vision"""
    try:
        image = Image.open(io.BytesIO(file_content))
        
        # Create temporary file for Gemini upload
        with tempfile.NamedTemporaryFile(suffix=f".{file_type.split('/')[-1]}", delete=False) as tmp_file:
            image.save(tmp_file.name, format=image.format or 'PNG')
            tmp_file.flush()
            
            # Upload to Gemini
            uploaded_file = genai.upload_file(tmp_file.name)
            response = model.generate_content([
                "Analyze this image and describe what you see in detail. If there's any text in the image, please transcribe it as well. Be comprehensive but concise.",
                uploaded_file
            ])
            
            # Clean up temporary file
            os.unlink(tmp_file.name)
            
            # Clean up uploaded file from Gemini
            genai.delete_file(uploaded_file.name)
            
            return response.text
            
    except Exception as e:
        return f"Error processing image: {str(e)}"

def build_context_prompt(context: List[Dict], current_message: str) -> str:
    """Build conversation context for better responses"""
    if not context:
        return current_message
    
    context_str = "Previous conversation context:\n"
    for msg in context[-5:]:  # Only use last 5 messages for context
        role = "User" if msg["role"] == "user" else "Assistant"
        context_str += f"{role}: {msg['content']}\n"
    
    context_str += f"\nCurrent message: {current_message}"
    context_str += "\n\nPlease respond to the current message while being aware of the conversation context."
    return context_str

def get_ai_response(prompt: str, max_retries: int = 3) -> str:
    """Get response from Gemini AI with retry logic"""
    for attempt in range(max_retries):
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    candidate_count=1,
                    max_output_tokens=2048,
                    temperature=0.7,
                )
            )
            return response.text
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(1)  # Use time.sleep instead of asyncio.sleep for synchronous function

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "AI ChatBot API is running", "timestamp": datetime.now().isoformat()}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        # Test Gemini connection
        test_response = model.generate_content("Hello")
        gemini_status = "connected" if test_response else "disconnected"
    except:
        gemini_status = "disconnected"
    
    return {
        "status": "healthy",
        "gemini_ai": gemini_status,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/chat")
async def chat_endpoint(
    message: str = Form(...),
    temporaryMode: str = Form(...),
    userId: str = Form(...),
    context: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """Main chat endpoint"""
    try:
        is_temporary = temporaryMode.lower() == "true"
        file_content = ""
        
        # Validate inputs
        if not message.strip() and not file:
            raise HTTPException(status_code=400, detail="Message or file is required")
        
        if not userId:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        # Process uploaded file if present
        if file:
            # Check file size (10MB limit)
            file_bytes = await file.read()
            if len(file_bytes) > 10 * 1024 * 1024:
                return JSONResponse(
                    status_code=400,
                    content={"error": "File size exceeds 10MB limit"}
                )
            
            # Process different file types
            if file.content_type == "application/pdf":
                file_content = extract_text_from_pdf(file_bytes)
            elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                file_content = extract_text_from_docx(file_bytes)
            elif file.content_type.startswith("image/"):
                file_content = process_image(file_bytes, file.content_type)
            else:
                return JSONResponse(
                    status_code=400,
                    content={"error": f"Unsupported file type: {file.content_type}"}
                )
            
            # Check if file processing failed
            if file_content.startswith("Error"):
                return JSONResponse(
                    status_code=400,
                    content={"error": file_content}
                )
        
        # Build the complete message
        full_message = message.strip() if message else ""
        if file_content:
            if full_message:
                full_message += f"\n\nAttached file content:\n{file_content}"
            else:
                full_message = f"Please analyze this file content:\n{file_content}"
        
        # Add conversation context for non-temporary chats
        if not is_temporary and context:
            try:
                context_data = json.loads(context)
                full_message = build_context_prompt(context_data, full_message)
            except json.JSONDecodeError:
                # If context parsing fails, continue without context
                pass
        
        # For temporary mode, maintain session context in memory
        if is_temporary:
            if userId not in temporary_chats:
                temporary_chats[userId] = []
            
            # Add current message to temporary context
            temporary_chats[userId].append({
                "role": "user",
                "content": message,
                "timestamp": datetime.now().isoformat()
            })
            
            # Build context from temporary storage
            if len(temporary_chats[userId]) > 1:
                temp_context = [
                    {"role": msg["role"], "content": msg["content"]} 
                    for msg in temporary_chats[userId][-5:]  # Last 5 messages
                ]
                full_message = build_context_prompt(temp_context[:-1], full_message)
        
        # Get AI response
        try:
            ai_response = get_ai_response(full_message)
        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={"error": f"AI service error: {str(e)}"}
            )
        
        # Store AI response in temporary chat if needed
        if is_temporary and userId in temporary_chats:
            temporary_chats[userId].append({
                "role": "assistant",
                "content": ai_response,
                "timestamp": datetime.now().isoformat()
            })
            
            # Limit temporary chat history to prevent memory issues
            if len(temporary_chats[userId]) > 20:
                temporary_chats[userId] = temporary_chats[userId][-10:]
        
        return JSONResponse(
            status_code=200,
            content={
                "response": ai_response,
                "timestamp": datetime.now().isoformat(),
                "temporary_mode": is_temporary,
                "file_processed": bool(file_content)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Internal server error: {str(e)}"}
        )

@app.delete("/chat/temporary/{user_id}")
async def clear_temporary_chat(user_id: str):
    """Clear temporary chat history for a user"""
    if user_id in temporary_chats:
        del temporary_chats[user_id]
        return {"message": "Temporary chat cleared", "user_id": user_id}
    else:
        return {"message": "No temporary chat found", "user_id": user_id}

@app.get("/chat/temporary/{user_id}")
async def get_temporary_chat(user_id: str):
    """Get temporary chat history for a user"""
    if user_id in temporary_chats:
        return {
            "messages": temporary_chats[user_id],
            "user_id": user_id,
            "message_count": len(temporary_chats[user_id])
        }
    else:
        return {"messages": [], "user_id": user_id, "message_count": 0}

@app.post("/chat/generate-title")
async def generate_chat_title(
    messages: List[Dict] = None,
    user_id: str = Form(...),
    first_message: str = Form(...)
):
    """Generate a title for a chat session based on the first few messages"""
    try:
        if not first_message.strip():
            return {"title": "New Chat"}
        
        # Create a prompt to generate a concise title
        title_prompt = f"""
        Based on this conversation starter, generate a short, descriptive title (maximum 4-5 words):
        
        "{first_message[:200]}"
        
        Return only the title, nothing else.
        """
        
        title = get_ai_response(title_prompt)
        
        # Clean and limit the title
        title = title.strip().replace('"', '').replace("'", "")
        if len(title) > 50:
            title = title[:50] + "..."
        
        return {"title": title or "New Chat"}
        
    except Exception as e:
        return {"title": "New Chat"}

if __name__ == "__main__":
    import uvicorn
    
    # Check for required environment variables
    if not os.getenv("GOOGLE_API_KEY"):
        print("Warning: GOOGLE_API_KEY environment variable not set!")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)