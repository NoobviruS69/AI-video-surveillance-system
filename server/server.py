import base64
import cloudinary.api
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
from notifications import send_notification  
import time , os
import cloudinary.uploader


app = Flask(__name__)
CORS(app)

cloudinary.config(
    cloud_name='dumjo5tla',
    api_key='454596588514789',
    api_secret='Lqb8yLidvPU-JlZN0ZwqnC7IbyI'
)

# Initialize SQLite database
conn = sqlite3.connect('detections.db', check_same_thread=False)
c = conn.cursor()

# Create table if it doesn't exist
c.execute('''CREATE TABLE IF NOT EXISTS detections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                user_identifier TEXT,
                screenshot BLOB
            )''')
conn.commit()

total_detections = 0
detections = []  # List to store detection data

downloads_folder = '/Users/abhinavkrishna/Downloads/'



def check_and_upload_videos():
      for filename in os.listdir(downloads_folder):
          if filename.endswith('.webm'):
              file_path = os.path.join(downloads_folder, filename)
              with open(file_path, 'rb') as f:
                  upload_result = cloudinary.uploader.upload(f, resource_type="video")
                  print(f"Uploaded {filename} to Cloudinary: {upload_result['url']}")
                  # Optional: Move or delete the file after uploading
                  os.rename(file_path, os.path.join(downloads_folder, 'uploaded_' + filename))
      
    



@app.route('/get_video_urls', methods=['GET'])
def get_video_urls():
    try:
        # Fetch all video resources from Cloudinary
        result = cloudinary.api.resources(resource_type="video")
        
        # Filter videos to only include those with a.webm file extension
        webm_videos = [resource for resource in result['resources'] if resource['format'] == 'webm']
        
        # Extract and return the URLs and upload dates of the filtered videos
        video_info = [{
            'url': resource['secure_url'],
            'date': resource['created_at']
        } for resource in webm_videos]
        
        print("video_info", video_info)
        return jsonify(video_info)
    except Exception as e:
        print("An error occurred:", e)
        return jsonify({"error": str(e)}), 500
    
     

@app.route("/detect", methods=['POST'])
def detect():
    global total_detections
    detection_data = request.json
    timestamp = detection_data.get('timestamp')
    user_identifier = detection_data.get('user_identifier')

    c.execute("INSERT INTO detections (timestamp, user_identifier) VALUES (?,?)",
              (timestamp, user_identifier))
    conn.commit()
    total_detections += 1
    return jsonify({"status": "success", "message": "Detection data received"}), 200

@app.route("/hourly-detections", methods=['GET'])
def get_hourly_detections():
    c.execute("SELECT strftime('%H', timestamp) as hour, COUNT(*) as detections_count FROM detections GROUP BY hour")
    rows = c.fetchall()
    
    hourly_detections = [{"hour": row[0], "detections_count": row[1]} for row in rows]
    
    # Calculate total detections
    total_detections = sum([row[1] for row in rows])
    
    return jsonify({"hourly_detections": hourly_detections, "total_detections": total_detections})


@app.route("/detected-persons", methods=['GET'])
def get_detected_persons():
    c.execute("SELECT user_identifier, screenshot FROM detections")
    rows = c.fetchall()
    
    detected_persons = [{"user_identifier": row[0], "screenshot": row[1]} for row in rows]
    
    return jsonify(detected_persons)


if __name__ == '__main__':
    try:
        check_and_upload_videos()
        app.run(debug=True, port=8080)
    finally:
        conn.close()

