# third_party_app.py

from flask import Flask, flash, redirect, request, session, url_for, render_template, Response, send_from_directory, jsonify
import requests
import secrets
from flask_cors import CORS
from pymongo import MongoClient
import os
from bson import ObjectId
import gridfs
from dotenv import load_dotenv
load_dotenv()
from werkzeug.utils import secure_filename
app = Flask(__name__)
CORS(app, origins=["*"], resources={r"/*": {"origins": "*"}},supports_credentials=True)

app.secret_key = secrets.token_hex(32)

# TransformoDocs URLs (running on localhost:5000)
TRANSFORMO_BASE_URL = 'http://localhost:5000'
AUTHORIZATION_URL = f'{TRANSFORMO_BASE_URL}/external/oauth/authorize'
TOKEN_URL = f'{TRANSFORMO_BASE_URL}/external/oauth/token'
LIST_DIR_URL = f'{TRANSFORMO_BASE_URL}/external/list_dir'
VIEW_FILE_URL = f'{TRANSFORMO_BASE_URL}/external/view_file'
LIST_IMPORTABLE_FILES_URL = f'{TRANSFORMO_BASE_URL}/external/list_importable_files'
IMPORT_FILES_URL = f'{TRANSFORMO_BASE_URL}/external/import_files'
UPLOAD_URL = f'{TRANSFORMO_BASE_URL}/external/upload'
# External application (your current app) running at localhost:8000
CLIENT_ID = 'j6BGBMm4WCNsitehcQlEYA'
CLIENT_SECRET = 'afbj5tB_bJzPbkwCK2DFqlz23hjnKxP8rPGZjvCjTHw'
REDIRECT_URI = 'http://localhost:8000/callback'



# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['Transformo']
metadata = db['metadata']
external_client = db['external_clients']
# create a gridfs and also a collection to store the file metadata
fs = gridfs.GridFS(db)

app.config.update(
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_NAME='transformodoc_session',
    PERMANENT_SESSION_LIFETIME=1800,
)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    session.clear()
    state = secrets.token_urlsafe(16)
    session['oauth_state'] = state
    auth_url = f"{AUTHORIZATION_URL}?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&state={state}&response_type=code"
    return redirect(auth_url)

@app.route('/generate-state', methods=['GET'])
def generate_state():
    # Generate a random and unique state parameter
    state = secrets.token_urlsafe(16)
    session['oauth_state'] = state  # Store the state in the session
    return jsonify({'state': state})

@app.route('/callback')
def callback():
    error = request.args.get('error')
    if error:
        return f'Authorization failed: {error}', 400

    code = request.args.get('code')
    state = request.args.get('state')

    stored_state = session.get('oauth_state')
    if not state or not stored_state or state != stored_state:
        return f'Invalid state parameter. Received: {state}, Stored: {stored_state}', 400

    try:
        token_response = requests.post(
            TOKEN_URL,
            data={
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
                'code': code,
                'redirect_uri': REDIRECT_URI,
                'grant_type': 'authorization_code'
            },
            timeout=10
        )
        token_response.raise_for_status()
        token_data = token_response.json()

        if 'access_token' not in token_data:
            return 'No access token in response', 400

        session['access_token'] = token_data['access_token']
        return redirect(url_for('protected_resource'))

    except requests.exceptions.RequestException as e:
        print(f"Token exchange error: {str(e)}")
        return 'Error obtaining access token', 400

@app.route('/protected_resource')
def protected_resource():
    access_token = session.get('access_token')
    if not access_token:
        return redirect(url_for('login'))

    try:
        response = requests.post(
            LIST_DIR_URL,
            headers={
                'Authorization': f"Bearer {access_token}",
                'Content-Type': 'application/json'
            },
            json={'dir': '~/Sandbox'},
            timeout=10
        )
        response.raise_for_status()
        files_data = response.json()
        
        return render_template('files.html', files=files_data.get('files', []))

    except requests.exceptions.RequestException as e:
        print(f"API request error: {str(e)}")
        return 'Error accessing protected resource', 500

