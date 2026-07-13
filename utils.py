import os
import json
# NOTE: google.generativeai import commented out due to module hanging issue

genai = None
from openai import OpenAI
import math
import re

def tokenize(text):
    return re.findall(r'\b\w+\b', text.lower())

class SimpleTfidf:
    def __init__(self, documents):
        self.vocab = {}
        self.idf = {}
        self.doc_count = len(documents)
        
        df = {}
        for doc in documents:
            words = set(tokenize(doc))
            for word in words:
                df[word] = df.get(word, 0) + 1
                
        idx = 0
        for word, count in df.items():
            self.vocab[word] = idx
            idx += 1
            self.idf[word] = math.log(1.0 + (self.doc_count / count))
            
    def _doc_to_vector(self, doc):
        words = tokenize(doc)
        tf = {}
        for word in words:
            if word in self.vocab:
                tf[word] = tf.get(word, 0) + 1
                
        vector = [0.0] * len(self.vocab)
        for word, freq in tf.items():
            word_idx = self.vocab[word]
            vector[word_idx] = freq * self.idf[word]
            
        magnitude = math.sqrt(sum(val * val for val in vector))
        if magnitude > 0:
            vector = [val / magnitude for val in vector]
        return vector

    def get_similarities(self, query, doc_vectors):
        query_vector = self._doc_to_vector(query)
        similarities = []
        for doc_vector in doc_vectors:
            dot_product = sum(q * d for q, d in zip(query_vector, doc_vector))
            similarities.append(dot_product)
        return similarities
from dotenv import load_dotenv
import PyPDF2
import io

print("[UTILS] Starting imports...")
load_dotenv()

# Configure API keys
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
NVIDIA_KEY = os.getenv("NVIDIA_API_KEY")

print(f"[UTILS] GEMINI_KEY available: {bool(GEMINI_KEY)}")
print(f"[UTILS] NVIDIA_KEY available: {bool(NVIDIA_KEY)}")

# Initialize Gemini Client (via OpenAI-compatible endpoint)
gemini_client = None
if GEMINI_KEY:
    try:
        print("[UTILS] Initializing Gemini OpenAI client...")
        gemini_client = OpenAI(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=GEMINI_KEY,
            timeout=10.0
        )
        print("[UTILS] Gemini client initialized")
    except Exception as e:
        print(f"[UTILS] Failed to initialize Gemini client: {e}")
        gemini_client = None

# Initialize NVIDIA Client (NIM handles OpenAI-compatible requests)
nvidia_client = None
if NVIDIA_KEY:
    try:
        print("[UTILS] Initializing NVIDIA OpenAI client...")
        nvidia_client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=NVIDIA_KEY,
            timeout=10.0
        )
        print("[UTILS] NVIDIA client initialized")
    except Exception as e:
        print(f"[UTILS] Failed to initialize NVIDIA client: {e}")
        nvidia_client = None

print("[UTILS] Defining CourseMateAI class...")

