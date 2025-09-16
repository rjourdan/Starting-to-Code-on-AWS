from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta

from database import get_db, engine
import models
import schemas
from auth import authenticate_user, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

# Create tables in the database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReMarket API")

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to ReMarket API"}

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# User endpoints
@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        location=user.location
    )
    new_user.set_password(user.password)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# Category endpoints
@app.post("/categories/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_category = models.Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.get("/categories/", response_model=List[schemas.Category])
def read_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Category).all()
    return categories

# Community endpoints
@app.post("/communities/", response_model=schemas.Community)
def create_community(community: schemas.CommunityCreate, db: Session = Depends(get_db)):
    db_community = models.Community(**community.dict())
    db.add(db_community)
    db.commit()
    db.refresh(db_community)
    return db_community

@app.get("/communities/", response_model=List[schemas.Community])
def read_communities(db: Session = Depends(get_db)):
    communities = db.query(models.Community).all()
    return communities

# Product endpoints
@app.post("/products/", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_product = models.Product(
        title=product.title,
        description=product.description,
        price=product.price,
        condition=product.condition,
        location=product.location,
        preferred_meetup=product.preferred_meetup,
        seller_id=current_user.id,  # Use the authenticated user's ID
        category_id=product.category_id
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # Add product to communities
    if product.community_ids:
        communities = db.query(models.Community).filter(models.Community.id.in_(product.community_ids)).all()
        db_product.communities.extend(communities)
        db.commit()
    
    # Add product images
    if product.image_urls:
        for i, url in enumerate(product.image_urls):
            image = models.ProductImage(
                url=url,
                is_primary=(i == 0),  # First image is primary
                product_id=db_product.id
            )
            db.add(image)
        db.commit()
    
    return db_product

@app.get("/products/", response_model=List[schemas.Product])
def read_products(
    skip: int = 0, 
    limit: int = 100, 
    category_id: int = None,
    community_id: int = None,
    db: Session = Depends(get_db)
):
    try:
        # Direct SQL query to check products
        result = db.execute(text("SELECT COUNT(*) FROM products"))
        count = result.scalar()
        print(f"Total products in database: {count}")
        
        # Use regular ORM query
        query = db.query(models.Product)
        
        # Debug the filter condition
        print(f"Checking is_sold filter")
        products_all = query.all()
        print(f"All products (without filter): {len(products_all)}")
        
        # Apply filters one by one
        query = query.filter(models.Product.is_sold == False)
        products_not_sold = query.all()
        print(f"Products not sold: {len(products_not_sold)}")
        
        if category_id:
            query = query.filter(models.Product.category_id == category_id)
            print(f"After category filter: {len(query.all())}")
        
        if community_id:
            query = query.join(models.product_community).filter(models.product_community.c.community_id == community_id)
            print(f"After community filter: {len(query.all())}")
        
        products = query.order_by(models.Product.created_at.desc()).offset(skip).limit(limit).all()
        
        # Debug output
        print(f"Final products query returned {len(products)} items")
        for product in products:
            print(f"Product: {product.id}, {product.title}, Category: {product.category_id}, Sold: {product.is_sold}")
            
        return products
    except Exception as e:
        print(f"Error in read_products: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/products/{product_id}", response_model=schemas.Product)
def read_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)