@app.route('/view_file')
def view_file():
    access_token = session.get('access_token')
    if not access_token:
        return redirect(url_for('login'))

    file_id = request.args.get('file_id')
    if not file_id:
        return 'Missing file ID', 400

    try:
        response = requests.post(
            VIEW_FILE_URL,
            headers={
                'Authorization': f"Bearer {access_token}",
                'Content-Type': 'application/json'
            },
            json={'file_id': file_id},
            timeout=10
        )
        response.raise_for_status()

        return Response(
            response.content,
            content_type=response.headers.get('Content-Type', 'application/octet-stream'),
            headers={"Content-Disposition": response.headers.get('Content-Disposition', 'inline')}
        )

    except requests.exceptions.RequestException as e:
        print(f"Error fetching file: {str(e)}")
        return 'Error retrieving file', 500


@app.route('/upload_via_transformodocs')
def upload_via_transformodocs():
    access_token = session.get('access_token')
    if not access_token:
        return redirect(url_for('login'))

    try:
        importable_files_response = requests.get(
            LIST_IMPORTABLE_FILES_URL,
            headers={
                'Authorization': f"Bearer {access_token}",
                'Content-Type': 'application/json'
            },
            timeout=10
        )
        importable_files_response.raise_for_status()
        importable_files_data = importable_files_response.json()
        
        return render_template('import_files.html', files=importable_files_data.get('importable_files', []))

    except requests.exceptions.RequestException as e:
        print(f"Error fetching importable files: {str(e)}")
        return 'Error retrieving importable files', 500


@app.route('/do_import', methods=['POST'])
def do_import():
    access_token = session.get('access_token')
    if not access_token:
        return redirect(url_for('login'))

    selected_files = request.form.getlist('selected_files')
    if not selected_files:
        return 'No files selected', 400

    try:
        # External database connection
        external_client = MongoClient(os.getenv('MONGO_URI'))
        external_db = external_client["Transformo"]
        external_metadata_collection = external_db['metadata']
        external_gridfs = gridfs.GridFS(external_db)

        for file_id in selected_files:
            # Find the file metadata using the file_id
            file_metadata = external_metadata_collection.find_one({'file_id': file_id})
            if not file_metadata:
                print(f"No metadata found for file_id: {file_id}")
                continue

            # Debug: Print out the metadata
            print(f"File Metadata: {file_metadata}")

            try:
                # Retrieve the file from GridFS using the file_id
                gridfs_file = external_gridfs.get(ObjectId(file_id))
                file_content = gridfs_file.read()

                # Store file in local GridFS
                new_file_id = fs.put(
                    file_content, 
                    filename=file_metadata.get('name', 'unnamed_file'),
                    metadata={
                        'file_type': file_metadata.get('file_type', 'unknown'),
                        'upload_date': file_metadata.get('upload_date'),
                        'tags': file_metadata.get('tags', []),
                        'original_file_id': file_id
                    }
                )

                # Store metadata in local metadata collection
                metadata.insert_one({
                    'file_id': new_file_id,
                    'name': file_metadata.get('name', 'unnamed_file'),
                    'file_type': file_metadata.get('file_type', 'unknown'),
                    'upload_date': file_metadata.get('upload_date'),
                    'tags': file_metadata.get('tags', []),
                    'original_file_id': file_id
                })

                print(f"Successfully imported file: {file_id}")

            except Exception as file_error:
                print(f"Error importing specific file {file_id}: {str(file_error)}")
                continue

        # Close the external client connection
        external_client.close()

        flash(f"Successfully imported files {selected_files}", "success")
        return redirect(url_for('protected_resource'))

    except Exception as e:
        print(f"Error importing files: {str(e)}")
        flash("Error importing files. Please check the logs.", "error")
        return 'Error importing files', 500

@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        # Check if the post request has the file part
        if 'file' not in request.files:
            return 'No file part', 400
        file = request.files['file']
        if file.filename == '':
            return 'No selected file', 400
        if file:
            # If the user does not select file, browser also
            # submit an empty part without filename
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            return redirect(url_for('uploaded_file', filename=filename))
    return render_template('upload.html')

@app.route('/uploaded_file/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/get-client-details', methods=['GET'])
def get_client_details():
    try:
        #
        client_details = external_client.find_one({"client_id": CLIENT_ID})
        
        if not client_details:
            return jsonify({"message": "Client details not found"}), 404

        return jsonify({
            "company_name": client_details.get("company_name", "Unknown Company"),
            "contact_email": client_details.get("contact_email", "No Email Provided"),
            "redirect_uri": client_details.get("redirect_uri", REDIRECT_URI)
        }), 200

    except Exception as e:
        print(f"Error fetching client details: {str(e)}")
        return jsonify({"message": "Failed to fetch client details"}), 500



if __name__ == '__main__':
    app.run(port=8000, debug=True)
