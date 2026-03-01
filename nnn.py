import os


import mimetypes
from bson import ObjectId
import openai
from spacy.lang.en.stop_words import STOP_WORDS
from PyPDF2 import PdfReader
import docx2txt

from langchain_openai import OpenAIEmbeddings
from io import BytesIO
import json
import requests
import base64
from PIL import Image
import fitz  # PyMuPDF
from pymongo import MongoClient
from openai import OpenAI
from gridfs import GridFS
from io import BufferedReader
import spacy
import dotenv
from backend.db import MongoDB
dotenv.load_dotenv()
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")


db = MongoDB.get_db('EDUDATA')
fs = MongoDB.get_fs('EDUDATA')
users_collection = db['users']
docs_collection = db['metadata']
openai_client = OpenAI()

nlp = spacy.load("en_core_web_sm")

# Set up local storage directories
LOCAL_FILES_DIR = "./tempfiles"
LOCAL_METADATA_DIR = "./metadata"
os.makedirs(LOCAL_FILES_DIR, exist_ok=True)
os.makedirs(LOCAL_METADATA_DIR, exist_ok=True)

# Load environment variables (e.g., OpenAI API key)
# openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_openai(prompt,max_tokens=2000,temperature=0.3,model='gpt-4o-mini',json_parse=False):
    response = openai.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": prompt}
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    if json_parse:
        result = response.choices[0].message.content.replace("```json","").replace("```","")
        try:
            result = json.loads(result)
        except json.JSONDecodeError:
            print("Error parsing JSON")
            print(result)
            
    else :
        result = response.choices[0].message.content
    return result

def encode_image(image_file: BufferedReader) -> str:
    """
    Encode the image to base64 format for API consumption.
    """
    return base64.b64encode(image_file.read()).decode('utf-8')
# def get_description_from_image(file: BufferedReader) -> str:
#     """
#     Send image to OpenAI to generate a detailed description of the image.
#     """
#     # Encode the image to base64
#     base64_image = encode_image(file)

#     # Prepare headers for the API request
#     headers = {
#         "Content-Type": "application/json",
#         "Authorization": f"Bearer {openai.api_key}"
#     }

#     # Prepare the payload with image encoded in base64
#     payload = {
#         "model": "gpt-4o-mini",  # Replace with the model you're using (this is a placeholder)
#         "messages": [
#             {
#                 "role": "user",
#                 "content": [
#                     {
#                         "type": "text",
#                         "text": "If the image is OCR text, for eg, it's a picture of notes or something. Then only return the text. Otherwise, return a description of the image."
#                     },
                   
#                 ],
#                 "data": {
#                     "image": base64_image
#                 }
#             }
#         ],
#         "max_tokens": 1000
#     }

#     # Send a POST request to OpenAI API
#     response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)

#     # Check the response status and handle any errors
#     if response.status_code == 200:
#         result = response.json()
#         # Extract and return the description
#         return result.get("choices", [{}])[0].get("message", {}).get("content", "No description found")
#     else:
#         # If the request fails, print the error message
#         print(f"Error: {response.status_code} - {response.text}")
#         return "Error fetching description"
def encode_image_from_gridfs(file_id) -> str:
    """
    Retrieve a file from GridFS and encode it into base64.
    :param file_id: The ObjectId of the file in GridFS.
    :return: Base64-encoded string of the file's content.
    """
    # Retrieve file from GridFS
    
    file_id = ObjectId(file_id)
    
    
    grid_out = fs.get(file_id)
    
    # Read file content and encode in base64
    ##check mimetype if jpeg or jpg convert to png

    file_content = grid_out.read()
    base64_encoded = base64.b64encode(file_content).decode('utf-8')
    return base64_encoded

def ask_image_openai(file,question):
    file_content = file.read()
    base64_encoded = base64.b64encode(file_content).decode('utf-8')
    prompt = f"""Answer the following question about the image:{question}"""
    # Generate a response from OpenAI
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
            "role": "user",
            "content": [
                {
                "type": "text",
                "text": prompt,
                },
                {
                "type": "image_url",
                "image_url": {
                    "url":  f"data:image/jpeg;base64,{base64_encoded}"
                },
                },
            ],
            }
        ],
        
        
        
        
        )
    if response.choices[0].message.content == "No description found":
        return "No description found"
    print(response.choices[0].message.content)
    return ( response.choices[0].message.content)
