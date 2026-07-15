# ResuSight Agents Instructions

## Project Overview

ResuSight is an ATS-Compatibility (Applicant Tracking System) checking system that takes in resumes as text or PDF with job roles and optionally a job description and checks the Resumes to find mistakes, improvements and outright problems in the Resumes and suggests improvements to cater to the desired job roles and job description. It allows applicants to be assured that their resumes help them get jobs and not get rejected.

### Feature Overview

It takes resume as text or PDF as input with a job role and optionally job description and analyzes the resume according to the job role and description, it should test resume based on: ATS Parsing, sectioning, keywords, formatting, clarity, skills & experience, education & certifications, links & contact information, design, credibility through dates/links/description, etc. It should display individual score for each criteria and suggest improvements about that criteria and also provide an overall score out of 100. It should prevent from giving vague suggestions like "improve keyword density" and provide good examples for the improvements. It will use Gemini Free Tier AI as the AI for this analysis and results. Text should render progressively in the UI rather than appearing all at once after a delay. The full-stack application must be packaged into a Docker container with a working Dockerfile. API keys must not appear in frontend code or version control. Environment variables must be used for all sensitive credentials.

### Technical Details

Project Type: Web Application
Frontend: HTML/CSS/JS
Backend: Python Django
LLM API: Gemini
Containerization: Docker
Deployment: Amazon Web Services

## Dev Environment

- Use `docker` to setup and use containers for final testing and deployment.
- Run `django-admin runserver` to start a server for seeing the web application.
- Setup the Gemini API to be used but setup the API Key to be added in a `.env` file manually.
- Use `git` only for making branches and merging them never for comitting that should only be done by a human.
- Always describe each command run for the environment or git.

## Code Style Guide

- Use function-based views in django.
- Use nesting in CSS styles.
