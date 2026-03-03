import os
import dotenv
dotenv.load_dotenv()  # Load env vars FIRST before any other imports

os.environ["ENABLE_MARKSHEET"] = "1"
import traceback
import threading
import queue
from flask import Flask, json, jsonify, request,Response
from datetime import datetime
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import logging
import mimetypes
import gridfs
import io
from bson import ObjectId
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.exceptions import HTTPException
from werkzeug.datastructures import FileStorage

# module imports
from backend.agent import initialize_agent_with_tools
from backend.main import analyze_file
from backend.new_extract import ask_file, extract_text_from_file
from backend.query_classifier import classify_query
from backend.retrieval import single_hop_retrieval, multi_hop_retrieval
from backend.guardrails import get_search_availability, notify_backend_tech
from backend.blurb import start_blurb_background, get_blurb_cached, get_blurb_cached_by_query
from backend.precedent_finder import find_precedents
from backend.storage import (
    create_new_dir,
    delete_dir,
    delete_file,
    list_dir,
    list_dir_by_department,
    list_dir_by_user,
    move_file,
    req_upload,
    update_tags,
    upload_file,
)
# New helper for user-aware listing
from backend.storage import list_files_for_user
from backend.department_utils import get_documents_by_departments, get_department_summary, get_cross_department_documents
from backend.users import fetch_user_details, sign_up
from backend.view_file import view_file, read_aloud
from backend.compliance_summary import analyze_document
from backend.RAG import finetune_search, retrieval_augmented_generation
import secrets
from backend.dataextraction import (
    extract_kie_from_folder,
    get_kie,
    generate_graphs,
    generate_graphs_gemini,
    run_paddle_ocr_extraction,
    start_extraction_job,
    get_job_status,
    get_extraction,
    get_overlays,
)
from backend.table_extraction import extract_tables_vector_pdf, extract_tables_scanned_pdf
from backend.pdf_utils import is_vector_pdf, pdf_to_images
# External app module imports
from external_app import external_bp
from backend.documents_api import documents_api_bp
from backend.redaction import redact_pii_in_pdf,check_sensitive_data_in_file
from backend.compliance_api import register_compliance_routes, process_file_for_compliance
# Sharing API import
from backend.sharing_api import register_sharing_routes
# Discussions API import
from backend.discussions_api import discussions_api
# Email notifications import
from backend.email_notifications import init_email_service, EmailNotifications, get_email_notifications
# Import summary and action points modules
from backend.summary import generate_department_summaries, get_document_summary
from backend.actionpoints import generate_action_points, get_action_points_for_department
# Import document type suggestion service
from backend.document_type_suggestion import document_type_suggestion_service
from backend.document_chat.gemini_web_search import run_gemini_web_search
from backend.circulars import register_circular_routes
# Import agent API for agentic AI
from backend.agent_api import register_agent_routes

app = Flask(__name__)
app.secret_key = secrets.token_urlsafe(16)
app.register_blueprint(external_bp)
app.register_blueprint(documents_api_bp)
register_compliance_routes(app)
register_sharing_routes(app)
app.register_blueprint(discussions_api)
register_circular_routes(app)
register_agent_routes(app)  # Register agentic AI routes
SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')

# Initialize email service
mail = init_email_service(app)
email_notifications = EmailNotifications(mail, app)

# Update the global email_notifications variable
from backend.email_notifications import set_email_notifications
set_email_notifications(email_notifications)


# dotenv already loaded at top of file
CLERK_AUTH_TOKEN = os.getenv("CLERK_AUTH_TOKEN")
DEVELOPMENT_MODE = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"
logging.getLogger("flask_cors").setLevel(logging.WARNING)
ALLOWED_EXTENSIONS = {"txt", "docx", "pdf", "md", "ppt", "pptx", "png", "jpg", "jpeg"}

# Simple CORS configuration that works for everything
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": "*"
    }
})


# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
from backend.db import MongoDB

db = MongoDB.get_db('EDUDATA')
fs = MongoDB.get_fs('EDUDATA')  # Use EDUDATA database for all GridFS storage
metadata_collection = db["metadata"]  # stores user data such as name, email, etc.
actions_collection = db["actions"]  # store all the actions performed by the user
external_clients_collection = db["external_clients"]  # store external client details
directories_collection = db["directories"]  # store directory paths
user_collection = db['users']  # store user details

print("Connected to MongoDB")

# Initialize background email task queue for asynchronous email processing
# This improves upload performance by moving email notifications to background threads
email_task_queue = queue.Queue()

def email_worker():
    """Background worker for processing email tasks"""
    while True:
        try:
            task = email_task_queue.get(timeout=1)
            if task is None:  # Shutdown signal
                break
            
            task_type = task.get('type')
            if task_type == 'upload_notification':
                send_upload_notification(task)
            elif task_type == 'compliance_notification':
                send_compliance_notification(task)
            
            email_task_queue.task_done()
        except queue.Empty:
            continue
        except Exception as e:
            print(f"Error in email worker: {e}")
            if 'task' in locals():
                email_task_queue.task_done()


def extract_email_address(email_field):
    """
    Extract clean email address from complex email JSON strings.
    Handles formats like:
    - Simple email: "user@example.com"
    - JSON string: '{"value":[{"address":"user@example.com","name":"User Name"}],...}'
    - Dict/List objects
    - Already clean: just returns the input
    
    Returns the first email address found or the original input if parsing fails.
    """
    if not email_field:
        return email_field
        
    # Handle non-string inputs (dict, list)
    if isinstance(email_field, (dict, list)):
        try:
            # If it's a list, take the first item
            if isinstance(email_field, list):
                if len(email_field) > 0:
                    # If list of dicts, recurse on first item
                    return extract_email_address(email_field[0])
                else:
                    return ""
            
            # If it's a dict
            if isinstance(email_field, dict):
                # Check for value array with address field (n8n/Gmail format)
                if "value" in email_field:
                    value = email_field["value"]
                    if isinstance(value, list) and len(value) > 0:
                        first_entry = value[0]
                        if isinstance(first_entry, dict) and "address" in first_entry:
                            return first_entry["address"]
                
                # Check for direct address field
                if "address" in email_field:
                    return email_field["address"]
                    
                # Check for text field which might contain "Name <email>"
                if "text" in email_field:
                    text = email_field["text"]
                    if "<" in text and ">" in text:
                        return text.split("<")[1].split(">")[0]
                    return text
        except Exception:
            pass
        # If we couldn't extract from dict/list, return string representation or empty
        return str(email_field) if email_field else ""

    if not isinstance(email_field, str):
        return str(email_field)
    
    email_field = email_field.strip()
    
    # If it looks like JSON (starts with { or [), try to parse it
    if email_field.startswith('{') or email_field.startswith('['):
        try:
            parsed = json.loads(email_field)
            # Recursively call with parsed object
            return extract_email_address(parsed)
        except (json.JSONDecodeError, KeyError, IndexError, TypeError):
            pass

    # If it looks like a JSON string (starts with "), try to unquote it
    if email_field.startswith('"'):
        try:
            parsed = json.loads(email_field)
            if isinstance(parsed, str):
                return extract_email_address(parsed)
            if isinstance(parsed, (dict, list)):
                return extract_email_address(parsed)
        except:
            pass
            
    # Handle case where string is quoted like '"user@example.com"' but json.loads failed
    if (email_field.startswith('"') and email_field.endswith('"')) or (email_field.startswith("'") and email_field.endswith("'")):
        clean = email_field[1:-1]
        # If the inner string looks like JSON, try to parse it
        if clean.startswith('{') or clean.startswith('['):
             return extract_email_address(clean)
        # Check for <email> in the clean string
        if "<" in clean and ">" in clean:
             return extract_email_address(clean)
        # If it's just a simple string inside quotes, return it (unless it has <email>)
        return clean
    
    # Handle "Name <email>" format in plain string
    if "<" in email_field and ">" in email_field:
        try:
            return email_field.split("<")[1].split(">")[0]
        except:
            pass
    
    # Return original if no parsing was successful
    return email_field

# Start background email worker thread
email_thread = threading.Thread(target=email_worker, daemon=True)
email_thread.start()

# Initialize search engine
from backend.search_init import init_search_engine
try:
    init_search_engine()
except Exception as e:
    logging.error(f"Search engine initialization failed: {e}")
    # Continue without search functionality


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def send_upload_notification(task_data):
    """Send upload notification email in background"""
    try:
        file_name = task_data.get('file_name')
        user_email = task_data.get('user_email')
        user_name = task_data.get('user_name', 'User')
        department = task_data.get('department', 'Unknown')
        file_path = task_data.get('file_path', '')
        
        if not user_email:
            print(f"No email address found for upload notification: {file_name}")
            return
        
        # Get email notifications instance
        email_notif = get_email_notifications()
        if email_notif:
            email_notif.send_upload_notification(
                recipient_email=user_email,
                recipient_name=user_name,
                file_name=file_name,
                department=department,
                file_path=file_path
            )
            print(f"Upload notification sent successfully to {user_email} for file: {file_name}")
        else:
            print("Email notifications service not available")
            
    except Exception as e:
        print(f"Failed to send upload notification: {e}")


def send_compliance_notification(task_data):
    """Send compliance analysis notification email in background"""
    try:
        file_name = task_data.get('file_name')
        user_email = task_data.get('user_email')
        user_name = task_data.get('user_name', 'User')
        compliance_result = task_data.get('compliance_result')
        
        if not user_email or not compliance_result:
            print(f"Insufficient data for compliance notification: {file_name}")
            return
        
        # Get email notifications instance
        email_notif = get_email_notifications()
        if email_notif:
            # Send compliance notification with analysis results
            email_notif.send_compliance_notification(
                recipient_email=user_email,
                recipient_name=user_name,
                file_name=file_name,
                risk_level=compliance_result.get('riskLevel', 'Unknown'),
                keywords=compliance_result.get('keywords', []),
                deadline=compliance_result.get('deadline')
            )
            print(f"Compliance notification sent successfully to {user_email} for file: {file_name}")
        else:
            print("Email notifications service not available")
            
    except Exception as e:
        print(f"Failed to send compliance notification: {e}")


def queue_upload_notification(file_name, user_email, user_name=None, department=None, file_path=None):
    """Queue an upload notification to be sent in background"""
    try:
        task = {
            'type': 'upload_notification',
            'file_name': file_name,
            'user_email': user_email,
            'user_name': user_name or 'User',
            'department': department or 'Unknown',
            'file_path': file_path or ''
        }
        email_task_queue.put(task)
        print(f"Queued upload notification for {file_name} to {user_email}")
    except Exception as e:
        print(f"Failed to queue upload notification: {e}")


def queue_compliance_notification(file_name, user_email, user_name=None, compliance_result=None):
    """Queue a compliance notification to be sent in background"""
    try:
        task = {
            'type': 'compliance_notification',
            'file_name': file_name,
            'user_email': user_email,
            'user_name': user_name or 'User',
            'compliance_result': compliance_result
        }
        email_task_queue.put(task)
        print(f"Queued compliance notification for {file_name} to {user_email}")
    except Exception as e:
        print(f"Failed to queue compliance notification: {e}")


