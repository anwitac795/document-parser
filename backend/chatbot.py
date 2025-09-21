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
import fitz  # PyMuPDF
import re


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

vision_client = None
try:
    import tempfile

# Get JSON content from env
    service_account_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if service_account_json:
        # Write to temporary file
        with tempfile.NamedTemporaryFile(mode="w+", delete=False, suffix=".json") as tmp_file:
            tmp_file.write(service_account_json)
            tmp_file_path = tmp_file.name

        # Point Google SDK to this file
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp_file_path
        try:
            vision_client = vision.ImageAnnotatorClient()
        except Exception as e:
            print(f"Warning: Google Vision API not available: {str(e)}")

except Exception as e:
    print(f"Warning: Google Vision API not available: {str(e)}")

# Storage for document analyses and comparisons
temporary_chats = {}
document_analyses = {}
legal_glossary = {}

# File upload limits
MAX_PDF_PAGES = 10
MAX_IMAGES = 5
MAX_FILE_SIZE = 10 * 1024 * 1024

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



def validate_file_upload(file: UploadFile, file_bytes: bytes) -> Dict[str, any]:
    """Validate file uploads based on type and size limits"""
    validation_result = {"valid": True, "errors": []}
    
    if len(file_bytes) > MAX_FILE_SIZE:
        validation_result["valid"] = False
        validation_result["errors"].append("File size exceeds 10MB limit")
        return validation_result
    
    content_type = file.content_type.lower() if file.content_type else ""
    filename = file.filename.lower() if file.filename else ""
    
    if content_type == "application/pdf" or filename.endswith('.pdf'):
        try:
            pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
            page_count = pdf_doc.page_count
            pdf_doc.close()
            
            if page_count > MAX_PDF_PAGES:
                validation_result["valid"] = False
                validation_result["errors"].append(f"PDF has {page_count} pages. Maximum {MAX_PDF_PAGES} pages allowed")
        except Exception as e:
            validation_result["valid"] = False
            validation_result["errors"].append(f"Invalid PDF file: {str(e)}")
    
    elif content_type.startswith("image/") or filename.endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp')):
        # For image validation, we'll track count in the frontend
        pass
    
    elif (content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or 
          filename.endswith('.docx')):
        pass
    
    else:
        validation_result["valid"] = False
        validation_result["errors"].append(f"Unsupported file type: {content_type}")
    
    return validation_result

def extract_text_from_pdf_with_ocr(file_content: bytes) -> Dict[str, any]:
    """Extract text from PDF using OCR for each page"""
    try:
        pdf_doc = fitz.open(stream=file_content, filetype="pdf")
        pages_data = []
        total_text = ""
        
        for page_num in range(pdf_doc.page_count):
            page = pdf_doc[page_num]
            
            # First try to extract text directly
            text = page.get_text()
            
            # If no text or minimal text, use OCR
            if len(text.strip()) < 50:
                # Convert page to image
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
                img_data = pix.tobytes("png")
                
                # Use OCR
                if vision_client:
                    ocr_text = extract_text_with_vision_ocr(img_data)
                    if not ocr_text.startswith("Error"):
                        text = ocr_text
                
            pages_data.append({
                "page_number": page_num + 1,
                "text": text,
                "has_ocr": len(page.get_text().strip()) < 50
            })
            total_text += f"\n--- Page {page_num + 1} ---\n{text}\n"
        
        pdf_doc.close()
        
        return {
            "total_text": total_text.strip(),
            "pages": pages_data,
            "page_count": len(pages_data)
        }
    except Exception as e:
        return {"error": f"Error extracting PDF text: {str(e)}"}