def ask_image(file_name,path,question):
    """
    Ask a question about an image and get a response from OpenAI.
    """
    # Get the file ID from the metadata collection
    file_data = docs_collection.find_one({"name": file_name, "path": path},{"_id": 0,"file_id": 1})
    if not file_data:
        return {"message": "File not found."}
    file_id = file_data.get("file_id")
    if not file_id:
        return {"message": "File ID not found."}
    # Encode the image from GridFS
    base64_image = encode_image_from_gridfs(file_id)
    # Prepare the prompt for OpenAI
    prompt = f"""Answer the following question about the image:{question}"""
    # Generate a response from OpenAI
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
            "role": "user",
            "content": [
                {
                "type": "text",
                "text": prompt,
                },
                {
                "type": "image_url",
                "image_url": {
                    "url":  f"data:image/jpeg;base64,{base64_image}"
                },
                },
            ],
            }
        ],
        
        
        
        
        )
    if response.choices[0].message.content == "No description found":
        return "No description found"
    print(response.choices[0].message.content)
    return ( response.choices[0].message.content)


def ask_file(file_name, path, question):
        """
        Ask a question about a file (PDF, DOCX, image, etc.) and get a response from OpenAI.
        """
        
        # Get the file ID from the metadata collection
        file_data = docs_collection.find_one({"name": file_name, "path": path}, {"_id": 0, "file_id": 1, "mimetype": 1})
        if not file_data:
            return {"message": "File not found1."}
        file_id = file_data.get("file_id")
        mimetype = file_data.get("mimetype")
        if not file_id:
            return {"message": "File ID not found."}
        print(mimetype)
        if not mimetype:
            #guess mimetype
            mimetype, _ = mimetypes.guess_type(file_name)
        file = fs.get(ObjectId(file_id))
        # Extract text or description based on file type
        if mimetype in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            file_content = file.read()  # Read the file content from GridFS
            print(file_content)
            file.seek(0)  # Reset the pointer after reading
            pdf_file = BytesIO(file_content)
            print(pdf_file)
            print("PDF file embeddings")
            reader = PdfReader(pdf_file)
            print('..')
            extracted_text = ""
            for page_num, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text()
                if page_text.strip():  # If text is extractable
                    extracted_text += page_text
                else:
                    print(f"No text found on page {page_num}. Attempting OCR.")
                    
                    # Use fitz to load the page as an image
                    pdf_document = fitz.open(stream=file_content, filetype="pdf")
                    pdf_page = pdf_document[page_num - 1]  # PyMuPDF uses 0-based indexing
                    
                    # Render the page as an image
                    pix = pdf_page.get_pixmap()
                    img = Image.open(BytesIO(pix.tobytes()))
                    
                    # Use OCR to extract text
                    ocr_text = ask_image_openai(img,f"The user asked a question {question} answer it from given context, else answer not relevant")
                    extracted_text += ocr_text
            prompt = f"""Reframe an answer for the following question based on the answers extracted from the [pages of the file: {question}\n\nExtracted Text:\n{extracted_text}"""
            response = generate_openai(prompt)
        elif mimetype in ["image/png", "image/jpeg", "image/jpg"]:
            response=ask_image(file_name, path, question)
        elif mimetype in ["application/json"]:
            extracted_text = extract_text_from_file(file, file_id, mimetype)
            prompt = f"""Answer the following question based on the text extracted from the file: {question}\n\nExtracted Text:\n{extracted_text}"""
            response = generate_openai(prompt)
        elif mimetype in ["text/plain"]:
            extracted_text = extract_text_from_file(file, file_id, mimetype)
            prompt = f"""Answer the following question based on the text extracted from the file: {question}\n\nExtracted Text:\n{extracted_text}"""
            response = generate_openai(prompt)
        #docx
        elif mimetype in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            extracted_text = extract_text_from_file(file, file_id, mimetype)
            prompt = f"""Answer the following question based on the text extracted from the file: {question}\n\nExtracted Text:\n{extracted_text}"""
            response = generate_openai(prompt)
            
        else:
            
            return {"message": "Unsupported file type.", "file_type": mimetype, "file_id": file_id, "file_name": file_name, "path": path}

        # response = generate_openai(prompt)
            
        return response
    

def get_description_from_image(file: str) -> str:
    """
    Uploads an image to OpenAI and generates a detailed description of the image.
    """
    # Set your OpenAI API key
    

    # Upload the image to OpenAI's file endpoint
    
   
    
    
    # base64_image = encode_image_from_gridfs(file_id)
    #save image to local storage
    base64_image = encode_image_from_gridfs(file)
    print("Encoded image")

            # Extract the file ID from the response 
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
            "role": "user",
            "content": [
                {
                "type": "text",
                "text": "Give a detailed description of this image.  If the image is an image of a document or any such thing, return all the texts in the image. The description should be written in this way: 'This image shows a ... Do not return any privacy-sensitive information just enough information for indexing the document for search retrieval for the user. Do not identify any individuals but you can describe the scene in the image. If you can't describe the image, return 'No description found'.",
                },
                {
                "type": "image_url",
                "image_url": {
                    "url":  f"data:image/jpeg;base64,{base64_image}"
                },
                },
            ],
            }
        ],
        
        
        
        
        )
    print("Atleast ran with it")
    if response.choices[0].message.content == "No description found":
        return "No description found"
    print(response.choices[0].message.content)
    return ( response.choices[0].message.content)

