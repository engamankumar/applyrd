import uvicorn
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"status": "alive", "port": 8005}

@app.get("/test")
async def test():
    return {"message": "Success from 8005!"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8005)
