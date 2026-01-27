import sys
import os
from fpdf import FPDF

# Add project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.utils.pdf import extract_text_from_pdf

def create_dummy_pdf(filename="test_doc.pdf"):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt="BigSIS Medical Knowledge Extraction Test", ln=1, align="C")
    pdf.cell(200, 10, txt="Botulinum toxin is effective for glabellar lines.", ln=2, align="L")
    pdf.output(filename)
    return filename

def test():
    print("--- 🧪 Testing PDF Extraction ---")
    
    # 1. Create Dummy PDF
    pdf_path = create_dummy_pdf()
    print(f"✅ Created dummy PDF: {pdf_path}")
    
    # 2. Extract
    try:
        text = extract_text_from_pdf(pdf_path)
        print(f"📄 Extracted Text:\n---\n{text.strip()}\n---")
        
        if "Botulinum toxin" in text:
            print("✅ SUCCESS: Text matched expectations.")
        else:
            print("❌ FAILURE: Text content mismatch.")
            
    except Exception as e:
        print(f"❌ ERROR: Extraction failed with {e}")
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

if __name__ == "__main__":
    test()