def get_description_from_image_v2(image_content: bytes) -> str:
    """
    Generates a detailed description of the image using OpenAI, given the raw image content.
    
    Parameters:
    - image_content (bytes): The raw content of the image file.
    
    Returns:
    - str: The detailed description of the image, or a message indicating no description was found.
    """
    try:
        # Encode the image content to Base64
        base64_image = base64.b64encode(image_content).decode("utf-8")

        # Construct the OpenAI API call with the image content
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Give a detailed description of this image. If the image is a document or similar, "
                                "return all the texts in the image. The description should be written as: "
                                "'This image shows a ...'. Do not return privacy-sensitive information; just enough "
                                "information for indexing the document for search retrieval for the user. "
                                "Do not identify individuals but describe the scene. If you can't describe the image, "
                                "return 'No description found'."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
        )

        # Extract the description from the API response
        description = response.choices[0].message.content.strip()
        return description if description != "No description found" else "No description found"
    
    except Exception as e:
        return f"An error occurred: {str(e)}"


def extract_text_from_file(file,file_id, mimetype=None):
    """
    Extract text from different file types (PDF, DOCX, etc.)
    """
    if file_id is not None:
        print(file_id,"asdasdd")
        file = fs.get(ObjectId(file_id))
        
        
        
    extracted_text = ""
    if mimetype is None: 
        
        mimetype, _ = mimetypes.guess_type(file.filename)
    if mimetype == "application/pdf":
        file.seek(0)  # Reset the pointer before reading
        file_content = file.read()  # Read the file content from GridFS
        print(file_content)
        file.seek(0)  # Reset the pointer after reading
        pdf_file = BytesIO(file_content)
        print(pdf_file)
        print("PDF file embeddings")
        reader = PdfReader(pdf_file)
        print('..')
        for page_num, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text()
            if page_text.strip():  # If text is extractable
                extracted_text += page_text
            else:
                print(f"No text found on page {page_num}. Attempting OCR.")
                
                # Use fitz to load the page as an image
                pdf_document = fitz.open(stream=file_content, filetype="pdf")
                pdf_page = pdf_document[page_num - 1]  # PyMuPDF uses 0-based indexing
                
                # Render the page as an image
                pix = pdf_page.get_pixmap()
                img = Image.open(BytesIO(pix.tobytes()))
                
                # Use OCR to extract text
                ocr_text = get_description_from_image_v2(img)
                extracted_text += ocr_text
        
        print("Text extraction complete.")
        return extracted_text
        
    elif mimetype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        extracted_text = docx2txt.process(file)
    #elif png or jpeg or jpg
    elif mimetype == "image/png" or mimetype == "image/jpeg" or mimetype == "image/jpg":
        #convert other types of images to pngs
        
            
        extracted_text = get_description_from_image(file_id)
    #elif txt json or directly extractable text
    elif mimetype == "application/json" or mimetype == "text/plain":
        file.seek(0)
        extracted_text = file.read().decode("utf-8")
        print(extracted_text)
    
        
        
        
        
    return extracted_text




def extract_embeddings_from_file(extracted_text):
    """
    Generate text embeddings using OpenAI's embeddings model.
    """
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-large",
    )
    # embeddings.embed_query(extracted_text)
    return embeddings.embed_query(extracted_text)

def extract_keywords_from_file(extracted_text):
    """
    Extract key topics/keywords using AI.
    """
    doc = nlp(extracted_text)
    keywords = [ent.text for ent in doc.ents if ent.text.lower() not in STOP_WORDS]
    return list(set(keywords))  # Remove duplicates



def generate_tags(extracted_text):
    """
    Generate tags for the document using AI.
    """
    prompt = f"""Generate tags,such as 'Work','Study','Games','Music' for the following text as a json with key 'tags':
    
    {extracted_text}"""
    
    tags = generate_openai(prompt,max_tokens=300,temperature=0.3,model='gpt-4o-mini',json_parse=True)
    
    
    print(tags)
    
    
    return tags['tags']

if __name__ == "__main__":
    # Test the function ask_file
    file_name = "sample.pdf"
    path = "sample.pdf"
    question = "How m"
    response = ask_file("WhatsApp Image 2024-11-16 at 09.28.37_b7c807c5.jpg", "~/Sandbox", question)
    print(response)