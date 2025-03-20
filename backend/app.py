import uuid
import requests  
from flask import Flask, request, jsonify
from flask_cors import CORS
import io

app = Flask(__name__)
CORS(app)

API_KEY = "jainsnehasj6@gmail.com_HCrQ4Rs3g81OCLm0eedi9MMg4JhWDHDJJUEUVIGU8GpzaS5yILjUDLKDM4BrDBFV"
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
    unique_id = str(uuid.uuid4())
    file_name = f"{unique_id}_{file.filename}"
    print(4)
    try:
        file_stream = io.BytesIO(file.read())

        uploaded_file_url = upload_file_to_pdf_co(file_stream, file_name)
        if not uploaded_file_url:
            return jsonify({"error": "Failed to upload file to PDF.co"}), 500

        image_urls = convert_pdf_to_images(uploaded_file_url)
        if not image_urls:
            return jsonify({"error": "Failed to convert PDF to images"}), 500

        folder_url = uploaded_file_url.rsplit('/', 1)[0] 
        pdf_url = uploaded_file_url  

        return jsonify({
            "slides": image_urls,
            "folder": folder_url,
            "pdf": pdf_url
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True,host="0.0.0.0", port=5000)
