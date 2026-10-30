from fastapi import FastAPI, UploadFile, HTTPException
from workflow import app_graph
import time

app = FastAPI(title="Multi Agent Code Review System")

@app.post("/api/review")
async def review_code(file: UploadFile):
    if not file.filename.endswith(".py"):
        raise HTTPException(status_code=400, detail="Only supports uploading Python files with the .py extension")


    raw = await file.read()

    if len(raw) > 1024 * 1024:
        raise HTTPException(status_code=400, detail="Please upload a file smaller than 1MB")

    try:
        code_text = raw.decode("utf-8")

    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding error, only UTF-8 is supported")

    start_time = time.time()

    result = await app_graph.ainvoke({"code": code_text})

    end_time =time.time()

    return {
        "status": "success",
        "report": result["final_report"],
        "duration": round(end_time - start_time, 2)
    }