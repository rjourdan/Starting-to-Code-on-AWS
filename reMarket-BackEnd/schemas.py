from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    location: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None

class User(UserBase):
    id: int
    member_since: datetime
    rating: float
    profile_image: Optional[str] = None

    class Config:
        orm_mode = True
        
class ProfileImageResponse(BaseModel):
    url: str

# Category schemas
class CategoryBase(BaseModel):
    name: str
    icon: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    
    class Config:
        orm_mode = True

# Community schemas
class CommunityBase(BaseModel):
    name: str
    description: str
    location: str

class CommunityCreate(CommunityBase):
    pass

class Community(CommunityBase):
    id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

# Product Image schemas
class ProductImageBase(BaseModel):
    url: str
    is_primary: bool = False

class ProductImage(ProductImageBase):
    id: int
    product_id: int
    
    class Config:
        orm_mode = True

# Product schemas
class ProductBase(BaseModel):
    title: str
    description: str
    price: float
    condition: str
    location: str
    preferred_meetup: Optional[str] = None

class ProductCreate(ProductBase):
    category_id: int
    community_ids: Optional[List[int]] = []
    image_urls: Optional[List[str]] = []

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    preferred_meetup: Optional[str] = None
    category_id: Optional[int] = None

class SoldStatusUpdate(BaseModel):
    is_sold: bool

class Product(ProductBase):
    id: int
    created_at: datetime
    is_sold: bool
    seller_id: int
    category_id: int
    images: List[ProductImage] = []
    
    class Config:
        orm_mode = True