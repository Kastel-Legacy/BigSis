import sys
try:
    from pypdf import PdfReader
except ImportError:
    print("Error: Missing dependencies. Please run 'pip install pypdf'")
    # We might want to raise an error or handle this differently in a real app context
    pass

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extracts text from a PDF file using pypdf.
    
    Args:
        pdf_path (str): The file system path to the PDF file.
        
    Returns:
        str: The extracted text content.
    """
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return ""
