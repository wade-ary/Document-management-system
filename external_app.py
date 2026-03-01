# external_app.py

from flask import Blueprint, request, jsonify, redirect, render_template, session, Response
import requests
from authlib.integrations.flask_oauth2 import AuthorizationServer
from datetime import datetime, timedelta
from functools import wraps
from bson.objectid import ObjectId
from pymongo import MongoClient
import gridfs
from backend.MIS.mis_backend import (
    generate_client_id,
    generate_client_secret,
    generate_authorization_code,
    generate_access_token,
    user_collection,
    external_clients_collection,
    authorization_codes_collection,
    access_tokens_collection,
    metadata_collection,
)


import os
from dotenv import load_dotenv
import mimetypes
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["Transformo"]# store all the actions performed by the user
external_metadata_collection = db['external_metadata']
external_fs = gridfs.GridFS(db, collection='external_fs')
external_actions_collection = db["external_actions"]
fs = gridfs.GridFS(db)
external_bp = Blueprint('external', __name__)
authorization = AuthorizationServer()

# Helper function to render templates (ensure you have a templates directory)
def render_external_template(template_name, **context):
    return render_template(template_name, **context)

# Application Registration Endpoint
@external_bp.route('/external/register_app', methods=['POST'])
def register_external_app():
    data = request.get_json()
    company_name = data.get('company_name')
    contact_email = data.get('contact_email')
    redirect_uri = data.get('redirect_uri')

    if not company_name or not contact_email or not redirect_uri:
        return jsonify({'error': 'Company name, contact email, and redirect URI are required'}), 400

    # Generate client credentials
    client_id = generate_client_id()
    client_secret = generate_client_secret()

    # Store in the database
    client_data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'company_name': company_name,
        'contact_email': contact_email,
        'redirect_uri': redirect_uri,
        'created_at': datetime.utcnow()
    }
    external_clients_collection.insert_one(client_data)

    return jsonify({
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri
    }), 201

# OAuth 2.0 Authorization Endpoint
@external_bp.route('/external/oauth/authorize', methods=['GET', 'POST'])
def external_authorize():
    client_id = request.args.get('client_id')
    redirect_uri = request.args.get('redirect_uri')
    state = request.args.get('state')

    # Verify client_id and redirect_uri
    client = external_clients_collection.find_one({'client_id': client_id})
    if not client or redirect_uri != client.get('redirect_uri'):
        return jsonify({'error': 'Invalid client or redirect URI'}), 400

    if request.method == 'GET':
        # Store client_id and redirect_uri in session for POST handling
        session['client_id'] = client_id
        session['redirect_uri'] = redirect_uri
        session['state'] = state

        # Render the login and authorization form
        return render_external_template('external_authorize.html', client=client, state=state)

    elif request.method == 'POST':
        # Authenticate user
        username = request.form.get('username')
        email = request.form.get('email')

        user = user_collection.find_one({'username': username, 'email': email})
        if not user:
            error = 'Invalid username or email'
            return render_external_template('external_authorize.html', client=client, state=state, error=error)

        # User is authenticated
        # Generate authorization code
        auth_code = generate_authorization_code()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        authorization_codes_collection.insert_one({
            'auth_code': auth_code,
            'client_id': client_id,
            'user_id': user['user_id'],
            'expires_at': expires_at,
            'redirect_uri': redirect_uri
        })

        # Redirect back to the third-party site with the authorization code
        redirect_url = f"{redirect_uri}?code={auth_code}&state={state}"
        return redirect(redirect_url)

# OAuth 2.0 Token Endpoint
@external_bp.route('/external/oauth/token', methods=['POST'])
def external_token():
    client_id = request.form.get('client_id')
    client_secret = request.form.get('client_secret')
    auth_code = request.form.get('code')
    redirect_uri = request.form.get('redirect_uri')

    # Verify client credentials
    client = external_clients_collection.find_one({'client_id': client_id, 'client_secret': client_secret})
    if not client:
        return jsonify({'error': 'Invalid client credentials'}), 401

    # Verify authorization code
    code_data = authorization_codes_collection.find_one({'auth_code': auth_code, 'client_id': client_id})
    if not code_data or code_data['expires_at'] < datetime.utcnow():
        return jsonify({'error': 'Invalid or expired authorization code'}), 400

    if redirect_uri != code_data['redirect_uri']:
        return jsonify({'error': 'Invalid redirect URI'}), 400

    # Generate access token
    access_token = generate_access_token()
    expires_in = 3600  # Token valid for 1 hour
    user_id = code_data['user_id']

    # Store access token
    access_tokens_collection.insert_one({
        'access_token': access_token,
        'client_id': client_id,
        'user_id': user_id,
        'expires_at': datetime.utcnow() + timedelta(seconds=expires_in)
    })

    # Delete authorization code
    authorization_codes_collection.delete_one({'auth_code': auth_code})

    return jsonify({
        'access_token': access_token,
        'token_type': 'Bearer',
        'expires_in': expires_in
    }), 200

