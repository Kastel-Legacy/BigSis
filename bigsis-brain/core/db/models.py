from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, declarative_base
from pgvector.sqlalchemy import Vector
import uuid
from .database import Base

# 1. Sources
class Source(Base):
    __tablename__ = "sources"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False) # pubmed, journal, etc.
    homepage_url = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

# 2. Documents
class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"))
    external_type = Column(String, nullable=False) # pmid, doi, url, file
    external_id = Column(String, nullable=False)
    title = Column(String)
    language = Column(String, default="en")
    doc_type = Column(String, nullable=False) # paper, guideline, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    __table_args__ = (UniqueConstraint('external_type', 'external_id', name='uq_doc_external'),)
    
    source = relationship("Source")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")

# 3. Document Versions
class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    version_no = Column(Integer, nullable=False)
    status = Column(String, nullable=False) # draft, published, etc.
    published_at = Column(DateTime(timezone=True))
    content_hash = Column(String, nullable=False)
    raw_storage_uri = Column(String)
    extracted_text = Column(Text)
    extraction_quality = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    __table_args__ = (UniqueConstraint('document_id', 'version_no', name='uq_doc_version'),)
    
    document = relationship("Document", back_populates="versions")
    chunks = relationship("Chunk", back_populates="version", cascade="all, delete-orphan")
    scope_maps = relationship("DocScopeMap", back_populates="version", cascade="all, delete-orphan")

# 4. Scopes
class Scope(Base):
    __tablename__ = "scopes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope_key = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("scopes.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

# 5. Doc Scope Map
class DocScopeMap(Base):
    __tablename__ = "doc_scope_map"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_version_id = Column(UUID(as_uuid=True), ForeignKey("document_versions.id"), nullable=False)
    scope_id = Column(UUID(as_uuid=True), ForeignKey("scopes.id"), nullable=False)
    relevance_score = Column(Float, default=0.0)
    assigned_by = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    version = relationship("DocumentVersion", back_populates="scope_maps")
    scope = relationship("Scope")

# 6. Chunks
class Chunk(Base):
    __tablename__ = "chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_version_id = Column(UUID(as_uuid=True), ForeignKey("document_versions.id"), nullable=False)
    chunk_no = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    char_start = Column(Integer)
    char_end = Column(Integer)
    text_hash = Column(String, nullable=False)
    embedding = Column(Vector(1536)) # OpenAI dimensions
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    __table_args__ = (UniqueConstraint('document_version_id', 'chunk_no', name='uq_chunk_no'),)
    
    
    version = relationship("DocumentVersion", back_populates="chunks")

# --- ONTOLOGY / KNOWLEDGE GRAPH (Legacy V1 + V2 Compatible) ---

class FaceArea(Base):
    __tablename__ = "face_areas"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text)

class WrinkleType(Base):
    __tablename__ = "wrinkle_types"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(Text)

# --- PROCEDURES (V2 Knowledge Base) ---

class Procedure(Base):
    __tablename__ = "procedures"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    
    # Clinical Details
    # Clinical Details
    downtime = Column(String) # e.g. "2-3 jours", "Aucun"
    price_range = Column(String) # e.g. "300-500€"
    duration = Column(String) # e.g. "30 min"
    pain_level = Column(String) # e.g. "Faible"
    
    # Classification
    category = Column(String) # e.g. "Injectable", "Laser", "Chirurgie"
    tags = Column(ARRAY(String)) # e.g. ["Eclat", "Volume", "Rides"]
    
    # RAG
    embedding = Column(Vector(1536))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# (Legacy tables removed or commented out if unused, relying on Tags/Vector for matching now)
# If we need structured relations later, we can add them back. 


# --- AUDIT / TRACE ---

from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

# ... (imports)

# ... inside DecisionTrace class ...
class DecisionTrace(Base):
    __tablename__ = "decision_traces"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    input_snapshot = Column(JSONB)
    rules_triggered = Column(ARRAY(String)) # Reverted to ARRAY for Prod DB compatibility
    evidence_used = Column(JSONB) 
    final_output = Column(JSONB)
    user_feedback = Column(JSONB, nullable=True)

# --- PRODUCTS / INGREDIENTS ---

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True, index=True)
    inci_name = Column(String, unique=True, index=True)
    description = Column(Text)
    category = Column(String, index=True) # e.g. "Anti-âge"
    efficacy_rating = Column(String, index=True) # "High", "Medium", "Low"
    min_concentration = Column(Float)
    safety_profile = Column(Text)
    evidence_source = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # [NEW] Scanner Fields
    synonyms = Column(ARRAY(String))
    mesh_terms = Column(ARRAY(String))

class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ean = Column(String, unique=True, index=True)
    brand = Column(String)
    name = Column(String)
    image_url = Column(String)
    inci_text_raw = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProductIngredient(Base):
    __tablename__ = "product_ingredients"

    id = Column(Integer, primary_key=True, index=True) # Join table usually just needs simple ID or composite PK
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'))
    ingredient_id = Column(UUID(as_uuid=True), ForeignKey('ingredients.id'))
    rank = Column(Integer) # Position in INCI list

