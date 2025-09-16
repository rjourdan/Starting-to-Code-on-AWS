from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="CORS Debug API")

# Configure CORS with detailed logging
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For testing, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "CORS Debug API is working"}

if __name__ == "__main__":
    print("Starting CORS Debug API on http://localhost:8001")
    print("This will help diagnose CORS issues between frontend and backend")
    uvicorn.run(app, host="0.0.0.0", port=8001)