# Authentication Decorator for External Endpoints
def external_auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Access token is missing or invalid'}), 401

        token_str = auth_header.split(' ')[1]

        # Verify the access token
        token_data = access_tokens_collection.find_one({'access_token': token_str})
        if not token_data or token_data['expires_at'] < datetime.utcnow():
            return jsonify({'error': 'Invalid or expired access token'}), 403

        # Attach user to the request context
        user = user_collection.find_one({'user_id': token_data['user_id']})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        request.user = user
        return f(*args, **kwargs)
    return decorated


# External List Directory Endpoint
@external_bp.route('/external/list_dir', methods=['POST'])
@external_auth_required
def external_list_dir():
    dir_path = request.json.get('dir') or '~/Sandbox'


    ###  CURRENTLY ALL FILES ARE BEING FETCHED , IT SHOULD ONLY FETCH THE FILES WHICH ARE APPROVED AND BELONG TO THE USER ###
    files = metadata_collection.find({
        'user_id': request.user['user_id'],
        'path': dir_path,
        'approvalStatus': 'approved'  # Only get approved files
    })
    file_list = []
    
    for file in files:
        file_list.append({
            'file_id': file['file_id'],
            'name': file['name'],
            'path': file['path'],
            'tags': file.get('tags', [])
        })
    
    return jsonify({'files': file_list}), 200

# External View File Endpoint
@external_bp.route('/external/view_file', methods=['POST'])
@external_auth_required
def external_view_file():
    user = request.user
    file_id = request.json.get('file_id')
    if not file_id:
        return jsonify({'error': 'File ID is required'}), 400

    file_metadata = metadata_collection.find_one({'file_id': file_id, 'user_id': user['user_id']})
    if not file_metadata:
        return jsonify({'error': 'File not found'}), 404

    try:
        grid_out = fs.get(ObjectId(file_id))
        return Response(
            grid_out.read(),
            mimetype=file_metadata['file_type'],
            headers={"Content-Disposition": f"attachment;filename={file_metadata['name']}"}
        )
    except Exception as e:
        return jsonify({"error": "Error retrieving file", "details": str(e)}), 500
    
    
    
# External Import Files Endpoint - lists importable files
@external_bp.route('/external/list_importable_files', methods=['GET'])
@external_auth_required
def list_importable_files():
    user = request.user
    # Only approved files for this user
    files = metadata_collection.find({
        'user_id': user['user_id'],
        'approvalStatus': 'approved'
    })

    importable_files = []
    for file in files:
        importable_files.append({
            'file_id': file['file_id'],
            'filename': file['name'],
            'file_type': file['file_type'],
            'upload_date': file['upload_date'],
            'tags': file.get('tags', [])
        })

    return jsonify({'importable_files': importable_files}), 200

@external_bp.route('/external/import_files', methods=['POST'])
@external_auth_required
def import_files_to_external_app():
    user = request.user
    file_ids = request.json.get('file_ids', [])
    
    if not file_ids:
        return jsonify({'error': 'No files selected for import'}), 400
    
    imported_files = []
    failed_files = []
    user_id = user['user_id']
    
    for file_id in file_ids:
        file_metadata = metadata_collection.find_one({
            'file_id': file_id, 
            'user_id': user_id,
            'approvalStatus': 'approved'
        })

        if not file_metadata:
            failed_files.append({'file_id': file_id, 'reason': 'File not found or not approved'})
            continue

        try:
            grid_out = fs.get(ObjectId(file_id))
            file_content = grid_out.read()
            
            # Upload to external application
            external_app_upload_url = "http://localhost:5000/external/upload"
            response = requests.post(
                external_app_upload_url,
                files={'file': (file_metadata['name'], file_content, file_metadata['file_type'])},
                data={'original_file_id': file_id, 'type': 'external'}
            )

            if response.status_code == 200:
                imported_files.append({
                    'file_id': file_id,
                    'filename': file_metadata['name'],
                    'file_type': file_metadata['file_type']
                })

                # Log the action for this successfully imported file
                action_doc = {
                    "action_id": str(ObjectId()),
                    "user_id": user_id,
                    "file_id": file_id,
                    "action": "upload",
                    "type": "external",
                    "timestamp": datetime.utcnow().isoformat(),
                }
                external_actions_collection.insert_one(action_doc)
            else:
                failed_files.append({
                    'file_id': file_id,
                    'reason': f'External app upload failed with status {response.status_code}'
                })

        except Exception as e:
            failed_files.append({'file_id': file_id, 'reason': str(e)})
    
    return jsonify({
        'message': 'File import process completed',
        'imported_files': imported_files,
        'failed_files': failed_files
    }), 200