class EvidenceClaim(Base):
    __tablename__ = "evidence_claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ingredient_id = Column(UUID(as_uuid=True), ForeignKey('ingredients.id'))
    indication = Column(String) # e.g. "wrinkles", "acne"
    outcome = Column(String) # "positive", "negative", "inconclusive"
    confidence_level = Column(String) # "High", "Medium", "Low"
    pmid = Column(String)
    study_type = Column(String) # "Meta-Analysis", "RCT"
    summary = Column(Text)
    year = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserProduct(Base):
    __tablename__ = "user_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), index=True) # Linking to generic User ID
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'))
    status = Column(String) # "in_use", "finished", "wishlist"
    date_added = Column(DateTime(timezone=True), server_default=func.now())

# --- SOCIAL / STUDIO ---

class SocialGeneration(Base):
    __tablename__ = "social_generations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic = Column(String, index=True)
    language = Column(String, default="fr")
    content = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String, server_default="published", nullable=False, index=True)


# --- FICHE FEEDBACK ---

class FicheFeedback(Base):
    __tablename__ = "fiche_feedbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fiche_slug = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=True)
    rating = Column(Integer, nullable=False)       # 1 = thumbs down, 5 = thumbs up
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# --- TREND INTELLIGENCE ---

class TrendTopic(Base):
    __tablename__ = "trend_topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titre = Column(String, nullable=False)
    topic_type = Column(String, nullable=False)  # procedure, ingredient, combinaison, mythes, comparatif
    description = Column(Text)
    zones = Column(ARRAY(String))  # front, glabelle, pattes_doie
    search_queries = Column(ARRAY(String))  # Pre-generated PubMed queries

    # Expert scores
    score_marketing = Column(Float, default=0.0)
    justification_marketing = Column(Text)
    score_science = Column(Float, default=0.0)
    justification_science = Column(Text)
    references_suggerees = Column(JSONB)  # [{titre, pmid, annee}]
    score_knowledge = Column(Float, default=0.0)
    justification_knowledge = Column(Text)
    score_composite = Column(Float, default=0.0)

    # Status workflow
    status = Column(String, default="proposed")  # proposed, approved, learning, ready, rejected, stagnated
    recommandation = Column(String)  # APPROUVER, REPORTER, REJETER

    # TRS (Topic Readiness Score)
    trs_current = Column(Float, default=0.0)
    trs_details = Column(JSONB)  # {docs, chunks, diversity, recency, coverage, atlas}

    # Learning pipeline tracking
    learning_iterations = Column(Integer, default=0)
    last_learning_delta = Column(Float, default=0.0)  # TRS gain of last iteration
    learning_log = Column(JSONB)  # [{iteration, queries, new_chunks, trs_before, trs_after}]

    # Batch tracking
    batch_id = Column(String, index=True)  # Groups topics from same discovery session

    # Raw signals that informed this discovery (auditable source evidence)
    raw_signals = Column(JSONB, nullable=True)  # {pubmed: [...], reddit: [...], crossref: [...]}

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# --- SHARED DIAGNOSTICS (Viral Loop) ---

class SharedDiagnostic(Base):
    __tablename__ = "shared_diagnostics"

    id = Column(String(8), primary_key=True, default=lambda: uuid.uuid4().hex[:8])
    area = Column(String, nullable=False)           # front, glabelle, pattes_oie
    wrinkle_type = Column(String, nullable=False)    # expression, statique
    uncertainty_level = Column(String)                # low, medium, high
    score = Column(Integer)                           # 9, 6, or 3
    top_recommendation = Column(Text)
    questions_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# --- USER ACCOUNTS & RETENTION ---

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supabase_uid = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String)
    skin_type = Column(String)          # normale, grasse, seche, mixte, sensible
    age_range = Column(String)          # 18-25, 26-35, 36-45, 46-55, 55+
    concerns = Column(ARRAY(String))    # ["rides", "taches", "pores"]
    preferences = Column(JSONB)         # notifications, langue, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DiagnosticHistory(Base):
    __tablename__ = "diagnostic_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("user_profiles.supabase_uid"), index=True, nullable=False)
    area = Column(String, nullable=False)
    wrinkle_type = Column(String)
    score = Column(Integer)
    top_recommendation = Column(Text)
    chat_messages = Column(JSONB)       # Saved chat conversation
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("user_profiles.supabase_uid"), index=True, nullable=False)
    procedure_name = Column(String, nullable=False)
    entry_date = Column(DateTime(timezone=True), nullable=False)
    day_number = Column(Integer)        # J+0, J+1, J+7...
    pain_level = Column(Integer)        # 0-10
    swelling_level = Column(Integer)    # 0-10
    satisfaction = Column(Integer)      # 0-10
    notes = Column(Text)
    photo_url = Column(String)          # Optional, Supabase Storage URL
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

