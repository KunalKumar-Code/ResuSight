from django.shortcuts import render
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import os
import io
import pdfplumber
from google import genai
from google.genai import types

# Define the system prompt for Gemini
SYSTEM_PROMPT = """You are an expert ATS (Applicant Tracking System) optimizer and professional resume reviewer. Your goal is to analyze the provided resume against a Job Role and an optional Job Description, and provide a highly detailed, professional, and actionable critique.

You must follow this exact output structure. Do not output anything before [SCORES].

[SCORES]
OVERALL: <score>
ATS: <score>
SECTIONING: <score>
KEYWORDS: <score>
CLARITY: <score>
EDUCATION: <score>
LINKS: <score>
DESIGN: <score>
CREDIBILITY: <score>
[/SCORES]

## 1. Overall Summary
Provide a brief, high-level evaluation of the resume's match for the role.

## 2. ATS Parsing Analysis (Score: <score>/100)
Explain how well an ATS would extract information. Look for formatting hazards (tables, text boxes, columns, headers, footers, non-standard fonts, icons).
Give concrete examples of issues found and how to fix them.

## 3. Sectioning & Formatting (Score: <score>/100)
Evaluate readability, font choice, spacing, structure.
Provide actionable layout adjustments.

## 4. Keywords & Skills Match (Score: <score>/100)
Analyze the alignment of skills and keywords with the job role/description.
Identify missing key skills. Provide exact keywords that should be added based on the job role.
*CRITICAL:* Do not give vague advice like "improve keyword density". Instead, list the exact keywords missing and provide a specific sentence where they can be naturally integrated.

## 5. Clarity, Style & Impact (Score: <score>/100)
Evaluate the tone, action verbs, and quantify-ability (metrics, results).
Identify weak bullet points.
Provide a "Before & After" rewrite example demonstrating how to use the STAR method (Situation, Task, Action, Result) to rephrase a weak bullet point.

## 6. Education & Certifications (Score: <score>/100)
Check if education, degrees, graduation years, and relevant certifications are listed clearly.

## 7. Links & Contact Info (Score: <score>/100)
Verify presence of email, phone, location, LinkedIn, GitHub, portfolio. Indicate if links are active and professional.

## 8. Design & Presentation (Score: <score>/100)
Evaluate aesthetic, colors, whitespace, margins. Provide suggestions to make it look premium.

## 9. Credibility & Detail (Score: <score>/100)
Check if dates are formatted consistently, employment gaps are explained, and claims are backed by details.

Please maintain a highly professional, constructive, and encouraging tone. Use clear Markdown headings, bold text, lists, and tables where appropriate.
"""

def extract_text_from_pdf(uploaded_file):
    text = ""
    try:
        file_bytes = uploaded_file.read()
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        return f"Error parsing PDF: {str(e)}"
    return text.strip()

def index(request):
    return render(request, 'analyzer/index.html')

@csrf_exempt
def analyze(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST requests are allowed.'}, status=405)
    
    # Check if Gemini API key is configured
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        def err_stream():
            yield "[ERROR] GEMINI_API_KEY is not configured in the backend. Please add your Gemini API Key in the `.env` file in the root directory to begin."
        return StreamingHttpResponse(err_stream(), content_type='text/plain')
    
    job_role = request.POST.get('job_role', '').strip()
    job_description = request.POST.get('job_description', '').strip()
    
    if not job_role:
        return JsonResponse({'error': 'Job role is required.'}, status=400)
    
    # Process Resume
    resume_text = ""
    if 'resume_file' in request.FILES:
        resume_file = request.FILES['resume_file']
        if resume_file.name.lower().endswith('.pdf'):
            resume_text = extract_text_from_pdf(resume_file)
        else:
            try:
                resume_text = resume_file.read().decode('utf-8', errors='ignore')
            except Exception as e:
                return JsonResponse({'error': f'Failed to read resume file: {str(e)}'}, status=400)
    else:
        resume_text = request.POST.get('resume_text', '').strip()
        
    if not resume_text:
        return JsonResponse({'error': 'Resume content is required. Please upload a file or paste your resume text.'}, status=400)

    prompt = f"""Analyze the following resume details for the role of '{job_role}'.

=== JOB ROLE ===
{job_role}

=== JOB DESCRIPTION (OPTIONAL) ===
{job_description if job_description else "Not provided. Analyze based on standard industry expectations for the role."}

=== RESUME TEXT ===
{resume_text}
"""

    def event_stream():
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content_stream(
                model='gemini-3.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT
                )
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"\n\n[ERROR] An error occurred during analysis: {str(e)}"

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    # Prevent caching of response stream
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Important for Nginx proxy streaming
    return response
