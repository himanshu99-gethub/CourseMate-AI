import sys
import os

# Add root folder to path so we can import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from utils import ai_engine, SimpleTfidf
    print("SUCCESS: Successfully imported ai_engine and SimpleTfidf from utils!")
except Exception as e:
    print(f"FAILED: Import error: {e}")
    sys.exit(1)

# 1. Test SimpleTfidf directly
try:
    docs = [
        "Python programming is great for data science.",
        "Web development uses HTML, CSS, and JavaScript.",
        "Machine learning models need lots of data."
    ]
    tfidf = SimpleTfidf(docs)
    vectors = [tfidf._doc_to_vector(d) for d in docs]
    
    # Check similarities
    query1 = "python web development"
    sims1 = tfidf.get_similarities(query1, vectors)
    print(f"SimpleTfidf similarities for query '{query1}': {sims1}")
    
    query2 = "machine learning science"
    sims2 = tfidf.get_similarities(query2, vectors)
    print(f"SimpleTfidf similarities for query '{query2}': {sims2}")
    
    print("SUCCESS: SimpleTfidf test completed successfully!")
except Exception as e:
    print(f"FAILED: SimpleTfidf test failed: {e}")

# 2. Test recommend_courses
try:
    interests = "I love Python and Machine Learning models"
    recommended = ai_engine.recommend_courses(interests)
    print(f"recommend_courses for '{interests}': {recommended}")
    
    interests_empty = "something completely unrelated"
    recommended_empty = ai_engine.recommend_courses(interests_empty)
    print(f"recommend_courses for '{interests_empty}': {recommended_empty}")
    
    print("SUCCESS: recommend_courses test completed successfully!")
except Exception as e:
    print(f"FAILED: recommend_courses test failed: {e}")

# 3. Test perform_rag
try:
    corpus = "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals. More specifically, AI is used for machine learning, deep learning, computer vision, and natural language processing."
    query = "What is artificial intelligence used for?"
    
    # We bypass actual API call by inspecting perform_rag's retrieval output
    # Since we can't mock or call external client easily without api key, let's just make sure it retrieves without crashing
    response = ai_engine.perform_rag(query, corpus)
    print(f"perform_rag response: {response}")
    print("SUCCESS: perform_rag test completed successfully!")
except Exception as e:
    print(f"FAILED: perform_rag test failed: {e}")
