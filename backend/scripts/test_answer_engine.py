"""
Test script for the professional answer engine.

Usage:
    python -m scripts.test_answer_engine

This script demonstrates the answer engine's capabilities with sample queries.
"""

import asyncio
from app.services.answer_engine import AnswerEngineService


async def test_answer_engine():
    """Test the professional answer engine with sample data."""
    
    # Initialize answer engine
    engine = AnswerEngineService()
    
    # Sample query
    query = "What is machine learning?"
    
    # Sample retrieved chunks (simulating retriever results)
    chunks = [
        {
            "id": 1,
            "content": "Machine learning is a subset of artificial intelligence (AI) that enables computers to learn and improve from experience without being explicitly programmed. It focuses on the development of computer programs that can access data and use it to learn for themselves.",
            "document_name": "ai_basics.pdf",
            "metadata": {"page": 3},
        },
        {
            "id": 2,
            "content": "There are three main types of machine learning: supervised learning (using labeled datasets), unsupervised learning (finding hidden patterns in unlabeled data), and reinforcement learning (learning through trial and error with rewards). Each type has specific use cases and applications.",
            "document_name": "ml_types.pdf",
            "metadata": {"page": 12},
        },
        {
            "id": 3,
            "content": "Modern machine learning applications include healthcare diagnostics, financial fraud detection, recommendation systems, autonomous vehicles, and natural language processing. These systems continuously improve their accuracy as they process more data over time.",
            "document_name": "ml_applications.pdf",
            "metadata": {"page": 5},
        },
    ]
    
    print("=" * 70)
    print("PROFESSIONAL ANSWER ENGINE TEST")
    print("=" * 70)
    print()
    print(f"Query: {query}")
    print()
    print("-" * 70)
    print("Retrieved Chunks:")
    print("-" * 70)
    for i, chunk in enumerate(chunks, 1):
        print(f"\n[{i}] (From: {chunk['document_name']})")
        print(f"    {chunk['content'][:100]}...")
    
    print()
    print("=" * 70)
    print("GENERATING PROFESSIONAL ANSWER...")
    print("=" * 70)
    print()
    
    try:
        # Generate professional answer
        answer = await engine.generate_answer(query=query, chunks=chunks)
        
        print("RESULT:")
        print("-" * 70)
        print(answer)
        print()
        print("=" * 70)
        print("QUALITY CHECK:")
        print("=" * 70)
        
        # Quality checks
        checks = []
        checks.append(("✅" if "[1]" in answer or "[2]" in answer else "❌", "Contains citations [1], [2]"))
        checks.append(("✅" if ".pdf" not in answer else "❌", "No filenames in answer"))
        checks.append(("✅" if "page" not in answer.lower() else "❌", "No page numbers"))
        checks.append(("✅" if "according to" not in answer.lower() else "❌", "No 'according to' phrases"))
        checks.append(("✅" if len(answer.split("\n\n")) <= 7 else "❌", "3-6 paragraphs (reasonable length)"))
        
        for status, check in checks:
            print(f"{status} {check}")
        
        print()
        print("=" * 70)
        
        # Test streaming
        print("TESTING STREAMING VERSION...")
        print("=" * 70)
        print()
        
        full_answer = ""
        async for token in engine.generate_answer_stream(query=query, chunks=chunks):
            print(token, end="", flush=True)
            full_answer += token
        
        print()
        print()
        print("=" * 70)
        print("Stream completed successfully!")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


async def test_insufficient_context():
    """Test behavior with insufficient context."""
    engine = AnswerEngineService()
    
    query = "What is the capital of Mars?"
    chunks = [
        {
            "id": 1,
            "content": "Mars is the fourth planet from the Sun and is often called the Red Planet.",
            "document_name": "planets.pdf",
            "metadata": {},
        }
    ]
    
    print("\n" + "=" * 70)
    print("TEST: INSUFFICIENT CONTEXT")
    print("=" * 70)
    print(f"\nQuery: {query}")
    print("\nChunks provided don't contain answer...")
    print("\nAnswer:")
    print("-" * 70)
    
    answer = await engine.generate_answer(query=query, chunks=chunks)
    print(answer)
    print()


async def test_no_chunks():
    """Test behavior with no chunks."""
    engine = AnswerEngineService()
    
    query = "What is quantum computing?"
    chunks = []
    
    print("\n" + "=" * 70)
    print("TEST: NO CHUNKS RETRIEVED")
    print("=" * 70)
    print(f"\nQuery: {query}")
    print("\nNo chunks retrieved...")
    print("\nAnswer:")
    print("-" * 70)
    
    answer = await engine.generate_answer(query=query, chunks=chunks)
    print(answer)
    print()


async def main():
    """Run all tests."""
    print("\n🚀 Starting Answer Engine Tests...\n")
    
    # Test 1: Normal operation
    await test_answer_engine()
    
    # Test 2: Insufficient context
    await test_insufficient_context()
    
    # Test 3: No chunks
    await test_no_chunks()
    
    print("\n✅ All tests completed!\n")


if __name__ == "__main__":
    asyncio.run(main())

