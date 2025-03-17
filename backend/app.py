import uuid
import requests  # pip install requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import io

app = Flask(__name__)
CORS(app)

# PDF.co API credentials
API_KEY = "anujtadkase@gmail.com_kqNsXkDD0cOOWx4ix5DeRBasu6ETDxB89V9rLZKOepf2du3ZRiFI58Em0wpivJp4"
BASE_URL = "https://api.pdf.co/v1"
Password = ""
Pages = ""


def upload_file_to_pdf_co(file_stream, file_name):
    """Uploads file to PDF.co directly from memory and returns the uploaded file URL."""
    url = f"{BASE_URL}/file/upload/get-presigned-url?contenttype=application/octet-stream&name={file_name}"
    response = requests.get(url, headers={"x-api-key": API_KEY})
    if response.status_code == 200:
        json_response = response.json()
        if not json_response["error"]:
            upload_url = json_response["presignedUrl"]
            uploaded_file_url = json_response["url"]
            upload_response = requests.put(upload_url, data=file_stream, headers={"content-type": "application/octet-stream"})
            if upload_response.status_code == 200:
                return uploaded_file_url
    return None


def convert_pdf_to_images(uploaded_file_url, image_type="jpg"):
    """Converts PDF to images using PDF.co Web API and returns image URLs."""
    url = f"{BASE_URL}/pdf/convert/to/{image_type}"
    params = {
        "password": Password,
        "pages": Pages,
        "url": uploaded_file_url
    }
    response = requests.post(url, data=params, headers={"x-api-key": API_KEY})
    if response.status_code == 200:
        json_response = response.json()
        if not json_response["error"]:
            return json_response["urls"]
    return None


@app.route('/upload', methods=['POST'])
def upload_ppt():
    print(1)
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    print(2)
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    print(3)
    # Create a unique name for the uploaded file
    unique_id = str(uuid.uuid4())
    file_name = f"{unique_id}_{file.filename}"
    print(4)
    try:
        # Read file content into memory
        file_stream = io.BytesIO(file.read())

        # Upload file to PDF.co
        uploaded_file_url = upload_file_to_pdf_co(file_stream, file_name)
        if not uploaded_file_url:
            return jsonify({"error": "Failed to upload file to PDF.co"}), 500

        # Convert PDF to images
        image_urls = convert_pdf_to_images(uploaded_file_url)
        if not image_urls:
            return jsonify({"error": "Failed to convert PDF to images"}), 500

        # Prepare the folder and PDF URL for response
        folder_url = uploaded_file_url.rsplit('/', 1)[0]  # Extract the folder URL from the uploaded file URL
        pdf_url = uploaded_file_url  # Use the uploaded file URL as the PDF URL

        return jsonify({
            "slides": image_urls,
            "folder": folder_url,
            "pdf": pdf_url
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True,host="0.0.0.0", port=5000)
