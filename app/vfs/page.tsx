"use client"
import { Button } from "@/components/ui/button";
import { CardHeader, CardContent, Card } from "@/components/ui/card";
import { CalendarIcon, ClockIcon, VideoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import ReactPlayer from 'react-player'; // Import ReactPlayer

export default function Vfs() {
  const [videoUrls, setVideoUrls] = useState([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null); // State to hold the currently selected video URL

  useEffect(() => {
    // Fetch video URLs from your backend
    fetch('http://localhost:8080/get_video_urls')
    .then(response => response.json())
    .then(data => setVideoUrls(data));
  }, []);

  const handlePlayClick = (url) => {
    setCurrentVideoUrl(url);
  };


  return (
    <div className="grid md:grid-cols-2 items-start gap-4">
      <div className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Videos</h1>
          <div className="flex items-center space-x-2">
            <Button size="sm">Upload</Button>
            <Button size="sm" variant="outline">
              New Folder
            </Button>
            <Button size="sm" variant="outline">
              Share
            </Button>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-4">
        {videoUrls.map((videoInfo, index) => (
            <div key={index} className="border border-dashed border-gray-200 rounded-lg p-4 flex items-center space-x-4">
              <VideoIcon className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center p-3 border border-gray-200" />
              <div className="grid grid-cols-1 gap-1 flex-1">
                <div className="grid grid-cols-1 gap-1">
                  <h3 className="text-base font-medium leading-none truncate">{videoInfo.date}</h3>
                </div>
              </div>
              <Button size="sm" onClick={() => handlePlayClick(videoInfo.url)}>Play</Button>
            </div>
          ))}
    </div>
  </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <input
              className="w-full appearance-none border-0 focus:outline-none bg-clip-padding"
              placeholder="Search"
              type="text"
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 p-4">
              <div className="flex items-center space-x-4">
                <span className="w-full rounded-md bg-muted" />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Introduction_to_Biology.mp4</h2>
                  <div className="flex items-center space-x-2">
                    <Button >Play</Button>
                    <Button >Download</Button>
                  </div>
                </div>
                <div className="space-y-4">
        {/* Video Player */}
        {currentVideoUrl && (
          <ReactPlayer
            url={currentVideoUrl}
            playing={true}
            controls={true}
            width="100%"
            height="100%"
          />
        )}
      </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">Video Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="w-6 h-6" />
                        <div className="text-sm text-gray-500">Uploaded</div>
                      </div>
                      <div>May 12, 2023</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-6 h-6" />
                        <div className="text-sm text-gray-500">Duration</div>
                      </div>
                      <div>1h 24m 19s</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-gray-100 border border-gray-200 text-sm px-3 py-1">Science</span>
                    <span className="rounded-lg bg-gray-100 border border-gray-200 text-sm px-3 py-1">Biology</span>
                    <span className="rounded-lg bg-gray-100 border border-gray-200 text-sm px-3 py-1">Education</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}







