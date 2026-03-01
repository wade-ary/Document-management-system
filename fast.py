from fastapi import FastAPI, HTTPException, Request, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from backend.storage import upload_file, list_dir, delete_file, move_file, update_tags, list_files_for_user
from backend.search import search_files, search_files_only_text
from backend.agent import initialize_agent_with_tools
from backend.view_file import view_file
from backend.dataextraction import (
    start_extraction_job,
    get_job_status,
    get_extraction,
    get_overlays,
)
from backend.db import MongoDB
import os
from bson import ObjectId
import dotenv

dotenv.load_dotenv()

app = FastAPI()

# Configure CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def index():
    return {"message": "Hello, World!"}

@app.post("/upload")
async def upload_files_endpoint(
    files: list[UploadFile], path: str = Form(...), user_id: str = Form(...)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    saved_files = []
    for file in files:
        response = upload_file(user_id, file.file, path)
        if response[1] == 200:
            saved_files.append(file.filename)
        else:
            return JSONResponse(content=response, status_code=response[1])

    return {"message": "Files successfully uploaded", "files": saved_files}


# ------------------- Minimal GridFS document APIs ------------------- #
@app.post("/api/documents")
async def api_upload_document_to_gridfs(files: list[UploadFile]):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    file = files[0]
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF supported")
    fs = MongoDB.get_fs(os.getenv("MONGO_DB_NAME", "EDUDATA"))
    data = await file.read()
    file_id = fs.put(data, filename=file.filename, contentType="application/pdf")
    return {"doc_id": str(file_id), "file_id": str(file_id)}


@app.get("/api/objects/{file_id}")
async def api_get_object(file_id: str):
    fs = MongoDB.get_fs(os.getenv("MONGO_DB_NAME", "EDUDATA"))
    try:
        grid_out = fs.get(ObjectId(file_id))
        data = grid_out.read()
        ct = getattr(grid_out, "contentType", None) or "application/octet-stream"
        return Response(content=data, media_type=ct, headers={"Content-Disposition": f"inline; filename={grid_out.filename}"})
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/documents/{doc_id}/extract")
async def api_start_extraction(doc_id: str, request: Request):
    data = await request.json()
    file_id = data.get("file_id")
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id is required")
    job_id = start_extraction_job(file_id=file_id, doc_id=doc_id)
    return {"job_id": job_id, "doc_id": doc_id}


@app.get("/api/jobs/{job_id}")
async def api_job_status(job_id: str):
    return get_job_status(job_id)


@app.get("/api/documents/{doc_id}/extractions")
async def api_get_extraction(doc_id: str):
    return get_extraction(doc_id)


@app.get("/api/documents/{doc_id}/pages/{page}/overlays")
async def api_get_overlays(doc_id: str, page: int):
    return get_overlays(doc_id, page)


@app.post("/listdir")
async def listdir(request: Request):
    """
    Return files that the requesting user's department has access to.

    Expects JSON body with:
      - user_id: the requesting user's id (required)

    Rules:
      - Return documents where access is 'all' OR access_to includes the user's department
        (supports CSV stored in access_to) OR documents whose `departments` array
        or legacy `department` field contains the user's department.

    Note: this intentionally does NOT filter by path, approvalStatus, or visible.
    """
    data = await request.json()
    user_id = data.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    return list_files_for_user(user_id)


@app.post("/delete")
async def delete_file_endpoint(request: Request):
    data = await request.json()
    file_name = data.get("file_name")
    path = data.get("path")
    if not file_name or not path:
        raise HTTPException(status_code=400, detail="File name and path must be provided.")
    return delete_file(file_name, path)


@app.post("/move")
async def move_file_endpoint(request: Request):
    data = await request.json()
    file_name = data.get("file_name")
    current_path = data.get("current_path")
    new_path = data.get("new_path")
    if not file_name or not current_path or not new_path:
        raise HTTPException(status_code=400, detail="File name, current path, and new path must be provided.")
    return move_file(file_name, current_path, new_path)


@app.post("/update_tags")
async def update_tags_endpoint(request: Request):
    data = await request.json()
    file_name = data.get("file_name")
    path = data.get("path", "~/Sandbox")
    tags = data.get("tags")
    return update_tags(file_name, path, tags)


@app.post("/view_file")
async def view_file_endpoint(request: Request):
    data = await request.json()
    file_path = data.get("file_path")
    if not file_path:
        raise HTTPException(status_code=400, detail="File path must be provided.")
    return FileResponse(view_file(file_path))


@app.post("/search/assisted")
async def search_assisted(request: Request):
    data = await request.json()
    query = data.get("query", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="No query provided.")
    return search_files_only_text(query=query)


@app.post("/search/extensive")
async def extensive_search(request: Request):
    data = await request.json()
    search_text = data.get("searchText", "").strip()
    file_types = data.get("fileType", [])
    custom_tags = data.get("customTags", [])
    date_range = tuple(data.get("dateRange", []))
    return search_files(query=search_text, file_types=file_types, tags=custom_tags, date_range=date_range)


@app.post("/agent")
async def agent_endpoint(request: Request):
    data = await request.json()
    query = data.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="No query provided.")
    agent = initialize_agent_with_tools()
    response = agent.invoke(query)
    return response
