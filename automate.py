import os
import base64
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    # Check content type to handle different request formats
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Handle multipart form data
        data = {}
        for key in request.form:
            try:
                # Try to parse JSON data from form fields
                data[key] = json.loads(request.form[key])
            except:
                # If not JSON, store as is
                data[key] = request.form[key]
        
        # Handle file attachments from the form
        if request.files:
            os.makedirs('attachments', exist_ok=True)
            for file_key in request.files:
                file = request.files[file_key]
                # Skip empty file inputs
                if file.filename == '':
                    continue
                    
                file_path = os.path.join('attachments', file.filename)
                file.save(file_path)
                print(f"Saved attachment from form: {file.filename}")
                
                # Add information about the saved file to response data
                if 'saved_attachments' not in data:
                    data['saved_attachments'] = []
                data['saved_attachments'].append({
                    'filename': file.filename,
                    'path': file_path
                })
    else:
        # Handle JSON data
        data = request.get_json(silent=True) or {}
    
    # Print the received data to the terminal
    print("Received data from n8n:")
    print(data)
    
    # Process email data if present
    email_data = data.get('emailData', {})
    email = email_data.get('email', {})
    
    # Check for attachments in various possible locations
    attachments = data.get('attachments', [])
    email_attachments = email.get('attachments', [])
    
    # Check if there's a direct attachmentBase64 field in the data
    attachment_base64 = data.get('attachmentBase64')
    file_name = data.get('fileName', 'attachment.pdf')
    file_type = data.get('fileType')
    has_attachments = data.get('hasAttachments', False)
    
    if attachments or email_attachments or (attachment_base64 and has_attachments):
        # Create directory for attachments if it doesn't exist
        os.makedirs('attachments', exist_ok=True)
        
        # Process direct attachment if available
        if attachment_base64 and has_attachments:
            try:
                # Clean up base64 data if needed
                attachment_base64 = attachment_base64.strip()
                if attachment_base64:
                    # Fix potential base64 padding issues
                    missing_padding = len(attachment_base64) % 4
                    if missing_padding:
                        attachment_base64 += '=' * (4 - missing_padding)
                        
                    # Decode base64 content
                    pdf_data = base64.b64decode(attachment_base64)
                    
                    # Ensure the filename has an extension
                    if not file_name or file_name == '0':
                        file_name = f"attachment_{file_type or 'pdf'}.pdf"
                    
                    # Save to file
                    file_path = f'attachments/{file_name}'
                    with open(file_path, 'wb') as f:
                        f.write(pdf_data)
                    print(f"Saved direct attachment: {file_name}")
            except Exception as e:
                print(f"Error saving direct attachment: {str(e)}")
        
        # Process attachments from both possible locations
        all_attachments = attachments + email_attachments
        for i, attachment in enumerate(all_attachments):
            content = attachment.get('content', '')
            if content:
                try:
                    # Decode base64 content
                    file_data = base64.b64decode(content)
                    
                    # Get filename or generate one
                    filename = attachment.get('filename', f'attachment_{i}.bin')
                    
                    # Save to file
                    file_path = f'attachments/{filename}'
                    with open(file_path, 'wb') as f:
                        f.write(file_data)
                    print(f"Saved attachment: {filename}")
                except Exception as e:
                    print(f"Error saving attachment {i}: {str(e)}")
    else:
        print("No attachments found in the request")
    
    # Return a success response
    return jsonify({"status": "success", "message": "Data received"}), 200

if __name__ == '__main__':
    print("Server started. Waiting for POST requests from n8n...")
    # Run the Flask app on port 7138
    app.run(host='0.0.0.0', port=7138, debug=True)