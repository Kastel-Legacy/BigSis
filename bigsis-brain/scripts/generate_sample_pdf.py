from fpdf import FPDF
import os

def create_sample_pdf(filename="sample_botox_guide.pdf"):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    
    # Title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="Clinical Guidelines: Botulinum Toxin Type A", ln=1, align='C')
    pdf.ln(10)
    
    # Body
    pdf.set_font("Arial", size=12)
    content = """
    1. Introduction
    Botulinum toxin type A is a neurotoxic protein produced by the bacterium Clostridium botulinum.
    It is indicated for the temporary improvement in the appearance of moderate to severe glabellar lines
    associated with corrugator and/or procerus muscle activity in adult patients.

    2. Contraindications
    - Hypersensitivity to the active substance or to any of the excipients.
    - Generalized disorders of muscle activity (e.g. myasthenia gravis, Lambert-Eaton syndrome).
    - Presence of infection at the proposed injection sites.
    
    IMPORTANT: Pregnancy and Breastfeeding
    There are no adequate data from the use of Botulinum toxin type A in pregnant women. Studies in animals
    have shown reproductive toxicity. The potential risk for humans is unknown. 
    Botulinum toxin type A should not be used during pregnancy unless clearly necessary.
    It is not known whether botulinum toxin type A is excreted in human milk. The use of Botulinum toxin type A
    during lactation cannot be recommended.

    3. Special Warnings
    Adverse effects may occur from misplaced injections of Botulinum toxin type A that paralyze nearby muscle groups.
    """
    
    pdf.multi_cell(0, 10, content)
    
    output_path = os.path.join("data", filename)
    os.makedirs("data", exist_ok=True)
    pdf.output(output_path)
    print(f"Created sample PDF at: {output_path}")

if __name__ == "__main__":
    create_sample_pdf()
