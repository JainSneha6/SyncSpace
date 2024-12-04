import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
from spire.presentation import *
from spire.presentation.common import *
import boto3
from dotenv import load_dotenv
import os
from botocore.exceptions import NoCredentialsError

app = Flask(__name__)
CORS(app)

load_dotenv()

AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY')
AWS_SECRET_KEY = os.getenv('AWS_SECRET_KEY')
AWS_REGION = os.getenv('AWS_REGION')
BUCKET_NAME = os.getenv('BUCKET_NAME')

s3_client = boto3.client('s3', region_name=AWS_REGION, aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_KEY)

@app.route('/upload', methods=['POST'])
def upload_ppt():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if not file.filename.endswith('.pptx'):
        return jsonify({"error": "Invalid file type. Only .pptx allowed"}), 400

    # Generate a unique ID for this upload
    unique_id = str(uuid.uuid4())
    filename = f"{unique_id}_{file.filename}"
    file_path = f"/tmp/{filename}"
    file.save(file_path)

    # Convert PPTX to PDF using Spire.Presentation
    pdf_filename = f"{unique_id}.pdf"
    pdf_filepath = f"/tmp/{pdf_filename}"
    try:
        print(f"Converting {file_path} to PDF...")
        presentation = Presentation()
        presentation.LoadFromFile(file_path)
        presentation.SaveToFile(pdf_filepath, FileFormat.PDF)
        presentation.Dispose()
        print(f"Conversion to PDF successful. PDF saved at {pdf_filepath}.")

        # Upload PDF to S3
        s3_client.upload_file(pdf_filepath, BUCKET_NAME, pdf_filename)
        pdf_url = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{pdf_filename}"

        # Convert PDF to images using PyMuPDF (fitz)
        print("Converting PDF to images...")
        pdf_document = fitz.open(pdf_filepath)
        slides = []

        for page_number in range(pdf_document.page_count):
            try:
                page = pdf_document.load_page(page_number)
                pix = page.get_pixmap(dpi=300)  # Use 300 DPI for better quality
                image_filename = f"slide_{unique_id}_{page_number + 1}.jpg"
                image_filepath = f"/tmp/{image_filename}"
                pix.save(image_filepath)
                slides.append(image_filename)

                # Upload image to S3
                s3_client.upload_file(image_filepath, BUCKET_NAME, image_filename)
                print(f"Image for slide {page_number + 1} saved at {image_filepath}")

            except Exception as e:
                print(f"Error during image generation for page {page_number + 1}: {e}")
                continue

        # Check if images were created
        if not slides:
            raise Exception("No images were generated from the PDF.")

        slide_urls = [f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{slide}" for slide in slides]
        print(f"Slides converted to images: {slide_urls}")

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

    return jsonify({"slides": slide_urls, "folder": unique_id, "pdf": pdf_url}), 200

@app.route('/slides/<folder>/<filename>', methods=['GET'])
def serve_slide(folder, filename):
    file_key = f"{folder}/{filename}"
    try:
        s3_client.head_object(Bucket=BUCKET_NAME, Key=file_key)
        slide_url = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{file_key}"
        return jsonify({"url": slide_url}), 200
    except NoCredentialsError:
        return jsonify({"error": "Credentials not available"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 404

@app.route('/pdf/<filename>', methods=['GET'])
def serve_pdf(filename):
    file_key = filename
    try:
        s3_client.head_object(Bucket=BUCKET_NAME, Key=file_key)
        pdf_url = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{file_key}"
        return jsonify({"url": pdf_url}), 200
    except NoCredentialsError:
        return jsonify({"error": "Credentials not available"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)