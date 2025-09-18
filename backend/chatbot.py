from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import google.generativeai as genai
from google.cloud import vision
import PyPDF2
import docx
from PIL import Image
import io
import json
import os
from typing import Optional, List, Dict
import base64
import asyncio
import time
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

# Initialize Google Vision Client (only if credentials are available)
vision_client = None
try:
    credentials_path = os.getenv("GOOGLE_CLOUD_CREDENTIALS_PATH")
    if credentials_path and os.path.exists(credentials_path):
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
        vision_client = vision.ImageAnnotatorClient()
except Exception as e:
    print(f"Warning: Google Vision API not available: {str(e)}")

# In-memory storage for temporary chats
temporary_chats = {}

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file using in-memory processing"""
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip() if text.strip() else "No text found in PDF"
    except Exception as e:
        return f"Error extracting PDF text: {str(e)}"

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file using in-memory processing"""
    try:
        # Use io.BytesIO to create an in-memory file-like object
        docx_file = io.BytesIO(file_content)
        doc = docx.Document(docx_file)
        text = ""
        for paragraph in doc.paragraphs:
            if paragraph.text:
                text += paragraph.text + "\n"
        return text.strip() if text.strip() else "No text found in document"
    except Exception as e:
        return f"Error extracting DOCX text: {str(e)}"

def extract_text_with_vision_ocr(file_content: bytes) -> str:
    """Extract text from image using Google Vision OCR"""
    if not vision_client:
        return "Google Vision API not available"
    
    try:
        # Create Vision API image object directly from bytes
        image = vision.Image(content=file_content)
        
        # Perform text detection
        response = vision_client.text_detection(image=image)
        
        if response.error.message:
            return f"Vision API error: {response.error.message}"
        
        texts = response.text_annotations
        if texts and len(texts) > 0:
            # The first text annotation contains all detected text
            extracted_text = texts[0].description
            return extracted_text.strip() if extracted_text else "No text found in image"
        else:
            return "No text found in image"
            
    except Exception as e:
        return f"Error extracting text with OCR: {str(e)}"

def process_image_with_gemini(file_content: bytes) -> str:
    """Process image with Gemini Vision API using in-memory approach"""
    try:
        # Convert bytes to PIL Image for validation and format handling
        image = Image.open(io.BytesIO(file_content))
        
        # Convert to RGB if necessary (for consistency)
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        # Save to in-memory buffer in a standard format
        img_buffer = io.BytesIO()
        image.save(img_buffer, format='JPEG', quality=90)
        img_buffer.seek(0)
        
        # Upload to Gemini from memory
        uploaded_file = genai.upload_file(img_buffer, mime_type="image/jpeg")
        
        # Generate response
        prompt = """Analyze this image comprehensively and provide:
1. A detailed description of what you see
2. Any text that appears in the image (transcribe it exactly)
3. The context and purpose of the image
4. Any notable visual elements, colors, or composition details

Please be thorough and accurate in your analysis."""

        response = model.generate_content([prompt, uploaded_file])
        
        # Clean up the uploaded file
        try:
            genai.delete_file(uploaded_file.name)
        except:
            pass  # Ignore cleanup errors
        
        return response.text if response.text else "No analysis available"
        
    except Exception as e:
        return f"Error processing image with Gemini: {str(e)}"

def process_image(file_content: bytes, file_type: str) -> str:
    """Process image with both OCR and Gemini Vision analysis (fully in-memory)"""
    try:
        # Validate image
        try:
            test_image = Image.open(io.BytesIO(file_content))
            test_image.verify()
        except Exception as e:
            return f"Invalid image file: {str(e)}"
        
        results = []
        
        # 1. Try OCR first if Vision API is available
        if vision_client:
            ocr_text = extract_text_with_vision_ocr(file_content)
            if ocr_text and not ocr_text.startswith("Error") and ocr_text != "No text found in image":
                results.append(f"TEXT EXTRACTED FROM IMAGE:\n{ocr_text}")
        
        # 2. Get Gemini visual analysis
        visual_analysis = process_image_with_gemini(file_content)
        if visual_analysis and not visual_analysis.startswith("Error"):
            results.append(f"VISUAL ANALYSIS:\n{visual_analysis}")
        
        if not results:
            return "Unable to process image - no analysis methods succeeded"
        
        return "\n\n".join(results)
        
    except Exception as e:
        return f"Error processing image: {str(e)}"

