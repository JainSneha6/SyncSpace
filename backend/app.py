import os
import uuid
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import fitz  
from spire.presentation import *
from spire.presentation.common import *

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'slides'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

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
    filepath = os.path.join(UPLOAD_FOLDER, f"{unique_id}_{file.filename}")
    file.save(filepath)

    # Create an output directory for this particular PPTX conversion
    output_dir = os.path.join(OUTPUT_FOLDER, unique_id)
    os.makedirs(output_dir, exist_ok=True)

    # Convert PPTX to PDF using Spire.Presentation
    pdf_filepath = os.path.join(output_dir, f"{unique_id}.pdf")
    try:
        print(f"Converting {filepath} to PDF...")
        presentation = Presentation()
        presentation.LoadFromFile(filepath)
        presentation.SaveToFile(pdf_filepath, FileFormat.PDF)
        presentation.Dispose()
        print(f"Conversion to PDF successful. PDF saved at {pdf_filepath}.")

        # Convert PDF to images using PyMuPDF (fitz)
        print("Converting PDF to images...")
        pdf_document = fitz.open(pdf_filepath)
        slides = []

        for page_number in range(pdf_document.page_count):
            try:
                page = pdf_document.load_page(page_number)
                pix = page.get_pixmap(dpi=300)  # Use 300 DPI for better quality
                output_image_path = os.path.join(output_dir, f"slide_{page_number + 1}.jpg")
                pix.save(output_image_path)
                slides.append(output_image_path)

                # Debug: Check if the image is saved
                if os.path.exists(output_image_path):
                    print(f"Image for slide {page_number + 1} saved at {output_image_path}")
                else:
                    print(f"Failed to save image for slide {page_number + 1}")

            except Exception as e:
                print(f"Error during image generation for page {page_number + 1}: {e}")
                continue

        # Check if images were created
        if not slides:
            raise Exception("No images were generated from the PDF.")

        slide_filenames = [os.path.basename(slide) for slide in slides]
        print(f"Slides converted to images: {slide_filenames}")
        base_url = request.host_url.rstrip('/')
        slide_urls = [f"{base_url}/slides/{unique_id}/{os.path.basename(slide)}" for slide in slides]
        pdf_url = f"{base_url}/pdf/{unique_id}.pdf"

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

    return jsonify({"slides": slide_urls, "folder": unique_id, "pdf": pdf_url}), 200

@app.route('/slides/<folder>/<filename>', methods=['GET'])
def serve_slide(folder, filename):
    folder_path = os.path.join(OUTPUT_FOLDER, folder)
    file_path = os.path.join(folder_path, filename)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    return send_file(file_path, mimetype='image/jpeg')

@app.route('/pdf/<filename>', methods=['GET'])
def serve_pdf(filename):
    # Serve the PDF file to the frontend
    file_path = os.path.join(OUTPUT_FOLDER, filename)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    return send_file(file_path, mimetype='application/pdf')


if __name__ == '__main__':
    app.run(debug=True)
