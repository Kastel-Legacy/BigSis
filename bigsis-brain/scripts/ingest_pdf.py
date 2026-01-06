import os
import sys
import glob
import hashlib
import argparse
import asyncio
from typing import List, Dict

try:
    from pypdf import PdfReader
    from tqdm import tqdm
except ImportError:
    print("Error: Missing dependencies. Please run 'pip install pypdf tqdm'")
    sys.exit(1)

# Add parent dir to path to import core modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.rag.ingestion import ingest_document

from core.utils.pdf import extract_text_from_pdf

async def process_directory(directory: str):
    """
    Recursively finds and processes PDF files in the directory.
    """
    search_path = os.path.join(directory, "**/*.pdf")
    pdf_files = glob.glob(search_path, recursive=True)
    
    print(f"Found {len(pdf_files)} PDF files in {directory}")
    
    for pdf_path in tqdm(pdf_files, desc="Ingesting PDFs"):
        print(f"\nProcessing: {os.path.basename(pdf_path)}")
        
        # 1. Extract Text
        content = extract_text_from_pdf(pdf_path)
        if not content.strip():
            print(f"Skipping empty or unreadable file: {pdf_path}")
            continue
            
        # 2. Prepare Metadata
        filename = os.path.basename(pdf_path)
        title = filename.replace(".pdf", "").replace("_", " ").title()
        
        metadata = {
            "source": "pdf",
            "filename": filename,
            "path": pdf_path
        }
        
        # 3. Ingest (Chunk -> Embed -> Store)
        # We reuse the existing logic in core.rag.ingestion
        await ingest_document(title=title, content=content, metadata=metadata)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest PDF documents into Big SIS Knowledge Base.")
    parser.add_argument("directory", help="Path to the directory containing PDF files.")
    
    args = parser.parse_args()
    
    if not os.path.isdir(args.directory):
        print(f"Error: Directory not found: {args.directory}")
        sys.exit(1)
        
    asyncio.run(process_directory(args.directory))