@app.errorhandler(HTTPException)
def handle_exception(e):
    """Return JSON instead of HTML for HTTP errors."""
    response = e.get_response()
    response.data = json.dumps(
        {
            "code": e.code,
            "name": e.name,
            "description": e.description,
        }
    )
    response.content_type = "application/json"
    return response


@app.route("/")
def index():
    return "<p>Hello, SIH 2025!</p>"


@app.post("/api/ocr/paddle")
def api_paddle_ocr():
    """
    Run PaddleOCR on a PDF in GridFS.
    Body: {"file_id": "<gridfs id>", "doc_id": "optional logical doc id"}
    Returns stored extraction payload with pages and OCR blocks.
    """
    try:
        data = request.get_json(force=True)
        file_id = data.get("file_id")
        doc_id = data.get("doc_id")
        if not file_id:
            return jsonify({"error": "file_id is required"}), 400
        payload = run_paddle_ocr_extraction(file_id=file_id, doc_id=doc_id)
        return jsonify(payload), 200
    except Exception as e:
        app.logger.exception("/api/ocr/paddle failed")
        return jsonify({"error": str(e)}), 500


# NOTE: /api/documents (GET, POST) is handled by backend/documents_api.py blueprint.


@app.get("/api/objects/<file_id>")
def api_get_object(file_id):
    try:
        grid_out = fs.get(ObjectId(file_id))
        data = grid_out.read()

        # Improve content type detection for PDFs and images
        ct = getattr(grid_out, "contentType", None)
        if not ct and grid_out.filename:
            lower = grid_out.filename.lower()
            if lower.endswith('.pdf'):
                ct = "application/pdf"
            elif lower.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                ext = lower.split('.')[-1]
                # normalize jpg to jpeg
                if ext == 'jpg':
                    ext = 'jpeg'
                ct = f"image/{ext}"
            else:
                ct = "application/octet-stream"
        elif not ct:
            ct = "application/octet-stream"

        # Allow forcing download via query param (?download=1|true)
        download_param = request.args.get("download", "").lower()
        force_download = download_param in {"1", "true", "yes", "download"}
        disp_type = "attachment" if force_download else "inline"
        filename = grid_out.filename or f"object_{file_id}"

        return Response(
            data,
            content_type=ct,
            headers={
                "Content-Disposition": f"{disp_type}; filename={filename}"
            },
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 404


@app.post("/api/documents/<doc_id>/extract")
def api_start_extraction(doc_id):
    data = request.get_json(force=True)
    file_id = data.get("file_id")
    if not file_id:
        return jsonify({"error": "file_id is required"}), 400
    job_id = start_extraction_job(file_id=file_id, doc_id=doc_id)
    return jsonify({"job_id": job_id, "doc_id": doc_id}), 202


@app.get("/api/jobs/<job_id>")
def api_job_status(job_id):
    return jsonify(get_job_status(job_id)), 200


@app.get("/api/documents/<doc_id>/extractions")
def api_get_extraction(doc_id):
    return jsonify(get_extraction(doc_id)), 200


@app.get("/api/documents/<doc_id>/pages/<int:page>/overlays")
def api_get_overlays(doc_id, page):
    return jsonify(get_overlays(doc_id, page)), 200


def trigger_compliance_analysis(file_id: str, file_name: str, extracted_text: str, user_id: str = None):
    """Trigger compliance analysis for uploaded files from directory"""
    try:
        # If compliance already computed during ingestion, reuse it
        existing = metadata_collection.find_one(
            {"file_id": file_id}, {"compliance": 1, "_id": 0}
        )
        compliance_result = (existing or {}).get("compliance")

        # Otherwise call the compliance analysis function now
        if not compliance_result:
            compliance_result = process_file_for_compliance(
                file_id=file_id,
                filename=file_name,
                extracted_text=extracted_text,
                user_id=user_id
            )
        
        if compliance_result:
            print(f"DEBUG: compliance_result keys: {list(compliance_result.keys())}")
            print(f"DEBUG: riskMatrix present: {'riskMatrix' in compliance_result}")
            print(f"DEBUG: radarChart present: {'radarChart' in compliance_result}")
            if 'riskMatrix' in compliance_result:
                print(f"DEBUG: riskMatrix data: {compliance_result['riskMatrix']}")
            if 'radarChart' in compliance_result:
                print(f"DEBUG: radarChart data: {compliance_result['radarChart']}")
            
            # Queue compliance notification email (async)
            if user_id:
                try:
                    user_doc = user_collection.find_one({"user_id": user_id}, {"email": 1, "username": 1, "_id": 0})
                    if user_doc and user_doc.get("email"):
                        queue_compliance_notification(
                            file_name=file_name,
                            user_email=user_doc["email"],
                            user_name=user_doc.get("username", "User"),
                            compliance_result=compliance_result
                        )
                except Exception as e:
                    print(f"Failed to queue compliance notification: {e}")
            
            return {
                'success': True,
                'compliance_item': {
                    'id': compliance_result.get('id'),
                    'title': compliance_result.get('title'),
                    'riskLevel': compliance_result.get('riskLevel'),
                    'department': compliance_result.get('department'),
                    'deadline': compliance_result.get('deadline'),
                    'keywords': compliance_result.get('keywords'),
                    'status': 'Analysis completed',
                    'source': compliance_result.get('source'),
                    'description': compliance_result.get('description'),
                    'extractedDate': compliance_result.get('extractedDate'),
                    'riskMatrix': compliance_result.get('riskMatrix'),
                    'radarChart': compliance_result.get('radarChart')
                }
            }
        else:
            return {
                'success': False,
                'message': 'Compliance analysis failed'
            }
    except Exception as e:
        print(f"Error in compliance analysis: {e}")
        return {
            'success': False,
            'message': f'Compliance analysis error: {str(e)}'
        }


@app.route("/api/compliance/processing-status", methods=["GET"])
def get_compliance_processing_status():
    """Get processing status for compliance analysis - for UI display"""
    try:
        # This endpoint returns the status that matches your UI image
        return jsonify({
            'success': True,
            'analysis': {
                'title': 'AI-Powered Document Analysis',
                'features': [
                    'Automatic text extraction from PDFs and images (OCR)',
                    'Intelligent keyword and deadline detection',
                    'Risk level assessment and compliance categorization',
                    'Department routing and action item extraction'
                ],
                'processing_status': {
                    'status': 'completed',
                    'progress': 100,
                    'message': 'Analysis completed'
                }
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route("/upload", methods=["POST"])
def upload_files_endpoint():
    """
    Handles file uploads and checks if the document is machine-readable (MR).
    Sends email notification on successful upload.
    """
    try:
        if "files" not in request.files:
            return jsonify({"error": "No files part in the request"}), 400

        files = request.files.getlist("files")
        path = request.form.get("path")
        user_id = request.form.get("user_id")
        account_type = request.form.get("account_type")
        department = request.form.get("department")
        access_to = request.form.get("access_to")
        document_type = request.form.get("document_type")
        
        
        uploaded_by = None
        try:
            user_doc = user_collection.find_one({"user_id": user_id}, {"account_type": 1, "department": 1, "_id": 0})
            if user_doc:
                account_type_db = user_doc.get("account_type")
                if account_type_db == "Admin":
                    uploaded_by = "admin"
                    department = "admin"
                elif account_type_db == "Staff" and user_doc.get("department"):
                    uploaded_by = user_doc.get("department")
        except Exception as e:
            print(f"Error looking up uploaded by details: {e}")
        
        important = request.form.get("important")

        if not path:
            return jsonify({"error": "No path specified"}), 400

        saved_files = []
        for file in files:
            # Check if the file is machine-readable
            file.seek(0)  # Reset file pointer
            content_type, _ = mimetypes.guess_type(file.filename)


            # put in fs

            # Pass uploaded_by and optional deadline to upload_file so the backend knows who performed the upload
            # METADATA COLLECTIONS APPEND HAPPENS HERE
            print(f"Attempting to upload file: {file.filename}")
            print(f"User ID: {user_id}")
            print(f"Path: {path}")
            print(f"Department: {department}")
            
            file_id, status_code = upload_file(
                user_id,
                file,
                path,
                account_type,
                department,
                access_to,
                important,
                uploaded_by=uploaded_by,
                deadline=request.form.get("deadline"),
                document_type=document_type,
            )

            print(f"Upload result - File ID: {file_id}, Status: {status_code}")

            # Check if upload failed
            if file_id is None or status_code != 200:
                print(f"Upload failed for {file.filename}: Status {status_code}")
                return jsonify({"error": f"File upload failed for {file.filename}. Status: {status_code}"}), status_code

            # Safely get extracted text with null check
            metadata_doc = metadata_collection.find_one({"file_id": file_id}, {"extracted_text": 1, "_id": 0})
            if not metadata_doc:
                return jsonify({"error": "File metadata not found after upload"}), 500
            
            extracted_text = metadata_doc.get("extracted_text", "")
            file.seek(0)  # Reset file pointer for further operations

            if extracted_text.strip():  # If text was successfully extracted
                # Machine-Readable
                
                if status_code == 200:
                    saved_files.append(file.filename)
                    
                    # Queue email notification for successful upload (async)
                    try:
                        user_doc = user_collection.find_one({"user_id": user_id}, {"email": 1, "username": 1, "_id": 0})
                        if user_doc and user_doc.get("email"):
                            queue_upload_notification(
                                file_name=file.filename,
                                user_email=user_doc["email"],
                                user_name=user_doc.get("username", "User"),
                                department=department,
                                file_path=path
                            )
                    except Exception as e:
                        print(f"Failed to queue email notification: {e}")
                    
                    # Auto-approve upload (no admin approval required)
                    approve_result = approve_file_upload(file_id, approver_id=user_id)
                    if approve_result[1] == 200:
                        # Trigger compliance analysis for the uploaded file
                        compliance_result = trigger_compliance_analysis(
                            file_id=file_id,
                            file_name=file.filename,
                            extracted_text=extracted_text,
                            user_id=user_id
                        )
                        
                        response_data = {
                            "MR": 1, 
                            "message": "Document uploaded and auto-approved",
                            "compliance_analysis": compliance_result
                        }
                        
                        print(f"DEBUG: Upload response data: {response_data}")
                        print(f"DEBUG: compliance_analysis keys: {list(compliance_result.keys()) if compliance_result else 'None'}")
                        
                        return jsonify(response_data), 200
                else:
                    return file_id  # Return the error response from upload_file
            else:
                # Not Machine-Readable
                return jsonify({"MR": 0, "message": "Still want to proceed?"}), 200

        return jsonify(
            {"message": "Files successfully uploaded", "files": saved_files}
        ), 200

    except Exception as e:
        print(f"Error in upload endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route("/webhook", methods=["POST"])
def webhook_ingest():
    """
    Ingest files from external systems (e.g., n8n) and forward them to the upload pipeline.

    Supports two formats:
    - multipart/form-data: files in request.files and optional form fields
    - application/json: base64 attachments under keys like 'attachments', 'email.attachments', or 'attachmentBase64'

    Optional fields (form or JSON):
    - user_id, path, account_type, department, access_to, important, uploaded_by, deadline, fileType/fileName
    """
    try:
        # Helper to normalize booleans to 'true'/'false' strings for upload_file
        def bool_to_str(val, default="false"):
            if isinstance(val, bool):
                return "true" if val else "false"
            if isinstance(val, (int, float)):
                return "true" if val else "false"
            if isinstance(val, str):
                return "true" if val.strip().lower() in ("1", "true", "yes") else "false"
            return default

        # Helper to ensure filename has an allowed extension
        def ensure_filename(name: str | None, fallback_type: str | None = None) -> str:
            default_ext = (fallback_type or "pdf").lower()
            if not name or name == "0":
                return f"attachment.{default_ext if default_ext in ['pdf','png','jpg','jpeg','txt','docx','ppt','pptx','md'] else 'pdf'}"
            name = str(name)
            if "." not in name:
                return f"{name}.{default_ext if default_ext in ['pdf','png','jpg','jpeg','txt','docx','ppt','pptx','md'] else 'pdf'}"
            return name

        # Helper to build FileStorage from base64 bytes
        def file_from_base64(b64_data: str, filename: str, content_type: str | None) -> FileStorage | None:
            try:
                data = (b64_data or "").strip()
                if not data:
                    return None
                # Fix missing padding
                missing_padding = len(data) % 4
                if missing_padding:
                    data += "=" * (4 - missing_padding)
                decoded = base64.b64decode(data)
                return FileStorage(stream=io.BytesIO(decoded), filename=filename, content_type=content_type)
            except Exception as e:
                app.logger.error(f"Failed to decode base64 attachment {filename}: {e}")
                return None

        import base64

        # Gather parameters from form or JSON
        content_type = request.content_type or ""
        is_multipart = "multipart/form-data" in content_type
        body = {}
        if not is_multipart:
            body = request.get_json(silent=True) or {}

        # Common fields with defaults
        user_id = (request.form.get("user_id") if is_multipart else body.get("user_id")) or "user_32dZW71UFANNOSOPwhlpoQzWHdN"
        path = (request.form.get("path") if is_multipart else body.get("path")) or "~/Sandbox"
        account_type = (request.form.get("account_type") if is_multipart else body.get("account_type")) or "admin"
        department = (request.form.get("department") if is_multipart else body.get("department")) or "admin"
        access_to_raw = (request.form.get("access_to") if is_multipart else body.get("access_to")) or "all"
        # Normalize access_to to a comma-separated string or 'all'
        if isinstance(access_to_raw, list):
            access_to = ",".join([str(x) for x in access_to_raw])
        else:
            access_to = str(access_to_raw) if access_to_raw else "all"
        important = bool_to_str((request.form.get("important") if is_multipart else body.get("important")), default="false")
        uploaded_by = (request.form.get("uploaded_by") if is_multipart else body.get("uploaded_by")) or None
        deadline = (request.form.get("deadline") if is_multipart else body.get("deadline")) or None
        document_type = (request.form.get("document_type") if is_multipart else body.get("document_type")) or None

        files_to_process: list[FileStorage] = []

        # 1) Multipart files
        if is_multipart and request.files:
            for k in request.files:
                f = request.files.get(k)
                if f and getattr(f, "filename", ""):
                    files_to_process.append(f)

        # 2) JSON attachments in various shapes
        if not is_multipart and body:
            # Direct base64 with hints
            attachment_b64 = body.get("attachmentBase64")
            has_attachments = body.get("hasAttachments", False)
            file_name = ensure_filename(body.get("fileName"), body.get("fileType"))
            file_type = body.get("fileType") or (mimetypes.guess_type(file_name)[0] or "application/pdf")

            if attachment_b64 and has_attachments:
                fs_obj = file_from_base64(attachment_b64, file_name, file_type)
                if fs_obj:
                    files_to_process.append(fs_obj)

            # Array attachments under 'attachments'
            for att in body.get("attachments", []) or []:
                content = att.get("content")
                fname = ensure_filename(att.get("filename"), att.get("fileType"))
                ctype = att.get("contentType") or (mimetypes.guess_type(fname)[0] or "application/octet-stream")
                fs_obj = file_from_base64(content, fname, ctype)
                if fs_obj:
                    files_to_process.append(fs_obj)

            # Email-style nested
            email_data = body.get("emailData", {}) or {}
            email = email_data.get("email", {}) if isinstance(email_data, dict) else {}
            for att in (email.get("attachments", []) or []):
                content = att.get("content")
                fname = ensure_filename(att.get("filename"), att.get("fileType"))
                ctype = att.get("contentType") or (mimetypes.guess_type(fname)[0] or "application/octet-stream")
                fs_obj = file_from_base64(content, fname, ctype)
                if fs_obj:
                    files_to_process.append(fs_obj)

        if not files_to_process:
            return jsonify({"status": "no-files", "message": "No attachments found in request"}), 200

        results = []
        for fs_file in files_to_process:
            try:
                # Ensure pointer at start for size/type detection in upload_file
                try:
                    fs_file.stream.seek(0)
                except Exception:
                    pass

                file_id, status_code = upload_file(
                    user_id=user_id,
                    file=fs_file,
                    path=path,
                    account_type=account_type,
                    department=department,
                    access_to=access_to,
                    important=important,
                    uploaded_by=uploaded_by,
                    deadline=deadline,
                    document_type=document_type,
                )

                if file_id is None or status_code != 200:
                    results.append({
                        "filename": getattr(fs_file, "filename", None),
                        "status": "failed",
                        "error": f"upload_failed_status_{status_code}",
                    })
                    continue

                # Tag metadata as email-sourced with optional email_info
                try:
                    # Helper to extract email metadata from various sources
                    def get_email_field(sources, *keys):
                        """Try multiple keys across multiple sources and return first non-empty value"""
                        for source in sources:
                            if not source:
                                continue
                            for key in keys:
                                val = source.get(key) if isinstance(source, dict) else None
                                if val:
                                    return val
                        return None
                    
                    email_info = {}
                    email_body_text = None
                    
                    if not is_multipart and body:
                        # JSON body: extract from nested structures
                        email_data = body.get("emailData", {}) or {}
                        email_obj = email_data.get("email", {}) if isinstance(email_data, dict) else {}
                        headers = body.get("headers", {}) if isinstance(body.get("headers"), dict) else {}
                        
                        email_info = {
                            "from": get_email_field([body, email_obj, headers], "from", "from_email", "sender"),
                            "to": get_email_field([body, email_obj, headers], "to", "to_email"),
                            "subject": get_email_field([body, email_obj, headers], "subject", "email_subject"),
                            "messageId": get_email_field([body, email_obj, headers], "messageId", "emailId", "message_id", "message-id", "Message-Id"),
                        }
                        email_body_text = get_email_field([body, email_obj], "emailBodyText", "email_body_text", "bodyText", "text")
                        
                    elif is_multipart:
                        # Multipart form: extract from form fields and optional JSON
                        form = request.form
                        email_data_raw = form.get("emailData")
                        parsed_email_data = {}
                        
                        # Try to parse emailData if present
                        if email_data_raw:
                            try:
                                parsed_email_data = json.loads(email_data_raw)
                                if not isinstance(parsed_email_data, dict):
                                    parsed_email_data = {}
                            except:
                                parsed_email_data = {}
                        
                        email_info = {
                            "from": get_email_field([form, parsed_email_data], "from", "from_email", "sender", "sender_email", "email_from"),
                            "to": get_email_field([form, parsed_email_data], "to", "to_email", "recipient", "email_to"),
                            "subject": get_email_field([form, parsed_email_data], "subject", "email_subject"),
                            "messageId": get_email_field([form, parsed_email_data], "messageId", "emailId", "message_id", "email_message_id"),
                        }
                        email_body_text = get_email_field([form, parsed_email_data], "emailBodyText", "email_body_text", "bodyText", "text")
                    
                    # Remove empty keys and clean email addresses
                    email_info = {k: extract_email_address(v) if k in ("from", "to") else v 
                                  for k, v in email_info.items() if v}

                    # Build update payload and optionally append email body to extracted_text
                    update_fields = {"source": "email"}
                    if email_info:
                        update_fields["email_info"] = email_info

                    if email_body_text:
                        try:
                            existing = metadata_collection.find_one({"file_id": file_id}, {"extracted_text": 1, "_id": 0}) or {}
                            original_text = existing.get("extracted_text", "") or ""
                            appended_text = f"#### MAIL CONTENT ######\n{email_body_text}\n\n###### FILE CONTENT ######\n{original_text}"
                            update_fields["extracted_text"] = appended_text
                        except Exception as _:
                            pass

                    metadata_collection.update_one(
                        {"file_id": file_id},
                        {"$set": update_fields},
                    )
                except Exception as e:
                    app.logger.warning(f"Failed to set email source metadata for {file_id}: {e}")

                # Post-upload: auto-approve, email, and compliance analysis similar to /upload
                # Queue email notification (async)
                try:
                    user_doc = user_collection.find_one({"user_id": user_id}, {"email": 1, "username": 1, "_id": 0})
                    if user_doc and user_doc.get("email"):
                        queue_upload_notification(
                            file_name=getattr(fs_file, "filename", "attachment"),
                            user_email=user_doc["email"],
                            user_name=user_doc.get("username", "User"),
                            department=department,
                            file_path=path
                        )
                except Exception as e:
                    app.logger.warning(f"Webhook email notification queueing failed: {e}")

                approve_result, approve_status = approve_file_upload(file_id, approver_id=user_id)

                # Fetch extracted text to trigger compliance
                extracted_text = ""
                try:
                    meta = metadata_collection.find_one({"file_id": file_id}, {"extracted_text": 1, "name": 1, "_id": 0})
                    extracted_text = (meta or {}).get("extracted_text", "")
                    file_name_actual = (meta or {}).get("name", getattr(fs_file, "filename", "attachment"))
                except Exception:
                    file_name_actual = getattr(fs_file, "filename", "attachment")

                compliance_result = None
                if approve_status == 200 and extracted_text and str(extracted_text).strip():
                    try:
                        compliance_result = trigger_compliance_analysis(
                            file_id=file_id,
                            file_name=file_name_actual,
                            extracted_text=extracted_text,
                            user_id=user_id,
                        )
                    except Exception as e:
                        app.logger.warning(f"Webhook compliance analysis failed: {e}")

                results.append({
                    "filename": getattr(fs_file, "filename", None),
                    "status": "ok",
                    "file_id": file_id,
                    "approved": approve_status == 200,
                    "compliance": compliance_result,
                })
            finally:
                # Reset stream to free memory for large attachments
                try:
                    fs_file.close()
                except Exception:
                    pass

        return jsonify({
            "status": "processed",
            "count": len(results),
            "results": results,
            "user_id": user_id,
            "path": path,
            "department": department,
            "access_to": access_to,
        }), 200

    except Exception as e:
        app.logger.exception("/webhook ingest failed")
        return jsonify({"error": f"Webhook ingest failed: {str(e)}"}), 500
    
@app.post("/listdir")
def listdir():
    """
    Return documents accessible to the user with optional filtering by document type.
    
    Expects JSON body with:
      - user_id: the requesting user's id (required)
      - document_type: optional document type filter (e.g., "circular", "policy", "report")
      - source: optional source filter (e.g., "email")
      - show_categorized: boolean to return categorized view (default: true)

    Returns documents based on user access rights and optional filters.
    """
    request_data = request.get_json() or {}
    user_id = request_data.get("user_id")
    document_type_filter = request_data.get("document_type")
    source_filter = (request_data.get("source") or "").strip().lower() or None
    show_categorized = request_data.get("show_categorized", True)

    if not user_id:
        return jsonify({"error": "user_id is required in request body"}), 400

    # Resolve user's account type
    try:
        user_data = user_collection.find_one({"user_id": user_id}, {"account_type": 1, "_id": 0})
    except Exception as e:
        app.logger.error(f"Error fetching user data for {user_id}: {e}")
        return jsonify({"error": "Failed to lookup user"}), 500

    # Build base query - for MoE system, we show all documents to all users
    # but can filter by document type if specified
    query = {}
    
    # Add document type filter if specified
    if document_type_filter and document_type_filter.strip():
        doc_type = document_type_filter.strip().lower()
        # Support both single document type and comma-separated list
        if "," in doc_type:
            doc_types = [dt.strip() for dt in doc_type.split(",") if dt.strip()]
            query["document_type"] = {"$in": doc_types}
        else:
            query["document_type"] = doc_type

    try:
        # Get all documents matching the query
        documents_cursor = metadata_collection.find(
            query,
            {
                "_id": 0, 
                "name": 1, 
                "file_id": 1, 
                "path": 1, 
                "tags": 1, 
                "user_id": 1, 
                "document_type": 1, 
                "deadline": 1, 
                "upload_date": 1, 
                "uploaded_by": 1, 
                "source": 1, 
                "email_info": 1,
                "file_type": 1,
                "file_size": 1,
                "important": 1,
                "summary": 1,
                "actionableItems": 1
            }
        ).sort("upload_date", -1)

        all_documents = list(documents_cursor)

        # Apply source filter if specified
        if source_filter:
            all_documents = [
                doc for doc in all_documents 
                if str(doc.get("source", "")).lower() == source_filter
            ]

        if show_categorized:
            # Categorize documents by relationship to current user
            categorized_results = {
                "uploaded_by_user": [],
                "recent_documents": [],
                "all_documents": []
            }

            for doc in all_documents:
                # Documents uploaded by current user
                if doc.get("user_id") == user_id:
                    categorized_results["uploaded_by_user"].append({
                        "name": doc.get("name"),
                        "type": "file",
                        "tags": doc.get("tags", []),
                        "path": doc.get("path", ""),
                        "file_id": doc.get("file_id"),
                        "user_id": doc.get("user_id"),
                        "document_type": doc.get("document_type"),
                        "deadline": doc.get("deadline"),
                        "upload_date": doc.get("upload_date"),
                        "uploaded_by": doc.get("uploaded_by"),
                        "source": doc.get("source"),
                        "email_info": doc.get("email_info"),
                        "file_type": doc.get("file_type"),
                        "file_size": doc.get("file_size"),
                        "important": doc.get("important"),
                        "summary": doc.get("summary"),
                        "actionableItems": doc.get("actionableItems", [])
                    })
                
                # All documents for the complete view
                categorized_results["all_documents"].append({
                    "name": doc.get("name"),
                    "type": "file",
                    "tags": doc.get("tags", []),
                    "path": doc.get("path", ""),
                    "file_id": doc.get("file_id"),
                    "user_id": doc.get("user_id"),
                    "document_type": doc.get("document_type"),
                    "deadline": doc.get("deadline"),
                    "upload_date": doc.get("upload_date"),
                    "uploaded_by": doc.get("uploaded_by"),
                    "source": doc.get("source"),
                    "email_info": doc.get("email_info"),
                    "file_type": doc.get("file_type"),
                    "file_size": doc.get("file_size"),
                    "important": doc.get("important"),
                    "summary": doc.get("summary"),
                    "actionableItems": doc.get("actionableItems", [])
                })

            # Recent documents (last 30 days)
            from datetime import datetime, timedelta
            thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
            categorized_results["recent_documents"] = [
                doc for doc in categorized_results["all_documents"]
                if doc.get("upload_date", "") >= thirty_days_ago
            ][:20]  # Limit to 20 most recent

            return jsonify(categorized_results), 200
        else:
            # Return flat list
            results = []
            for doc in all_documents:
                results.append({
                    "name": doc.get("name"),
                    "type": "file",
                    "tags": doc.get("tags", []),
                    "path": doc.get("path", ""),
                    "file_id": doc.get("file_id"),
                    "user_id": doc.get("user_id"),
                    "document_type": doc.get("document_type"),
                    "deadline": doc.get("deadline"),
                    "upload_date": doc.get("upload_date"),
                    "uploaded_by": doc.get("uploaded_by"),
                    "source": doc.get("source"),
                    "email_info": doc.get("email_info"),
                    "file_type": doc.get("file_type"),
                    "file_size": doc.get("file_size"),
                    "important": doc.get("important"),
                    "summary": doc.get("summary"),
                    "actionableItems": doc.get("actionableItems", [])
                })

            return jsonify(results), 200

    except Exception as e:
        app.logger.error(f"Error listing files for user {user_id}: {e}")
        return jsonify({"error": "Failed to list files"}), 500

@app.post("/listdir/department/<user_id>")
def listdir_by_department(user_id):
    """
    List files and directories for a specific department.
    Now supports multi-department documents.
    """
    user_data = user_collection.find_one({"user_id": user_id}, {"department": 1, "_id": 0})
    if not user_data:
        return jsonify({"error": "User not found"}), 404
    
    department = user_data.get("department")
    if not department:
        return jsonify({"error": "User has no department assigned"}), 400
    
    request_data = request.get_json()
    current_path = request_data.get("dir", "~/Sandbox")
    app.logger.info(f"Listing files and directories for department: {department} in path: {current_path}")
    
    # Use the updated function that supports multi-department documents
    return jsonify(list_dir_by_department(department, current_path)), 200

@app.post("/listdir/<user_id>")
def listdir_by_user(user_id):
    """
    List files and directories uploaded by a specific user
    """
    request_data = request.get_json()
    current_path = request_data.get("dir", "~/Sandbox")
    app.logger.info(f"Listing files and directories for user: {user_id} in path: {current_path}")
    return jsonify(list_dir_by_user(user_id, current_path)), 200


@app.post("/listdir/department-files")
def list_department_files():
    """
    List files for a specific department. Expects JSON body:
      - department: string (required) -- backend department slug (e.g., 'finance', 'legal')
      - path: string (optional) -- path to list, defaults to '~/Sandbox'

    This endpoint returns files visible to the specified department without requiring a user_id.
    """
    data = request.get_json() or {}
    department = data.get("department")
    source_filter = (data.get("source") or "").strip().lower() or None

    if not department:
        return jsonify({"error": "department is required"}), 400

    try:
        # Build a department-based query:
        # Return files where:
        # 1. File's department field matches the requested department (uploaded TO this dept), OR
        # 2. uploaded_by equals the department (uploaded BY this dept), OR
        # 3. access_to contains the department or is 'all' (shared with this dept)
        dept = str(department).strip()
        regex = f"(^|,){dept}(,|$)"
        base_or = {
            "$or": [
                {"department": dept},  # Files uploaded TO this department
                {"uploaded_by": dept},  # Files uploaded BY this department
                {"access_to": "all"},   # Files accessible to all
                {"access_to": dept},    # Files explicitly shared with this dept
                {"access_to": {"$regex": regex, "$options": "i"}},  # Dept in CSV list
            ]
        }
        query = base_or if not source_filter else {"$and": [base_or, {"source": source_filter}]}

        files_cursor = metadata_collection.find(
            query,
            {"_id": 0, "name": 1, "file_id": 1, "path": 1, "tags": 1, "user_id": 1, "department": 1, "access_to": 1, "deadline": 1, "upload_date": 1, "uploaded_by": 1, "source": 1, "email_info": 1},
        ).sort("upload_date", -1)

        results = []
        for f in files_cursor:
            results.append({
                "name": f.get("name"),
                "type": "file",
                "tags": f.get("tags", []),
                "path": f.get("path", ""),
                "file_id": f.get("file_id"),
                "user_id": f.get("user_id"),
                "department": f.get("department"),
                "access_to": f.get("access_to"),
                "deadline": f.get("deadline"),
                "uploaded_by": f.get("uploaded_by"),
                "upload_date": f.get("upload_date"),
                "email_info": f.get("email_info"),
                "source": f.get("source"),
            })

        return jsonify(results), 200
    except Exception as e:
        app.logger.error(f"Error listing files for department {department}: {e}")
        return jsonify({"error": "Failed to list files for department"}), 500



@app.route("/signup", methods=["POST"])
def signingup():
    data = request.get_json()
    user_id = data.get("user_id")
    emailAddress = data.get("email")
    username = data.get("username")
    password = data.get("password")
    accountType = data.get("accountType")
    if not user_id or not emailAddress or not username or not password or not accountType:
        return jsonify({"error": "User ID, email, username, password, and accountType must be provided"}), 400
    return sign_up(user_id, emailAddress, username, password, accountType)


@app.route("/delete", methods=["POST"])
def delete_file_endpoint():
    data = request.get_json()
    file_name = data.get("file_name")
    path = data.get("path")
    if not file_name or not path:
        return jsonify({"error": "File name and path must be provided"}), 400
    return delete_file(file_name, path)


@app.route("/move", methods=["POST"])
def move_file_endpoint():
    data = request.get_json()
    file_name = data.get("file_name")
    current_path = data.get("current_path")
    new_path = data.get("new_path")
    if not file_name or not current_path or not new_path:
        return jsonify(
            {"error": "File name, current path, and new path must be provided"}
        ), 400
    return move_file(file_name, current_path, new_path)


@app.route("/update_tags", methods=["POST"])
def update_tags_endpoint():
    file_id = request.json.get("file_id")
    file_name = request.json.get("file_name")
    path = request.json.get("path", "~/Sandbox")
    tags = request.json.get("tags")
    return update_tags(file_name, path, tags, file_id)


@app.route("/view_file", methods=["POST"])
def view_file_endpoint():
    data = request.get_json()
    print(data)
    file_path = data.get("file_path")
    file_name = data.get("file_name")
    user_id = data.get("user_id")

    # If a path is provided, use the existing view_file flow
    if file_path:
        return view_file(file_path, file_name)

    # Otherwise resolve access-aware metadata for the user and serve by file_id
    if not user_id or not file_name:
        return jsonify({"error": "Either file_path or (file_name and user_id) must be provided"}), 400

    from backend.storage import find_metadata_for_user
    metadata = find_metadata_for_user(file_name, user_id)
    if not metadata:
        return jsonify({"error": "File not found or access denied"}), 404

    file_id = metadata.get("file_id")
    from backend.view_file import view_file_by_id
    
    # Get the file response first
    file_response = view_file_by_id(file_id)
    
    # If it's a successful file response, enhance it with dept data
    if hasattr(file_response, 'status_code') and file_response.status_code == 200:
        # For binary file responses (PDF, images, etc.), we can't modify the response
        # So we'll return the file as-is and let the frontend make a separate metadata call
        return file_response
    else:
        # If it's a JSON response (error or file data), we can enhance it
        try:
            response_data = file_response.get_json() if hasattr(file_response, 'get_json') else {}
            if isinstance(response_data, dict):
                # Fetch dept_summaries and dept_action_points from metadata collection
                dept_data = metadata_collection.find_one(
                    {"file_id": file_id},
                    {"dept_summaries": 1, "dept_action_points": 1, "_id": 0}
                )
                if dept_data:
                    response_data["dept_summaries"] = dept_data.get("dept_summaries", {})
                    response_data["dept_action_points"] = dept_data.get("dept_action_points", {})
                return jsonify(response_data)
        except:
            pass
        
        return file_response

@app.route("/read_aloud", methods=["POST"])
def read_aloud_endpoint():
    data = request.get_json()
    file_path = data.get("file_path")
    file_name = data.get("file_name")
    return read_aloud(file_path, file_name)

@app.route("/analyze", methods=["POST"])
def analyze_endpoint():
    """
    Analyze a file stored in MongoDB for tagging, embedding generation,
    and destination suggestion based on the request payload from the frontend.
    """
    # Parse the request data
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request payload is missing"}), 400
    file_path = data.get("file_path")
    file_name = data.get("file_name")
    file_id = data.get("file_id")
    
    # Use fixed KMRL categories instead of dynamic destinations
    allowed_categories = ["safety", "hr", "finance", "engineering", "procurement", "legal"]
    
    # Validate inputs
    if not file_id:
        return jsonify({"error": "File ID is required"}), 400

    try:
        # Find the file in the metadata collection using the file_id
        file_data = metadata_collection.find_one({"file_id": file_id})
        if not file_data:
            return jsonify({"error": f"File with ID {file_id} not found"}), 404

        # Call the analyze_file function with allowed categories
        result = analyze_file(file_id, allowed_categories)
        if not result:
            return jsonify(
                {"error": "Analysis failed or no suitable category found"}
            ), 500

        suggested_departments, embeddings, important_words, tags = result
        primary_department = suggested_departments[0] if suggested_departments else "legal"

        # Update the file's metadata with the analysis results
        metadata_collection.update_one(
            {"file_id": file_id},
            {
                "$set": {
                    "departments": suggested_departments,  # Array of all relevant departments
                    "primary_department": primary_department,  # Main department for sorting
                    "department": primary_department,  # For backward compatibility
                    "suggested_destination": primary_department,  # For backward compatibility
                    "embeddings": embeddings,
                    "tags": tags,
                    "status": "analyzed",
                }
            },
        )

        return jsonify(
            {
                "message": "File analysis completed successfully",
                "file_id": file_id,
                "departments": suggested_departments,  # All relevant departments
                "primary_department": primary_department,  # Main department
                "category": primary_department,  # For backward compatibility
                "department": primary_department,  # For backward compatibility
                "destination": primary_department,  # For backward compatibility
                "embeddings": embeddings,
                "important_words": important_words,
                "tags": tags,
            }
        ), 200
    except Exception as e:
        return jsonify(
            {"error": "An error occurred during analysis", "details": str(e)}
        ), 500


@app.route("/api/query", methods=["POST"])
def api_query():
    """
    Standard retrieval with query classification.
    Body: { "query": str (required), "filters": optional { date_from, date_to, department, file_types } }
    Returns: { "intent": "single_hop"|"multi_hop", "reasoning": str, "results": [...], "blurb_task_id": str }
    Guardrail: if search status is "down" (no indexes or only one lexical), return 503 and notify backend tech.
    """
    try:
        data = request.get_json() or {}
        query = (data.get("query") or "").strip()
        if not query:
            return jsonify({"error": "query is required"}), 400
        availability = get_search_availability()
        if availability.get("status") == "down":
            if availability.get("notify_tech"):
                notify_backend_tech(
                    "Search system down: insufficient indexes (FAISS or at least two lexical required).",
                    context=availability,
                )
            return jsonify({
                "error": availability.get("message", "Search is temporarily unavailable. Technical team has been notified."),
                "code": "SEARCH_SYSTEM_DOWN",
            }), 503
        filters = data.get("filters") or {}
        classification = classify_query(query)
        intent = classification.get("intent", "single_hop")
        if intent == "multi_hop":
            docs = multi_hop_retrieval(query, metadata_collection, filters=filters or None)
        else:
            docs = single_hop_retrieval(query, metadata_collection, filters=filters or None)
        blurb_task_id = start_blurb_background(query, docs, metadata_collection)
        return jsonify({
            "intent": intent,
            "reasoning": classification.get("reasoning", ""),
            "results": docs,
            "blurb_task_id": blurb_task_id,
        }), 200
    except Exception as e:
        logging.exception("api_query: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/blurb", methods=["POST"])
def api_blurb():
    """
    Get blurb: start one (if query + doc file_ids given) or poll by task_id.
    Body: { "task_id": str } OR { "query": str, "doc_file_ids": [str] }
    Returns: { "status": "done"|"running"|"error", "blurb": str|null, "error": str|null }
    """
    try:
        data = request.get_json() or {}
        task_id = data.get("task_id")
        if task_id:
            entry = get_blurb_cached(task_id)
        else:
            query = (data.get("query") or "").strip()
            doc_file_ids = data.get("doc_file_ids") or []
            if not query or not doc_file_ids:
                return jsonify({"error": "either task_id or (query and doc_file_ids) required"}), 400
            entry = get_blurb_cached_by_query(query, doc_file_ids)
        if entry is None:
            return jsonify({"status": "pending", "blurb": None, "error": None}), 200
        return jsonify(entry), 200
    except Exception as e:
        logging.exception("api_blurb: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/precedents", methods=["POST"])
def api_precedents():
    """
    Find documents similar to the given document (precedent finder).
    Body: { "file_id": str (required), "similarity_threshold": float?, "file_types": list?, "date_range": [from, to]?, "top_k": int? }
    Returns: { "results": [...], "total_found": int, "current_document": {...} }
    """
    try:
        data = request.get_json() or {}
        file_id = data.get("file_id")
        if not file_id:
            return jsonify({"error": "file_id is required"}), 400
        similarity_threshold = data.get("similarity_threshold", 0.2)
        file_types = data.get("file_types")
        date_range = data.get("date_range")
        if date_range and isinstance(date_range, list) and len(date_range) == 2:
            date_range = tuple(date_range)
        top_k = data.get("top_k", 50)
        result = find_precedents(
            file_id=file_id,
            similarity_threshold=similarity_threshold,
            file_types=file_types,
            date_range=date_range,
            top_k=top_k,
            metadata_collection=metadata_collection,
        )
        if result.get("error"):
            return jsonify(result), 404
        return jsonify(result), 200
    except Exception as e:
        logging.exception("api_precedents: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/agent", methods=["POST"])
def agent_endpoint():
    data = request.get_json()
    agent = initialize_agent_with_tools()
    # Provide an example question to the agent
    query = data.get("query")
    if not query:
        return jsonify({"error": "No query provided."}), 400
    response = agent.invoke(query)
    print(response)
    return jsonify(response), 200


@app.route('/translate', methods=['POST'])
def translate_text_endpoint():
    """
    Translate text between English and Malayalam.
    Supports automatic language detection and bidirectional translation.
    
    Expected JSON body:
    {
        "text": "Text to translate",
        "source_lang": "en|ml" (optional, will auto-detect),
        "target_lang": "en|ml" (optional, will auto-determine),
        "file_id": "optional file_id to get text from document"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Get text from request or from file
        text = data.get('text')
        file_id = data.get('file_id')
        
        if not text and file_id:
            # Extract text from document metadata
            try:
                file_metadata = metadata_collection.find_one({"file_id": file_id})
                if file_metadata:
                    text = file_metadata.get('extracted_text', '')
                else:
                    return jsonify({"error": f"File with ID {file_id} not found"}), 404
            except Exception as e:
                return jsonify({"error": f"Error fetching file: {str(e)}"}), 500
        
        if not text:
            return jsonify({"error": "No text provided for translation"}), 400
        
        # Import translation utilities
        from backend.utils.translation import translate_text, get_supported_languages
        
        source_lang = data.get('source_lang')
        target_lang = data.get('target_lang')
        
        # Perform translation
        result = translate_text(text, source_lang, target_lang)
        
        return jsonify({
            "success": result['success'],
            "original_text": result['original_text'],
            "translated_text": result['translated_text'],
            "detected_language": result['detected_language'],
            "translation_direction": result['translation_direction'],
            "method": result.get('method', 'unknown'),
            "chunks_processed": result.get('chunks_processed', 1),
            "supported_languages": get_supported_languages()
        }), 200
        
    except Exception as e:
        print(f"Translation error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Translation failed: {str(e)}"}), 500

@app.route("/req/upload", methods=["POST"])
def request_upload():
    """
    Allows a user to request uploading a file.
    """
    data = request.get_json()

    # Validate required fields
    user_id = data.get("user_id")
    file_id = data.get("file_id")
    action = data.get("action")
    account_type = data.get("account_type")
    department = data.get("department")
    access_to = data.get("access_to")
    important = data.get("important")
    bearer_token = CLERK_AUTH_TOKEN

    if not user_id or not file_id or action != "upload" or not account_type or not access_to:
        return jsonify(
            {
                "error": "Invalid request. 'user_id', 'file_id', and 'action: upload' and 'account_type' and 'access_to' are required."
            }
        ), 400
    if not bearer_token:
        return jsonify({"error": "Authorization token is required."}), 401

    # Fetch user details from the database
    user = user_collection.find_one({"user_id": user_id})
    if not user:
        # User not found in the database, fetch from Clerk API and store in the database
        username, email = fetch_user_details(user_id, bearer_token)
        if not username or not email:
            return jsonify({"error": f"Failed to fetch user details for ID {user_id}"}), 404
        # User data is now stored in the database
        user = user_collection.find_one({"user_id": user_id})
    else:
        username = user.get("username")
        email = user.get("email")

    # Fetch file name from 'metadata' collection
    file_metadata = metadata_collection.find_one({"file_id": file_id})
    if not file_metadata:
        return jsonify({"error": f"File with ID {file_id} not found."}), 404

    file_name = file_metadata.get("name")
    file_path = file_metadata.get("path")
    # Create a new entry in the 'actions' collection
    action_doc = {
        "action_id": str(ObjectId()),  # Unique ID for the action
        "user_id": user_id,
        "username": username,
        "email": email,
        "file_id": file_id,
        "file_name": file_name,
        "file_path": file_path,
        "action": "upload",
        "status": "pending",
        "timestamp": datetime.utcnow().isoformat(),
        "account_type": account_type,
        "department": department,
        "access_to": access_to,
        "important": important
    }

    # Insert into 'actions' collection
    actions_collection.insert_one(action_doc)

    return jsonify(
        {
            "message": "Upload request has been submitted successfully.",
            "action_id": action_doc["action_id"],
        }
    ), 201


@app.route("/req/delete", methods=["POST"])
def request_delete():
    """
    Allows a user to request deleting a file.
    """
    data = request.get_json()

    # Validate required fields
    user_id = data.get("user_id")
    file_id = data.get("file_id")
    action = data.get("action")
    bearer_token = CLERK_AUTH_TOKEN

    if not user_id or not file_id or action != "delete":
        return jsonify(
            {
                "error": "Invalid request. 'user_id', 'file_id', and 'action: delete' are required."
            }
        ), 400
    if not bearer_token:
        return jsonify({"error": "Authorization token is required."}), 401

    # Fetch user details from the database
    user = user_collection.find_one({"user_id": user_id})
    if not user:
        # User not found in the database, fetch from Clerk API and store in the database
        username, email = fetch_user_details(user_id, bearer_token)
        if not username or not email:
            return jsonify({"error": f"Failed to fetch user details for ID {user_id}"}), 400
        # User data is now stored in the database
        user = user_collection.find_one({"user_id": user_id})
    else:
        username = user.get("username")
        email = user.get("email")

    # Fetch file name from 'metadata' collection
    file_metadata = metadata_collection.find_one({"file_id": file_id})
    if not file_metadata:
        return jsonify({"error": f"File with ID {file_id} not found."}), 400

    file_name = file_metadata.get("name")
    file_path = file_metadata.get("path")
    account_type = file_metadata.get("account_type")
    department = file_metadata.get("department")
    access_to = file_metadata.get("access_to")
    important = file_metadata.get("important")

    # Create a new entry in the 'actions' collection
    action_doc = {
        "action_id": str(ObjectId()),  # Unique ID for the action
        "user_id": user_id,
        "username": username,
        "email": email,
        "file_id": file_id,
        "file_name": file_name,
        "file_path": file_path,
        "action": "delete",
        "status": "pending",
        "timestamp": datetime.utcnow().isoformat(),
        "account_type": account_type,
        "department": department,
        "access_to": access_to,
        "important": important
    }

    # Insert into 'actions' collection
    actions_collection = db["actions"]
    actions_collection.insert_one(action_doc)

    return jsonify(
        {
            "message": "Delete request has been submitted successfully.",
            "action_id": action_doc["action_id"],
        }
    ), 201

@app.route('/redact', methods=['POST'])
def redact_file():
    """
    Redact PII from an uploaded PDF and replace the original file in MongoDB.
    """
    
    data = request.get_json()
    #if path and file_name both exist

    file_path = data.get("path",None)
    file_name = data.get("file_name",None)
    file_data=metadata_collection.find_one({"path": file_path, "name": file_name},{"file_id": 1, "_id": 0})
    # Validate inputs
    file_id = file_data.get('file_id')
    
    try:
        # Retrieve the original file from MongoDB
        grid_out = fs.get(ObjectId(file_id))
        original_pdf = grid_out.read()

        # Redact the file
        redacted_pdf, redacted_size = redact_pii_in_pdf(original_pdf)
        redacted_pdf.seek(0)
        # Replace the original file with the redacted file in MongoDB
        fs.delete(ObjectId(file_id))  # Delete the original file
        new_file_id = fs.put(
            redacted_pdf.getvalue(),
            filename=grid_out.filename,
            contentType="application/pdf"
        )
        
        # Update the metadata in MongoDB
        metadata_collection.update_one(
            {"file_id": file_id},
            {
                "$set": {
                    "file_id": str(new_file_id),
                    "file_size": redacted_size,
                    "isRedacted": True,
                    
                }
            }
        )

        return jsonify({
            "message": "File successfully redacted and replaced in MongoDB.",
            "new_file_id": str(new_file_id)
        }), 200

    except Exception as e:
        return jsonify({"error": "An error occurred while redacting the file.", "details": str(e)}), 500

@app.route('/redact/temp', methods=['POST'])
def redact_file_temp():
    """
    Redact PII from an uploaded PDF and replace the original file in MongoDB.
    """
    
    data = request.get_json()
    #if path and file_name both exist
    file_id = data.get('file_id',None)
    
    
    try:
        # Retrieve the original file from MongoDB
        grid_out = fs.get(ObjectId(file_id))
        original_pdf = grid_out.read()

        # Redact the file
        redacted_pdf, redacted_size = redact_pii_in_pdf(original_pdf)
        redacted_pdf.seek(0)
        # Replace the original file with the redacted file in MongoDB
        
        
        

        #send the file byte and 200
        
            # )
        return Response(
            redacted_pdf.getvalue(),
            content_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={grid_out.filename}"}
        )
        
            

    except Exception as e:
        return jsonify({"error": "An error occurred while redacting the file.", "details": str(e)}), 500
    
    
    
@app.route('/upload-redacted', methods=['POST'])
def upload_redacted_file():
    """Take two redacted inputs"""
    if "files" not in request.files:
        return jsonify({"error": "No files part in the request"}), 400

    files = request.files.getlist("files")
    path = request.form.get("path")
    user_id = request.form.get("user_id")
    account_type = request.form.get("account_type")
    department = request.form.get("department")
    access_to = request.form.get("access_to")
    important = request.form.get("important")
    document_type = request.form.get("document_type")

    # Resolve uploaded_by from users collection if possible
    uploaded_by = request.form.get("uploaded_by")
    try:
        users_coll = MongoClient(MONGO_URI)["EDUDATA"]["users"]
        user_doc = users_coll.find_one({"user_id": user_id}, {"department": 1, "_id": 0})
        if user_doc and user_doc.get("department"):
            uploaded_by = user_doc.get("department")
    except Exception as e:
        print(f"Error looking up user department: {e}")

    if not path:
        return jsonify({"error": "No path specified"}), 400

    saved_files = []
    original_file = files[0]
    redacted_file = files[1]
    file_id,ok = upload_file(
        user_id,
        original_file,
        path,
        account_type,
        department,
        access_to,
        important,
        uploaded_by=uploaded_by,
        deadline=request.form.get("deadline"),
        document_type=document_type,
    )
    
    if ok:
        #find file in metadata and set it's isRedacted to True and redactedVersion to file_id
        metadata_collection.update_one(
            {"file_id": file_id},
            {
                "$set": {
                    "isRedacted": True,
                    "redactedVersion": str(file_id),
                }
            }
        )
        return jsonify(
            {"message": "Files successfully uploaded", "files": saved_files}
        ), 200
    else:
        return jsonify({"error": "Failed to upload the file"}), 500
    

@app.route('/isCompliant', methods=['POST'])
def is_compliant():
    files = request.files.getlist('files')
    if not files:
        return jsonify({"error": "No files part in the request"}), 400
    elif True:
        file = files[0]
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Check sensitive data in file
        file_id, entities = check_sensitive_data_in_file(file,mimetype="application/pdf")

        if entities:
            return jsonify({
                "compliant": False,
                "fileId": str(file_id),
                "entities": entities
            }), 200
        else:
            return jsonify({
                "compliant": True,
                "fileId": str(file_id),
                "message": "No sensitive data found."
            }), 200
    else:
        print("aron hehe")
        # data = request.get_json()
        # file_name = data.get("file_name")
        # file_path = data.get("file_path")
        # if not file_name or not file_path:
        #     return jsonify({"error": "File name and path must be provided"}), 400

        # file_data = metadata_collection.find_one({"path": file_path, "name": file_name}, {"file_id": 1, "_id": 0})
        # if not file_data:
        #     return jsonify({"error": "File not found"}), 404

        # file_id = file_data.get('file_id')
        # grid_out = fs.get(ObjectId(file_id))
        # file_content = grid_out.read()

        # # Check sensitive data in file 
        # file_id, entities = check_sensitive_data_in_file(file_content,mimetype=mimetypes.guess_type(file_name)[0])

        # if entities:
        #     return jsonify({
        #         "compliant": False,
        #         "fileId": str(file_id),
        #         "entities": entities
        #     }), 200
        # else:
        #     return jsonify({
        #         "compliant": True,
        #         "fileId": str(file_id),
        #         "message": "No sensitive data found."
        #     }), 200
# ---------------------------------- ADMIN WORKFLOW ROUTES --------------------------------------------------- #

@app.route("/compliance-summary", methods=["POST"])
def compliance_summary():
    """Takes file_id OR (file_name + user_id) as input, fetches file from MongoDB, generates compliance summary, and sends email notification."""
    data = request.get_json()
    file_id = data.get("file_id")
    file_name = data.get("file_name")
    user_id = data.get("user_id")

    # Support both legacy file_id and access-aware file_name + user_id lookup
    if not file_id and (not file_name or not user_id):
        return jsonify({"error": "Either file_id or both file_name and user_id must be provided"}), 400

    try:
        # If file_id is not provided, resolve it using access-aware lookup
        if not file_id:
            from backend.storage import find_metadata_for_user
            metadata = find_metadata_for_user(file_name, user_id)
            if not metadata:
                return jsonify({"error": "File not found or access denied"}), 404
            file_id = metadata.get("file_id")

        # Ensure /tmp directory exists
        os.makedirs("/tmp", exist_ok=True)

        # Retrieve the file from GridFS
        grid_out = fs.get(ObjectId(file_id))

        if not grid_out:
            return jsonify({"error": f"File with ID {file_id} not found in GridFS"}), 404

        # Save the file to a temporary location
        file_path = f"/tmp/{file_id}.pdf"
        with open(file_path, "wb") as file:
            file.write(grid_out.read())

        # Confirm the file has been written successfully
        if not os.path.exists(file_path):
            return jsonify({"error": f"File could not be saved to {file_path}"}), 500

        if os.path.getsize(file_path) == 0:
            return jsonify({"error": f"File is empty: {file_path}"}), 500

        # Retrieve the MIME type from metadata
        metadata = metadata_collection.find_one({"file_id": file_id})   
        if not metadata:
            return jsonify({"error": f"Metadata for file ID {file_id} not found"}), 404

        mime_type = metadata.get("mime_type", "application/pdf")
        file_name = metadata.get("name", "Unknown")
        user_id = metadata.get("user_id", "")

        # Analyze the document
        compliance_data = analyze_document(file_path, mime_type)

        # Calculate average score from the component scores
        scores = []
        if compliance_data.get("readability", {}).get("score"):
            scores.append(compliance_data["readability"]["score"])
        if compliance_data.get("semantic_clarity", {}).get("score"):
            scores.append(compliance_data["semantic_clarity"]["score"])
        if compliance_data.get("accessibility_compliance", {}).get("score"):
            scores.append(compliance_data["accessibility_compliance"]["score"])
        if compliance_data.get("content_relevance", {}).get("score"):
            scores.append(compliance_data["content_relevance"]["score"])
        
        # Calculate average score and determine status
        average_score = sum(scores) / len(scores) if scores else 0
        compliance_status = "Compliant" if average_score >= 2.5 else "Non-Compliant"

        # Send email notification for compliance check
        try:
            email_notifications.send_compliance_check_notification(
                user_id=user_id,
                file_name=file_name,
                compliance_status=compliance_status,
                dashboard_url="http://localhost:3000/dashboard"  # Update with your frontend URL
            )
        except Exception as e:
            print(f"Error sending compliance check email: {e}")

        # Optional: Remove the temporary file after processing
        os.remove(file_path)

        return jsonify({
            "compliance_summary": compliance_data,
            "compliance_status": compliance_status,
            "average_score": average_score
        }), 200

    except Exception as e:
        # Log full error for debugging
        import traceback
        print(f"Error: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

    
@app.route("/admin/pending", methods=["GET"])
def fetch_pending_files():
    pending_files = metadata_collection.find({"approvalStatus": "pending"})
    pending_files_list = []
    for file in pending_files:
        file["_id"] = str(file["_id"])
        pending_files_list.append(file)
    return jsonify(pending_files_list), 200


@app.route("/delete_dir", methods=["POST"])
def delete_directory():
    data = request.get_json()
    dir_name = data.get("dir_name")
    path = data.get("path")
    if not dir_name or not path:
        return jsonify({"error": "Directory name and path must be provided"}), 400
    return delete_dir(dir_name, path)


@app.route("/create_dir", methods=["POST"])
def create_dir():
    data = request.get_json()
    dir_name = data.get("dir_name")
    path = data.get("path")
    if not dir_name or not path:
        return jsonify({"error": "Directory name and path must be provided"}), 400
    return create_new_dir(dir_name, path)


# Fetch approval summary for dashboard
@app.route("/admin/combined-summary", methods=["GET"])
def get_combined_summary():
    try:
        # Aggregate document counts by month
        monthly_distribution = list(metadata_collection.aggregate([
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m",
                            "date": {"$toDate": "$upload_date"}
                        }
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]))

        # Convert aggregation result to a dictionary
        monthly_distribution_dict = {
            item['_id']: item['count']
            for item in monthly_distribution
        }
        
        file_type_distribution = list(metadata_collection.aggregate([
            {
                "$group": {
                    "_id": "$file_type",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]))
        
        file_type_distribution_dict = {
            item['_id']: item['count']
            for item in file_type_distribution
        }


        # Fetch document-related metrics
        pending_files = metadata_collection.count_documents({"approvalStatus": "pending"})
        approved_files = metadata_collection.count_documents({"approvalStatus": "approved"})
        rejected_files = metadata_collection.count_documents({"approvalStatus": "rejected"})
        total_actions = actions_collection.count_documents({})
        total_documents = metadata_collection.count_documents({})

        # Fetch user-related metrics
        user_data = list(user_collection.find({}, {'_id': 0, 'user_id': 1, 'email': 1, 'username': 1, 'department': 1}))

        # Ensure all 'department' fields are non-null
        user_data = [{**user, 'department': user.get('department') or 'Unknown'} for user in user_data]

        total_users = user_collection.count_documents({})
        departments = user_collection.distinct('department')
        departments = [dept if dept else 'Others' for dept in departments]
        total_departments = len(departments)
        department_counts = {dept: user_collection.count_documents({'department': dept}) for dept in departments}
        department_user_count = [{"department": dept, "count": count} for dept, count in department_counts.items()]

        # Combine all metrics into one response
        response_data = {
            "document_metrics": {
                "pending_files": pending_files,
                "approved_files": approved_files,
                "rejected_files": rejected_files,
                "total_actions": total_actions,
                "total_documents": total_documents,
                "monthly_distribution": monthly_distribution_dict,
                "file_type_distribution": file_type_distribution_dict,
            },
            "user_metrics": {
                "total_users": total_users,
                "total_departments": total_departments,
                "department_counts": department_counts,
                "department_user_count": department_user_count,
                "user_data": user_data
            }
        }

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# SUMMARY RESPONSE
    
#     {
#     "approved_files": 45,
#     "monthly_distribution": {
#         "2024-11": 38,
#         "2024-12": 35
#     },
#     "pending_files": 20,
#     "rejected_files": 0,
#     "total_actions": 48,
#     "total_documents": 73,
#     "total_files": 73
# }


# Route to get file categories for admin dashboard                # PIE CHART DATA
@app.route("/admin/file-categories", methods=["GET"])
def get_file_categories():
    pipeline = [
        {"$group": {"_id": "$file_type", "count": {"$sum": 1}}},
        {"$project": {"_id": 0, "file_type": "$_id", "count": 1}},
    ]
    file_categories = list(metadata_collection.aggregate(pipeline))
    return jsonify(file_categories), 200


# Helper: approve a file upload programmatically (used by upload flow)
def approve_file_upload(file_id: str, approver_id: str):
    """Helper to approve a file upload programmatically.

    Returns a tuple (result_dict, status_code).
    """
    # Check if the file exists in the metadata collection
    file_metadata = metadata_collection.find_one({"file_id": file_id})
    if not file_metadata:
        return ({"error": f"File with ID {file_id} not found in metadata collection."}, 404)

    # Update the metadata to reflect approval
    metadata_collection.update_one(
        {"file_id": file_id}, {"$set": {"approvalStatus": "approved", "visible": True}}
    )

    # Update action status (if exists)
    actions_collection.update_one(
        {"file_id": file_id, "action": "upload"},
        {
            "$set": {
                "status": "approved",
                "approved_by": approver_id,
                "approved_date": datetime.utcnow().isoformat(),
            }
        },
    )

    # Fetch user email from actions collection where this file_id belongs
    action_doc = actions_collection.find_one({"file_id": file_id, "action": "upload"})
    if action_doc:
        user_email = action_doc.get("email")
    else:
        # Create an action document for audit trail if none exists
        # Try to derive fields from metadata
        file_name = file_metadata.get("name")
        file_path = file_metadata.get("path")
        account_type = file_metadata.get("account_type")
        department = file_metadata.get("department")
        access_to = file_metadata.get("access_to")
        important = file_metadata.get("important")
        user_id = file_metadata.get("user_id")

        new_action = {
            "action_id": str(ObjectId()),
            "user_id": user_id,
            "username": None,
            "email": None,
            "file_id": file_id,
            "file_name": file_name,
            "file_path": file_path,
            "action": "upload",
            "status": "approved",
            "timestamp": datetime.utcnow().isoformat(),
            "account_type": account_type,
            "department": department,
            "access_to": access_to,
            "uploaded_by": approver_id,
            "important": important,
            "approved_by": approver_id,
            "approved_date": datetime.utcnow().isoformat(),
        }
        actions_collection.insert_one(new_action)
        user_email = None

    return ({"message": f"File {file_id} upload approved successfully.", "user_email": user_email}, 200)


# Admin Approve Upload
@app.route("/admin/upload/approve", methods=["POST"])
def approve_upload():
    """
    Approves a user's upload request.
    """
    data = request.get_json()
    file_id = data.get("file_id")
    admin_id = data.get("admin_id")
    

    if not file_id or not admin_id:
        return jsonify({"error": "File ID and Admin ID are required."}), 400

    # Check if the file exists in the metadata collection
    file_metadata = metadata_collection.find_one({"file_id": file_id})
    if not file_metadata:
        return jsonify(
            {"error": f"File with ID {file_id} not found in metadata collection."}
        ), 404

    # Update the metadata to reflect approval
    metadata_collection.update_one(
        {"file_id": file_id}, {"$set": {"approvalStatus": "approved", "visible": True}}
    )

    # Update action status
    actions_collection.update_one(
        {"file_id": file_id, "action": "upload"},
        {
            "$set": {
                "status": "approved",
                "approved_by": admin_id,
                "approved_date": datetime.utcnow().isoformat(),
            }
        },
    )

    # Fetch user email from actions collection where this file_id belongs
    action_doc = actions_collection.find_one({"file_id": file_id, "action": "upload"})
    if action_doc:
        user_email = action_doc.get("email")
    else:
        return jsonify({"error": f"No action found for file ID {file_id}"}), 404

    return jsonify(
        {
            "message": f"File {file_id} upload approved successfully.",
            "user_email": user_email,
        }
    ), 200



# Actions Dashboard
@app.route("/admin/actions", methods=["GET"])
def get_admin_actions():
    """
    Fetch all actions performed by users.
    """
    # Fetch actions with pagination ( LATER USE )
    # page = int(request.args.get('page', 1))
    # limit = int(request.args.get('limit', 10))
    # skip = (page - 1) * limit

    ## actions = list(actions_collection.find().skip(skip).limit(limit))
    actions = list(actions_collection.find())

    # Enrich actions with deadline from metadata if not present on the action
    for action in actions:
        action["_id"] = str(action["_id"])
        # ensure these fields are strings for frontend
        if "action_id" in action:
            action["action_id"] = str(action["action_id"])
        if "file_id" in action:
            action["file_id"] = str(action["file_id"])

        # If action doesn't include a deadline, try to fetch from metadata collection
        if not action.get("deadline") and action.get("file_id"):
            try:
                meta = metadata_collection.find_one({"file_id": action.get("file_id")}, {"deadline": 1, "_id": 0})
                if meta and meta.get("deadline"):
                    action["deadline"] = meta.get("deadline")
                else:
                    action["deadline"] = None
            except Exception:
                action["deadline"] = None

        # Enrich actions with uploader email and department display derived from metadata
        # Fetch email, account_type and department from metadata (if available) using the file_id
        action["uploader_email"] = action.get("email") if action.get("email") else None
        action["uploaded_by_department"] = None
        if action.get("file_id"):
            try:
                meta_info = metadata_collection.find_one(
                    {"file_id": action.get("file_id")}, {"user_id": 1, "email": 1, "account_type": 1, "department": 1, "_id": 0}
                )
                if meta_info:
                    # prefer metadata email over action-level email
                    if meta_info.get("email"):
                        action["uploader_email"] = meta_info.get("email")
                    else:
                        # If metadata lacks email, try to resolve via user_id stored in metadata
                        meta_user_id = meta_info.get("user_id")
                        if meta_user_id:
                            try:
                                user_doc = user_collection.find_one({"user_id": meta_user_id}, {"email": 1, "_id": 0})
                                if user_doc and user_doc.get("email"):
                                    action["uploader_email"] = user_doc.get("email")
                            except Exception:
                                pass

                    acct = (meta_info.get("account_type") or "").strip()
                    # If account type indicates staff, display the department; otherwise show the account type value itself
                    if acct and acct.lower() == "staff":
                        action["uploaded_by_department"] = meta_info.get("department") or acct
                    else:
                        # If account_type present, display it (e.g., Admin, External). If not, leave null.
                        action["uploaded_by_department"] = meta_info.get("account_type") or None
                else:
                    # no metadata found; try to resolve uploader email via action.user_id or action.email
                    if action.get("user_id"):
                        try:
                            user_doc = user_collection.find_one({"user_id": action.get("user_id")}, {"email": 1, "_id": 0})
                            if user_doc and user_doc.get("email"):
                                action["uploader_email"] = user_doc.get("email")
                        except Exception:
                            pass
                    # leave uploaded_by_department as None
                    pass
            except Exception:
                # on any lookup error, leave defaults
                action["uploader_email"] = action.get("email") if action.get("email") else None
                action["uploaded_by_department"] = None

        # Final fallback attempts to resolve uploader email from users collection
        if not action.get("uploader_email"):
            try:
                # 1) Try action.user_id
                if action.get("user_id"):
                    u = user_collection.find_one({"user_id": action.get("user_id")}, {"email": 1, "_id": 0})
                    if u and u.get("email"):
                        action["uploader_email"] = u.get("email")

                # 2) Try meta_info.user_id (if meta_info exists and wasn't checked above)
                if not action.get("uploader_email") and action.get("file_id"):
                    try:
                        mi = metadata_collection.find_one({"file_id": action.get("file_id")}, {"user_id": 1, "_id": 0})
                        if mi and mi.get("user_id"):
                            u2 = user_collection.find_one({"user_id": mi.get("user_id")}, {"email": 1, "_id": 0})
                            if u2 and u2.get("email"):
                                action["uploader_email"] = u2.get("email")
                    except Exception:
                        pass

                # 3) Try by username stored on the action
                if not action.get("uploader_email") and action.get("username"):
                    try:
                        u3 = user_collection.find_one({"username": action.get("username")}, {"email": 1, "_id": 0})
                        if u3 and u3.get("email"):
                            action["uploader_email"] = u3.get("email")
                    except Exception:
                        pass

                # Final final fallback: keep action.email if present
                if not action.get("uploader_email"):
                    action["uploader_email"] = action.get("email") if action.get("email") else None
            except Exception:
                # swallow any unexpected errors and default to action.email
                action["uploader_email"] = action.get("email") if action.get("email") else None

    total_count = actions_collection.count_documents({})
    return jsonify({"actions": actions, "total_count": total_count}), 200



@app.route('/ask-file', methods=['POST'])
def ask_file_endpoint():
    data = request.get_json()
    file_name = data.get('file_name')
    file_path = data.get('file_path')
    query = data.get('query')
    file_id = data.get('file_id')
    user_id = data.get('user_id')
    return jsonify({"response": ask_file(file_name=file_name, path=file_path, question=query, file_id=file_id, user_id=user_id)})


@app.route('/kie-directory', methods=['POST'])
def extract_kie_from_folder_endpoint():
    data = request.get_json()
    folder = data.get('folder')
    schema = data.get('schema')
    return jsonify(extract_kie_from_folder(folder, schema))

@app.route('/get-kie', methods=['POST'])
def get_kie_endpoint():
    data = request.get_json()
    dir_name = data.get('dir_name')
    path = data.get('path')
    return jsonify(get_kie(dir_name, path))


@app.route('/generate-graph', methods=['POST'])
def generate_graph_endpoint():
    data = request.get_json()
    query = data.get('query')
    return jsonify(generate_graphs(query))

@app.route('/generate-gemini-graph', methods=['POST'])
def generate_gemini_graph_endpoint():
    data = request.get_json()
    query = data.get('query')
    return jsonify(generate_graphs_gemini(query))




@app.route('/get-metadata', methods=['POST'])
def get_metadata_endpoint():
    data = request.get_json()
    name = data.get('name')
    user_id = data.get('user_id')


    # Otherwise, resolve using access rules for the requesting user
    if not user_id:
        return jsonify({"error": "Either path or user_id must be provided to resolve metadata"}), 400

    from backend.storage import find_metadata_for_user
    metadata = find_metadata_for_user(name, user_id)
    if not metadata:
        return jsonify({"error": "File not found or access denied"}), 404
    # remove embeddings for payload size
    if "embeddings" in metadata:
        metadata.pop("embeddings")
    
    # Include department summaries and action points if available
    file_id = metadata.get('file_id')
    if file_id:
        # Fetch dept_summaries, dept_action_points, document_summary, and document_action_points from metadata collection
        dept_data = metadata_collection.find_one(
            {"file_id": file_id},
            {
                "dept_summaries": 1, 
                "dept_action_points": 1, 
                "document_summary": 1, 
                "document_action_points": 1, 
                "_id": 0
            }
        )
        if dept_data:
            metadata["dept_summaries"] = dept_data.get("dept_summaries", {})
            metadata["dept_action_points"] = dept_data.get("dept_action_points", {})
            metadata["document_summary"] = dept_data.get("document_summary", "")
            metadata["document_action_points"] = dept_data.get("document_action_points", [])
    
    return jsonify(metadata), 200


@app.route("/api/web-search", methods=["POST"])
def api_web_search():
    """
    Perform a web search using Gemini with Google Search grounding.
    Body:
      - query: string (required)
      - external_web_access: optional bool, default True (enables Google Search grounding)
    """
    try:
        data = request.get_json(force=True) or {}
        query = data.get("query", "").strip()
        external_web_access = data.get("external_web_access", True)

        if not query:
            return jsonify({"error": "query is required"}), 400

        result = run_gemini_web_search(
            query,
            use_google_search=external_web_access,
        )

        return jsonify(
            {
                "answer": result.get("answer"),
                "citations": result.get("citations", []),
            }
        ), 200
    except Exception as e:
        app.logger.exception("/api/web-search failed")
        return jsonify({"error": str(e)}), 500


@app.route('/get-redacted-version', methods=['POST'])
def get_redacted_version_endpoint():
    data = request.get_json()
    file_path = data.get('path')
    name = data.get('name')
    redactedVersionId = metadata_collection.find_one({"path": file_path, "name": name},{"redactedVersion": 1, "_id": 0})
    redactedFile = fs.get(ObjectId(redactedVersionId['redactedVersion']))
    return Response(
        redactedFile,
        content_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={name}"}
    )

@app.post("/api/extract/table")
def api_extract_table():
    """
    Extract tables from a PDF (vector or scanned) in GridFS.
    Body: {"file_id": "<gridfs id>"}
    Returns: {"tables": [...], "method": "vector"|"scanned"}
    """
    try:
        data = request.get_json(force=True)
        file_id = data.get("file_id")
        if not file_id:
            return jsonify({"error": "file_id is required"}), 400
        gridout = fs.get(ObjectId(file_id))
        pdf_bytes = gridout.read()
        if is_vector_pdf(pdf_bytes):
            tables = extract_tables_vector_pdf(pdf_bytes)
            return jsonify({"tables": tables, "method": "vector"})
        else:
            images = pdf_to_images(pdf_bytes)
            tables = extract_tables_scanned_pdf(images)
            return jsonify({"tables": tables, "method": "scanned"})
    except Exception as e:
        app.logger.exception("/api/extract/table failed")
        return jsonify({"error": str(e)}), 500
# ---------------------------------- EMAIL NOTIFICATION ROUTES --------------------------------------------------- #

@app.route("/email/test", methods=["POST"])
def test_email():
    """Test email functionality."""
    data = request.get_json()
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    try:
        # Send a test upload success email
        success = email_notifications.send_file_upload_success(
            user_id=user_id,
            file_name="Test Document.pdf",
            department="Test Department"
        )
        
        if success:
            return jsonify({"message": "Test email sent successfully"}), 200
        else:
            return jsonify({"error": "Failed to send test email"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Error sending test email: {str(e)}"}), 500

@app.route("/email/debug-user", methods=["POST"])
def debug_user():
    """Debug user details fetching."""
    data = request.get_json()
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    try:
        # Get user details using the email service
        username, email = email_notifications.get_user_details(user_id)
        
        return jsonify({
            "user_id": user_id,
            "username": username,
            "email": email,
            "found": bool(email)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error fetching user details: {str(e)}"}), 500

# ---------------------------------- END OF EMAIL NOTIFICATION ROUTES --------------------------------------------------- #

# ---------------------------------- END OF ADMIN WORKFLOW ROUTES --------------------------------------------------- #


print('KMRL Nexus has started')





@app.route("/api/documents/<file_id>/summary", methods=["GET"])
def get_file_summary(file_id):
    """
    Get department-specific summary for a document.
    
    Query parameters:
    - department: Optional specific department to filter results
    """
    try:
        department = request.args.get('department')
        result = get_document_summary(file_id, department)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate summary: {str(e)}"}), 500


@app.route("/api/documents/<file_id>/summary", methods=["POST"])
def generate_file_summary(file_id):
    """
    Generate department-specific summaries for a document.
    
    JSON body (optional):
    - departments: Array of department names to generate summaries for
    """
    try:
        data = request.get_json() or {}
        departments = data.get('departments')
        result = generate_department_summaries(file_id, departments)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate summary: {str(e)}"}), 500


@app.route("/api/documents/<file_id>/action-points", methods=["GET"])
def get_file_action_points(file_id):
    """
    Get department-specific action points for a document.
    
    Query parameters:
    - department: Optional specific department to filter results
    """
    try:
        department = request.args.get('department')
        if department:
            result = get_action_points_for_department(file_id, department)
        else:
            result = generate_action_points(file_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate action points: {str(e)}"}), 500


@app.route("/api/documents/<file_id>/action-points", methods=["POST"])
def generate_file_action_points(file_id):
    """
    Generate department-specific action points for a document.
    
    JSON body (optional):
    - departments: Array of department names to generate action points for
    """
    try:
        data = request.get_json() or {}
        departments = data.get('departments')
        result = generate_action_points(file_id, departments)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate action points: {str(e)}"}), 500


@app.route("/api/suggest-document-types", methods=["POST"])
def suggest_document_types_endpoint():
    """
    Analyze uploaded files and suggest document type based on content.
    Expects multipart/form-data with 'files' containing the documents to analyze.
    """
    try:
        files = request.files.getlist("files")
        if not files:
            return jsonify({"success": False, "error": "No files provided"}), 400
        
        all_text = ""
        processed_files = []
        
        # Extract text from all uploaded files
        for file in files:
            try:
                # Reset file pointer to beginning
                file.seek(0)
                
                # Extract text using existing extraction function
                extracted_text = extract_text_from_file(file, None, None)
                if extracted_text and extracted_text.strip():
                    all_text += f"\n\nFile: {file.filename}\n{extracted_text}"
                    processed_files.append(file.filename)
                else:
                    print(f"No text extracted from {file.filename}")
                    
            except Exception as e:
                print(f"Error processing file {file.filename}: {str(e)}")
                continue
        
        if not all_text.strip():
            return jsonify({
                "success": False, 
                "error": "Could not extract readable text from any of the uploaded files"
            }), 400
        
        # Get AI suggestions using the document type suggestion service
        result = document_type_suggestion_service.suggest_document_type(all_text)
        
        # Add metadata about processed files
        result["processed_files"] = processed_files
        result["total_files"] = len(files)
        result["files_with_text"] = len(processed_files)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in suggest_document_types_endpoint: {str(e)}")
        return jsonify({
            "success": False, 
            "error": f"Internal server error: {str(e)}"
        }), 500


# ---------------------------------- KEY RETRIEVAL APIs (query, blurb, precedents) ----------------------------------- #
# See POST /api/query, POST /api/blurb, POST /api/precedents defined above.
# ---------------------------------- END --------------------------------------------------------------------------- #


if __name__ == "__main__":
    app.run(port=7138, host="0.0.0.0")
