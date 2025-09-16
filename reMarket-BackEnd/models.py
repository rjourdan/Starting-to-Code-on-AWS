from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Table, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from passlib.hash import bcrypt

Base = declarative_base()

# Association table for many-to-many relationship between users and communities
user_community = Table(
    'user_community',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('community_id', Integer, ForeignKey('communities.id'), primary_key=True)
)

# Association table for many-to-many relationship between products and communities
product_community = Table(
    'product_community',
    Base.metadata,
    Column('product_id', Integer, ForeignKey('products.id'), primary_key=True),
    Column('community_id', Integer, ForeignKey('communities.id'), primary_key=True)
)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(100))
    full_name = Column(String(100))
    location = Column(String(100))
    member_since = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    rating = Column(Float, default=0.0)
    
    # Relationships
    products = relationship("Product", back_populates="seller")
    communities = relationship("Community", secondary=user_community, back_populates="members")
    
    def set_password(self, password):
        self.hashed_password = bcrypt.hash(password)
    
    def verify_password(self, password):
        return bcrypt.verify(password, self.hashed_password)

class Community(Base):
    __tablename__ = 'communities'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    description = Column(Text)
    location = Column(String(100))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    members = relationship("User", secondary=user_community, back_populates="communities")
    products = relationship("Product", secondary=product_community, back_populates="communities")

class Category(Base):
    __tablename__ = 'categories'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True)
    icon = Column(String(50))  # Icon name for frontend display
    
    # Relationships
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = 'products'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), index=True)
    description = Column(Text)
    price = Column(Float)
    condition = Column(String(50))  # New, Like New, Good, Fair, Poor
    location = Column(String(100))
    preferred_meetup = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_sold = Column(Boolean, default=False)
    
    # Foreign keys
    seller_id = Column(Integer, ForeignKey('users.id'))
    category_id = Column(Integer, ForeignKey('categories.id'))
    
    # Relationships
    seller = relationship("User", back_populates="products")
    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product")
    communities = relationship("Community", secondary=product_community, back_populates="products")

class ProductImage(Base):
    __tablename__ = 'product_images'
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(255))
    is_primary = Column(Boolean, default=False)
    
    # Foreign key
    product_id = Column(Integer, ForeignKey('products.id'))
    
    # Relationship
    product = relationship("Product", back_populates="images")