import os
import requests  # pip install requests

# The authentication key (API Key).
# Get your own by registering at https://app.pdf.co
API_KEY = "anujtadkase2@gmail.com_jNW4ZtncoPAdA74PoEDsyEtNPGNTC4k7FYPBcWHZFaSDhKd8bmJMCWwsaCjtSWXc"

# Base URL for PDF.co Web API requests
BASE_URL = "https://api.pdf.co/v1"

# Local file name (your file should be in the same directory as this script)
SourceFile = "PresentationToPD2F.pdf"  # Ensure "new.pdf" exists in the script directory
# Comma-separated list of page indices (or ranges) to process. Leave empty for all pages. Example: '0,2-5,7-'.
Pages = ""
# PDF document password. Leave empty for unprotected documents.
Password = ""


def main(args=None):
    # Check if the file exists
    if not os.path.isfile(SourceFile):
        print(f"Error: File '{SourceFile}' not found.")
        return

    # Upload the file
    uploadedFileUrl = uploadFile(SourceFile)
    if uploadedFileUrl is not None:
        convertPDFToImage(uploadedFileUrl, "jpg")


def convertPDFToImage(uploadedFileUrl, imageType):
    """Converts PDF To Image using PDF.co Web API"""

    # Prepare request params as JSON
    parameters = {
        "password": Password,
        "pages": Pages,
        "url": uploadedFileUrl,
    }

    # Prepare URL for PDF To Image API request
    url = f"{BASE_URL}/pdf/convert/to/{imageType}"

    # Execute request and get response as JSON
    response = requests.post(url, data=parameters, headers={"x-api-key": API_KEY})
    if response.status_code == 200:
        json = response.json()

        if not json["error"]:
            # Print generated image URLs
            print("Image URLs:")
            for part, resultFileUrl in enumerate(json["urls"], start=1):
                print(f"Page {part}: {resultFileUrl}")
        else:
            # Show service-reported error
            print(f"Error: {json['message']}")
    else:
        print(f"Request error: {response.status_code} {response.reason}")


def uploadFile(fileName):
    """Uploads file to the cloud"""

    # 1. Retrieve presigned URL to upload the file
    url = f"{BASE_URL}/file/upload/get-presigned-url?contenttype=application/octet-stream&name={os.path.basename(fileName)}"

    response = requests.get(url, headers={"x-api-key": API_KEY})
    if response.status_code == 200:
        json = response.json()

        if not json["error"]:
            # URL to use for file upload
            uploadUrl = json["presignedUrl"]
            # URL for future reference
            uploadedFileUrl = json["url"]

            # 2. Upload the file to cloud
            with open(fileName, 'rb') as file:
                uploadResponse = requests.put(uploadUrl, data=file, headers={"content-type": "application/octet-stream"})

            if uploadResponse.status_code == 200:
                print(f"File '{fileName}' successfully uploaded.")
                return uploadedFileUrl
            else:
                print(f"Error uploading file: {uploadResponse.status_code} {uploadResponse.reason}")
        else:
            print(f"Error: {json['message']}")
    else:
        print(f"Request error: {response.status_code} {response.reason}")

    return None


if __name__ == '__main__':
    main()
