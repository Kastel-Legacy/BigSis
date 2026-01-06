from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
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