class CourseMateAI:
    def __init__(self):
        # Predefined courses for recommendation logic
        self.courses = [
            "Introduction to Computer Science",
            "Advanced Python Programming",
            "Data Science for Beginners",
            "Machine Learning Specialization",
            "Web Development with HTML, CSS, and JS",
            "Digital Marketing Essentials",
            "Business Management & Leadership",
            "Quantum Physics for Enthusiasts",
            "Modern World History",
            "Calculus and Linear Algebra",
            "UX/UI Design Fundamentals",
            "Cybersecurity Ethics",
            "Financial Literacy & Investing"
        ]
        self.tfidf = SimpleTfidf(self.courses)
        self.course_vectors = [self.tfidf._doc_to_vector(course) for course in self.courses]

    def extract_text_from_file(self, file):
        """
        Extracts plain text from PDF or TXT files.
        """
        filename = file.filename.lower()
        if filename.endswith('.pdf'):
            try:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text()
                return text
            except Exception as e:
                return f"Error reading PDF: {str(e)}"
        elif filename.endswith('.txt'):
            try:
                return file.read().decode('utf-8')
            except Exception as e:
                return f"Error reading text file: {str(e)}"
        return ""

    def get_ai_response(self, prompt, context=""):
        """
        Generic AI response generator. 
        Multi-stage fallback: Gemini -> NVIDIA (NIM) -> Local Engine.
        """
        try:
            # 1. ATTEMPT GEMINI FIRST (primary, fast and reliable)
            if gemini_client:
                try:
                    completion = gemini_client.chat.completions.create(
                        model="gemini-2.0-flash",
                        messages=[
                            {"role": "system", "content": context if context else "You are CourseMate AI, a premium academic assistant. Provide high-density, structured academic info."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.6,
                        max_tokens=3000,
                        timeout=90.0  # 90s — fits within 120s Gunicorn limit
                    )
                    return completion.choices[0].message.content
                except Exception as e:
                    print(f"Gemini Signal Lost: {e}")

            # 2. FALLBACK TO NVIDIA NIM (Llama 3.1 — fail fast)
            if nvidia_client:
                try:
                    completion = nvidia_client.chat.completions.create(
                        model="meta/llama-3.1-8b-instruct", 
                        messages=[
                            {"role": "system", "content": "You are CourseMate AI, a premium academic assistant. Provide high-density, structured academic info."},
                            {"role": "user", "content": f"Context: {context}\n\nTask: {prompt}"}
                        ],
                        temperature=0.6,
                        max_tokens=2000,
                        timeout=25.0  # Fail fast — total stays under 120s
                    )
                    return completion.choices[0].message.content
                except Exception as e:
                    print(f"NVIDIA Signal Lost (Timeout or Error): {e}")
            
            # 3. LOCAL SIMULATED INTELLIGENCE (Prevent 500 Errors)
            if "notes" in context.lower():
                return f"# Study Manuscript: {prompt}\n\n[SIMULATED OFFLINE MODE]\n\nThe academic engine is currently in local mode. {prompt} is an essential concept involving structured analysis and interdisciplinary application."
            
            return f"Synchronizing intelligence... Regarding '{prompt}', this is a core academic theme. (Local Mode Active)"

        except Exception as e:
            return f"Critical Engine Exception: {str(e)}"


    def recommend_courses(self, user_interests):
        """
        Basic ML recommendation logic using Cosine Similarity.
        """
        similarities = self.tfidf.get_similarities(user_interests, self.course_vectors)
        sorted_indices = sorted(range(len(similarities)), key=lambda i: similarities[i], reverse=True)
        related_indices = sorted_indices[:3]
        
        # If no similarity (similarity sum is 0), return random/default
        if sum(similarities) == 0:
            return ["Intro to General Sciences", "Foundations of Learning", "Academic Excellence"]
            
        return [self.courses[i] for i in related_indices]

    def perform_rag(self, query, full_text):
        """
        Simple RAG implementation: Chunking -> Vector Search -> Contextual AI Response.
        """
        if not full_text or len(full_text) < 100:
            return self.get_ai_response(query, context="Note: No document context available.")

        # 1. Chunking
        chunks = [full_text[i:i+1000] for i in range(0, len(full_text), 800)]
        
        # 2. Vector Search (Retrieval)
        try:
            temp_tfidf = SimpleTfidf(chunks)
            chunk_vectors = [temp_tfidf._doc_to_vector(chunk) for chunk in chunks]
            similarities = temp_tfidf.get_similarities(query, chunk_vectors)
            
            sorted_indices = sorted(range(len(similarities)), key=lambda i: similarities[i], reverse=True)
            top_indices = sorted_indices[:3]
            
            relevant_context = "\n---\n".join([chunks[i] for i in top_indices if similarities[i] > 0.05])
            
            if not relevant_context:
                relevant_context = full_text[:2000] # Fallback to beginning of doc
        except Exception as e:
            print(f"RAG search error: {e}")
            relevant_context = full_text[:2000]

        # 3. Augmentation & Generation
        system_instruction = "You are CourseMate RAG Engine. Use ONLY the provided context to answer. If not found, say so politely."     
        return self.get_ai_response(query, context=f"{system_instruction}\n\nDOCUMENT CONTEXT:\n{relevant_context}")

# Singleton instance
print("[UTILS] About to instantiate CourseMateAI...")
try:
    ai_engine = CourseMateAI()
    print("[UTILS] CourseMateAI instantiated successfully")
except Exception as e:
    print(f"[UTILS] Error initializing AI Engine: {e}")
    # Create a dummy object to prevent import errors
    class DummyAIEngine:
        def get_ai_response(self, prompt, context=""):
            return "AI Engine not available. Using fallback response."
        def extract_text_from_file(self, file):
            return ""
        def perform_rag(self, query, text):
            return "RAG not available."
        def recommend_courses(self, interests):
            return ["Course 1", "Course 2", "Course 3"]
    ai_engine = DummyAIEngine()
    print("[UTILS] Using Dummy AI Engine")

print("[UTILS] Module import complete")
