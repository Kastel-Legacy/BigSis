from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, JSON, Float, Boolean, ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from .database import Base

# --- ONTOLOGY / KNOWLEDGE GRAPH ---

class FaceArea(Base):
    __tablename__ = "face_areas"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)  # e.g., "front", "glabelle"
    description = Column(Text)

class WrinkleType(Base):
    __tablename__ = "wrinkle_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)  # e.g., "expression", "statique"
    description = Column(Text)

class Procedure(Base):
    __tablename__ = "procedures"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # e.g., "toxine_botulique"
    description = Column(Text)
    recovery_time = Column(String) # e.g., "2-4 jours"

class Risk(Base):
    __tablename__ = "risks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True) # e.g., "ptosis"
    description = Column(Text)
    severity = Column(String) # Low, Medium, High

# Relations (Many-to-Many simplified for V1)
class ProcedureIndication(Base):
    __tablename__ = "procedure_indications"
    id = Column(Integer, primary_key=True)
    procedure_id = Column(Integer, ForeignKey("procedures.id"))
    wrinkle_type_id = Column(Integer, ForeignKey("wrinkle_types.id"))
    face_area_id = Column(Integer, ForeignKey("face_areas.id"))

class ProcedureContraindication(Base):
    __tablename__ = "procedure_contraindications"
    id = Column(Integer, primary_key=True)
    procedure_id = Column(Integer, ForeignKey("procedures.id"))
    condition_name = Column(String) # e.g., "pregnancy"

# --- CONTENT / RAG ---

class SourceDocument(Base):
    __tablename__ = "source_documents"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    url = Column(String, nullable=True)
    content_hash = Column(String, unique=True)
    metadata_json = Column(JSON) # Author, PubDate, Reliability
    version = Column(Integer, default=1)
    created_at = Column(TIMESTAMP, server_default=func.now())
    is_published = Column(Boolean, default=False)

class EvidenceChunk(Base):
    __tablename__ = "evidence_chunks"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("source_documents.id"))
    content_text = Column(Text)
    chunk_index = Column(Integer)
    embedding = mapped_column(Vector(1536)) # Assuming OpenAI Ada-002 size
    
    document = relationship("SourceDocument")

# --- AUDIT / TRACE ---

class DecisionTrace(Base):
    __tablename__ = "decision_traces"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    timestamp = Column(TIMESTAMP, server_default=func.now())
    input_snapshot = Column(JSON) # User inputs
    rules_triggered = Column(ARRAY(String)) # List of Rule IDs
    evidence_used = Column(JSON) # List of {doc_id, chunk_id}
    final_output = Column(JSON) # The actual response payload
    user_feedback = Column(JSON, nullable=True)