def analyze_clauses_with_risk_scoring(document_text: str) -> Dict[str, any]:
    """Analyze individual clauses and assign risk scores"""
    
    prompt = f"""
    Analyze this legal document and break it down into individual clauses with risk assessment. 
    Be comprehensive and identify ALL significant clauses, not just obviously risky ones.

    Document: {document_text}

    Provide your response in this exact JSON format:
    {{
        "clauses": [
            {{
                "id": "clause_1",
                "title": "Brief descriptive title",
                "original_text": "Exact text from document",
                "plain_language": "Simplified explanation in everyday language",
                "risk_level": "low/medium/high",
                "risk_score": 1-10,
                "concerns": ["specific concern 1", "specific concern 2"],
                "implications": "What this means for the user",
                "questions_to_ask": ["Question 1 to ask lawyer/counterparty", "Question 2"],
                "category": "termination/payment/liability/intellectual_property/confidentiality/other"
            }}
        ],
        "overall_analysis": {{
            "document_type": "contract/agreement/terms/policy/other",
            "total_clauses": 0,
            "high_risk_count": 0,
            "medium_risk_count": 0,
            "low_risk_count": 0,
            "key_terms": ["term1", "term2"],
            "parties_involved": ["party1", "party2"],
            "critical_dates": ["date info if any"],
            "financial_obligations": ["obligation1", "obligation2"]
        }},
        "red_flags": [
            {{
                "clause_id": "clause_x",
                "alert": "Specific warning about this clause",
                "recommendation": "What user should do"
            }}
        ],
        "glossary_terms": [
            {{
                "term": "legal_term",
                "definition": "Simple explanation",
                "context": "How it applies in this document"
            }}
        ]
    }}

    Focus on practical implications for a non-lawyer. Be thorough but clear.
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean JSON response
        if response_text.startswith('```json'):
            response_text = response_text[7:-3]
        elif response_text.startswith('```'):
            response_text = response_text[3:-3]
        
        return json.loads(response_text)
    except Exception as e:
        return {
            "clauses": [],
            "overall_analysis": {
                "document_type": "unknown",
                "error": f"Analysis failed: {str(e)}"
            },
            "red_flags": [],
            "glossary_terms": []
        }

def generate_side_by_side_analysis(clause_text: str) -> Dict[str, str]:
    """Generate side-by-side legal vs plain language view"""
    
    prompt = f"""
    Take this legal clause and provide both the original and a plain-language version:
    
    Original: {clause_text}
    
    Provide response in JSON:
    {{
        "original": "exact original text",
        "plain_language": "simple, clear explanation",
        "key_points": ["point 1", "point 2", "point 3"],
        "user_impact": "How this specifically affects the user"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        if response_text.startswith('```json'):
            response_text = response_text[7:-3]
        elif response_text.startswith('```'):
            response_text = response_text[3:-3]
        
        return json.loads(response_text)
    except Exception as e:
        return {
            "original": clause_text,
            "plain_language": f"Error processing clause: {str(e)}",
            "key_points": [],
            "user_impact": "Unable to analyze"
        }

def document_qa_with_context(document_content: str, question: str, previous_qa: List[Dict] = None) -> Dict[str, any]:
    """Enhanced Q&A with conversation context"""
    
    context_str = ""
    if previous_qa:
        context_str = "\nPrevious Q&A context:\n"
        for qa in previous_qa[-3:]:  # Last 3 QA pairs for context
            context_str += f"Q: {qa.get('question', '')}\nA: {qa.get('answer', '')[:200]}...\n"
    
    prompt = f"""
    Based on this legal document, answer the user's question with specific references to relevant sections.
    
    Document content: {document_content[:4000]}
    
    {context_str}
    
    Current question: {question}
    
    Provide a comprehensive answer in JSON format:
    {{
        "answer": "detailed answer with specific references",
        "relevant_sections": ["section 1 text", "section 2 text"],
        "confidence": "high/medium/low",
        "caveats": ["limitation 1", "limitation 2"],
        "follow_up_questions": ["suggested question 1", "suggested question 2"],
        "cannot_answer_reason": "if question cannot be answered from document"
    }}
    
    Be specific and cite exact text when possible. If the answer requires legal interpretation beyond the document, say so clearly.
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        if response_text.startswith('```json'):
            response_text = response_text[7:-3]
        elif response_text.startswith('```'):
            response_text = response_text[3:-3]
        
        result = json.loads(response_text)
        return result
    except Exception as e:
        return {
            "answer": f"Error processing question: {str(e)}",
            "relevant_sections": [],
            "confidence": "low",
            "caveats": ["Technical error occurred"],
            "follow_up_questions": [],
            "cannot_answer_reason": "System error"
        }

def compare_multiple_documents(documents: List[Dict]) -> Dict[str, any]:
    """Enhanced document comparison with detailed insights"""
    
    if len(documents) < 2:
        return {"error": "At least 2 documents required"}
    
    doc_summaries = []
    for i, doc in enumerate(documents):
        summary = doc['content'][:2000] if len(doc['content']) > 2000 else doc['content']
        doc_summaries.append(f"Document {i+1} ({doc.get('filename', 'Unknown')}): {summary}")
    
    comparison_text = "\n\n".join(doc_summaries)
    
    prompt = f"""
    Compare these legal documents and provide a detailed analysis of differences and similarities:
    
    {comparison_text}
    
    Provide comparison in JSON format:
    {{
        "summary": "High-level comparison summary",
        "document_types": ["type of doc 1", "type of doc 2"],
        "key_differences": [
            {{
                "category": "payments/termination/liability/rights/other",
                "document_1": "specific terms in doc 1",
                "document_2": "specific terms in doc 2", 
                "significance": "high/medium/low",
                "user_impact": "how this difference affects the user",
                "recommendation": "which option is better and why"
            }}
        ],
        "similarities": ["common clause 1", "common clause 2"],
        "risk_comparison": {{
            "document_1_risk": "high/medium/low",
            "document_2_risk": "high/medium/low",
            "riskier_document": 1 or 2,
            "risk_explanation": "why one is riskier"
        }},
        "recommendations": [
            "Overall recommendation 1",
            "Overall recommendation 2"
        ],
        "questions_to_ask": [
            "Question about difference 1",
            "Question about difference 2"
        ]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        if response_text.startswith('```json'):
            response_text = response_text[7:-3]
        elif response_text.startswith('```'):
            response_text = response_text[3:-3]
        
        return json.loads(response_text)
    except Exception as e:
        return {
            "summary": "Comparison analysis failed",
            "error": str(e),
            "key_differences": [],
            "recommendations": ["Please try the comparison again"]
        }

def extract_text_with_vision_ocr(file_content: bytes) -> str:
    """OCR text extraction using Google Vision API"""
    if not vision_client:
        return "Google Vision API not available"
    
    try:
        image = vision.Image(content=file_content)
        response = vision_client.text_detection(image=image)
        
        if response.error.message:
            return f"Vision API error: {response.error.message}"
        
        texts = response.text_annotations
        if texts and len(texts) > 0:
            return texts[0].description.strip()
        else:
            return "No text found in image"
            
    except Exception as e:
        return f"Error extracting text with OCR: {str(e)}"

# Enhanced API Endpoints

@app.post("/analyze/enhanced-document")
async def enhanced_document_analysis(
    userId: str = Form(...),
    file: UploadFile = File(...)
):
    """Enhanced document analysis with clause-level risk scoring"""
    try:
        file_bytes = await file.read()
        
        # Validate file
        validation = validate_file_upload(file, file_bytes)
        if not validation["valid"]:
            raise HTTPException(status_code=400, detail=validation["errors"])
        
        # Extract text based on file type
        content_type = file.content_type.lower() if file.content_type else ""
        filename = file.filename.lower() if file.filename else ""
        
        if content_type == "application/pdf" or filename.endswith('.pdf'):
            extraction_result = extract_text_from_pdf_with_ocr(file_bytes)
            if "error" in extraction_result:
                raise HTTPException(status_code=400, detail=extraction_result["error"])
            document_text = extraction_result["total_text"]
            pages_info = extraction_result["pages"]
        elif (content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" or 
              filename.endswith('.docx')):
            document_text = extract_text_from_docx(file_bytes)
            pages_info = None
        elif content_type.startswith("image/"):
            document_text = extract_text_with_vision_ocr(file_bytes)
            pages_info = None
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        if document_text.startswith("Error"):
            raise HTTPException(status_code=400, detail=document_text)
        
        # Perform enhanced analysis
        analysis = analyze_clauses_with_risk_scoring(document_text)
        
        # Store analysis
        document_id = f"{userId}_{int(time.time())}"
        document_analyses[document_id] = {
            "filename": file.filename,
            "content": document_text,
            "pages_info": pages_info,
            "enhanced_analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }
        
        # Update glossary
        for term in analysis.get("glossary_terms", []):
            legal_glossary[term["term"]] = term
        
        return JSONResponse({
            "document_id": document_id,
            "analysis": analysis,
            "filename": file.filename,
            "pages_processed": len(pages_info) if pages_info else 1
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhanced analysis failed: {str(e)}")

@app.post("/analyze/clause-details")
async def get_clause_details(
    document_id: str = Form(...),
    clause_id: str = Form(...)
):
    """Get detailed side-by-side view of a specific clause"""
    try:
        if document_id not in document_analyses:
            raise HTTPException(status_code=404, detail="Document not found")
        
        analysis = document_analyses[document_id]["enhanced_analysis"]
        clause = None
        
        for c in analysis.get("clauses", []):
            if c.get("id") == clause_id:
                clause = c
                break
        
        if not clause:
            raise HTTPException(status_code=404, detail="Clause not found")
        
        # Generate side-by-side analysis
        side_by_side = generate_side_by_side_analysis(clause["original_text"])
        
        return JSONResponse({
            "clause": clause,
            "side_by_side": side_by_side
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clause analysis failed: {str(e)}")

@app.post("/analyze/enhanced-qa")
async def enhanced_document_qa(
    userId: str = Form(...),
    document_id: str = Form(...),
    question: str = Form(...),
    previous_qa: Optional[str] = Form(None)
):
    """Enhanced Q&A with conversation context"""
    try:
        if document_id not in document_analyses:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = document_analyses[document_id]
        
        # Parse previous Q&A if provided
        qa_context = []
        if previous_qa:
            try:
                qa_context = json.loads(previous_qa)
            except:
                pass
        
        answer_data = document_qa_with_context(
            document['content'], 
            question, 
            qa_context
        )
        
        return JSONResponse({
            "question": question,
            "answer_data": answer_data,
            "document_filename": document["filename"]
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhanced Q&A failed: {str(e)}")

@app.post("/analyze/enhanced-compare")
async def enhanced_document_comparison(
    userId: str = Form(...),
    document_ids: str = Form(...)
):
    """Enhanced document comparison with detailed insights"""
    try:
        doc_ids = json.loads(document_ids)
        
        if len(doc_ids) < 2:
            raise HTTPException(status_code=400, detail="At least 2 documents required")
        
        documents = []
        for doc_id in doc_ids:
            if doc_id not in document_analyses:
                raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
            documents.append(document_analyses[doc_id])
        
        comparison = compare_multiple_documents(documents)
        
        return JSONResponse({
            "comparison": comparison,
            "documents": [{
                "id": doc_id, 
                "filename": document_analyses[doc_id]["filename"]
            } for doc_id in doc_ids]
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhanced comparison failed: {str(e)}")

@app.get("/glossary")
async def get_legal_glossary():
    """Get the current legal glossary"""
    return JSONResponse({"glossary": legal_glossary})

@app.get("/glossary/{term}")
async def get_glossary_term(term: str):
    """Get definition of a specific legal term"""
    if term in legal_glossary:
        return JSONResponse(legal_glossary[term])
    else:
        return JSONResponse({"error": "Term not found"}, status_code=404)
    

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
2. any text that appears in the image (transcribe it exactly)
3. The context and purpose of the image
4. any notable visual elements, colors, or composition details

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
    
    if not os.getenv("GOOGLE_API_KEY"):
        print("ERROR: GOOGLE_API_KEY environment variable not set!")
        exit(1)
    
    print("Starting Enhanced AI Legal Assistant API server...")
    print(f"Vision API available: {vision_client is not None}")
    print(f"Max PDF pages: {MAX_PDF_PAGES}")
    print(f"Max images: {MAX_IMAGES}")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