def build_context_prompt(context: List[Dict], current_message: str) -> str:
    """Build conversation context for better responses"""
    if not context:
        return current_message
    
    context_str = "Previous conversation context:\n"
    for msg in context[-5:]:  # Only use last 5 messages for context
        role = "User" if msg["role"] == "user" else "Assistant"
        content = msg.get('content', '')[:200]  # Limit context length
        context_str += f"{role}: {content}\n"
    
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
            return response.text if response.text else "No response generated"
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(2 ** attempt)  # Exponential backoff

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
    except Exception as e:
        gemini_status = f"disconnected: {str(e)}"
    
    vision_status = "connected" if vision_client else "not configured"
    
    return {
        "status": "healthy",
        "gemini_ai": gemini_status,
        "vision_api": vision_status,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/chat")
async def chat_endpoint(
    message: str = Form(""),
    temporaryMode: str = Form("false"),
    userId: str = Form(...),
    context: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """Main chat endpoint with improved error handling"""
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
            # Read file content into memory
            file_bytes = await file.read()
            
            # Check file size (10MB limit)
            if len(file_bytes) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
            
            # Validate file content
            if len(file_bytes) == 0:
                raise HTTPException(status_code=400, detail="Empty file uploaded")
            
            # Process different file types
            content_type = file.content_type.lower() if file.content_type else ""
            
            if content_type == "application/pdf" or file.filename.lower().endswith('.pdf'):
                file_content = extract_text_from_pdf(file_bytes)
            elif (content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or 
                  file.filename.lower().endswith('.docx')):
                file_content = extract_text_from_docx(file_bytes)
            elif content_type.startswith("image/") or file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')):
                file_content = process_image(file_bytes, content_type)
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unsupported file type: {content_type}. Supported: PDF, DOCX, Images"
                )
            
            # Check if file processing failed
            if file_content.startswith("Error"):
                raise HTTPException(status_code=400, detail=file_content)
        
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
                if isinstance(context_data, list):
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
                    for msg in temporary_chats[userId][-6:]  # Last 6 messages
                ]
                full_message = build_context_prompt(temp_context[:-1], full_message)
        
        # Get AI response
        try:
            ai_response = get_ai_response(full_message)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
        
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
                "file_processed": bool(file_content),
                "file_type": file.content_type if file else None
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.delete("/chat/temporary/{user_id}")
async def clear_temporary_chat(user_id: str):
    """Clear temporary chat history for a user"""
    if user_id in temporary_chats:
        message_count = len(temporary_chats[user_id])
        del temporary_chats[user_id]
        return {
            "message": "Temporary chat cleared", 
            "user_id": user_id, 
            "cleared_messages": message_count
        }
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
    user_id: str = Form(...),
    first_message: str = Form(...)
):
    """Generate a title for a chat session based on the first message"""
    try:
        if not first_message.strip():
            return {"title": "New Chat"}
        
        # Create a prompt to generate a concise title
        title_prompt = f"""
        Based on this conversation starter, generate a short, descriptive title (maximum 4-5 words):
        
        "{first_message[:200]}"
        
        Return only the title, nothing else. Make it concise and relevant.
        """
        
        title = get_ai_response(title_prompt)
        
        # Clean and limit the title
        title = title.strip().replace('"', '').replace("'", "")
        if len(title) > 50:
            title = title[:47] + "..."
        
        return {"title": title or "New Chat"}
        
    except Exception as e:
        return {"title": "New Chat"}

@app.get("/stats")
async def get_stats():
    """Get API usage statistics"""
    total_temp_chats = len(temporary_chats)
    total_messages = sum(len(chat) for chat in temporary_chats.values())
    
    return {
        "temporary_chats": total_temp_chats,
        "total_messages": total_messages,
        "vision_api_available": vision_client is not None,
        "uptime": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    
    # Check for required environment variables
    if not os.getenv("GOOGLE_API_KEY"):
        print("ERROR: GOOGLE_API_KEY environment variable not set!")
        exit(1)
    
    if not os.getenv("GOOGLE_CLOUD_CREDENTIALS_PATH"):
        print("Warning: GOOGLE_CLOUD_CREDENTIALS_PATH environment variable not set - Vision OCR will be disabled")
    
    print("Starting AI ChatBot API server...")
    print(f"Vision API available: {vision_client is not None}")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)