# @external_bp.route('/external/upload', methods=['POST'])
# @external_auth_required
# def external_upload_endpoint():
#     """
#     Handles file uploads from external applications, similar to /upload in TransformoDocs.
#     This allows external clients (after authenticating via OAuth) to upload files to TransformoDocs' external storage.
#     """
#     # Check if 'files' part in the request
#     if "files" not in request.files:
#         return jsonify({"error": "No files part in the request"}), 400

#     files = request.files.getlist("files")
#     path = request.form.get("path")
#     department = request.form.get("department")
#     access_to = request.form.get("access_to")

#     # The authenticated user information is in request.user
#     user = request.user
#     user_id = user['user_id']

#     if not path:
#         return jsonify({"error": "No path specified"}), 400

#     saved_files = []
#     for file in files:
#         # Validate file
#         if not file or not allowed_file(file.filename):
#             return jsonify({"error": "File type not allowed or missing"}), 400

#         filename = file.filename

#         # Check if file with same name exists in that path
#         existing_file = external_metadata_collection.find_one({"name": filename, "path": path})
#         if existing_file:
#             return jsonify({"error": f"A file with the name '{filename}' already exists in path '{path}'."}), 400

#         # Create directories if needed
#         create_directory_structure(path)

#         # Guess mime type
#         content_type, _ = mimetypes.guess_type(filename)
#         if content_type is None:
#             content_type = 'application/octet-stream'

#         # Calculate file size
#         file_content = file.read()
#         file_size = len(file_content)
#         file.seek(0)

#         # Put file into external_fs GridFS
#         file_id = external_fs.put(file, filename=filename)
#         file_id = str(file_id)

#         # Extract text and additional metadata
#         extracted_text = extract_text_from_file(file, file_id, content_type)
#         embeddings = extract_embeddings_from_file(extracted_text)
#         keywords = extract_keywords_from_file(extracted_text)
#         generated_tags = generate_tags(extracted_text)

#         # Insert into external_metadata_collection
#         metadata_doc = {
#             "name": filename,
#             "file_id": file_id,
            
#             "file_type": content_type,
#             "upload_date": datetime.utcnow().isoformat(),
#             "file_size": file_size,
#             "page_count": None,
#             "extracted_text": extracted_text,
#             "embeddings": embeddings,
#             "key_topics": keywords,
#             "tags": generated_tags,
#             "user_id": user_id,
#             "approvalStatus": "pending",  # Default approval status, or adjust as needed
#             "visible": False,  # Default visibility
#             "department": department,
#             "access_to": access_to
#         }
#         external_metadata_collection.insert_one(metadata_doc)


#     return jsonify({"message": "Files successfully uploaded", "files": saved_files}), 200


@external_bp.route('/external/upload', methods=['POST'])
@external_auth_required
def external_upload():
    user = request.user
    file_id = request.json.get('file_id')
    
    if not file_id:
        return jsonify({'error': 'No file_id provided'}), 400

    # Verify the file belongs to the user and is approved
    file_metadata = metadata_collection.find_one({
        'file_id': file_id,
        'user_id': user['user_id'],
        'approvalStatus': 'approved'
    })
    if not file_metadata:
        return jsonify({'error': 'File not found or not approved'}), 404

    try:
        # Retrieve file from TransformoDocs GridFS
        grid_out = fs.get(ObjectId(file_id))
        file_content = grid_out.read()
        
        # Store the file in external_fs GridFS
        external_file_id = external_fs.put(
            file_content, 
            filename=file_metadata['name'], 
            contentType=file_metadata['file_type']
        )

        return jsonify({
            'message': 'File successfully uploaded to external storage', 
            'external_file_id': str(external_file_id)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500