"use client"
import { ModeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Camera,PersonStanding, Settings, Video,} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react'
import { Rings } from 'react-loader-spinner';
import Webcam from 'react-webcam';
import { toast } from "sonner"
import * as cocossd from '@tensorflow-models/coco-ssd'
import "@tensorflow/tfjs-backend-cpu"
import "@tensorflow/tfjs-backend-webgl"
import { DetectedObject, ObjectDetection } from '@tensorflow-models/coco-ssd';
import { drawOnCanvas } from '@/utils/draw';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

type Props = {}

interface HourlyDetection {
  hour: string;
  detections_count: number;
}

let interval: any = null;
let stopTimeout: any = null;
const HomePage = (props: Props) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [autoRecordEnabled, setAutoRecordEnabled] = useState<boolean>(false)
  const [model, setModel] = useState<ObjectDetection>();
  const [loading, setLoading] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState<Date | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [hourlyDetections, setHourlyDetections] = useState<HourlyDetection[]>([]);
  const [detections, setDetections] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8080/hourly-detections');
        const data = await response.json();
        setHourlyDetections(data.hourly_detections);
        setDetections(data.total_detections);
        console.log('Total Detections:', data.total_detections);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    fetchData();
  }, []);
  
  
  // initialize the media recorder
  useEffect(() => {
    if (webcamRef && webcamRef.current) {
      const stream = (webcamRef.current.video as any).captureStream();
      if (stream) {
        mediaRecorderRef.current = new MediaRecorder(stream);

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            const recordedBlob = new Blob([e.data], { type: 'video' });
            const videoURL = URL.createObjectURL(recordedBlob);

            const a = document.createElement('a');
            a.href = videoURL;
            a.download = `detec${formatDate(new Date())}.webm`;
            a.click();
          }
        };
        mediaRecorderRef.current.onstart = (e) => {
          setIsRecording(true);
        }
        mediaRecorderRef.current.onstop = (e) => {
          setIsRecording(false);
        }
      }
    }
  }, [webcamRef])


  

  useEffect(() => {
    setLoading(true);
    initModel();
  }, [])

  // loads model 
  // set it in a state varaible
  async function initModel() {
    const loadedModel: ObjectDetection = await cocossd.load({
      base: 'mobilenet_v2'
    });
    setModel(loadedModel);
  }

  useEffect(() => {
    if (model) {
      setLoading(false);
    }
  }, [model])


  async function runPrediction() {
    if (
       model &&
       webcamRef.current &&
       webcamRef.current.video &&
       webcamRef.current.video.readyState === 4
    ) {
       const predictions: DetectedObject[] = await model.detect(webcamRef.current.video);
   
       resizeCanvas(canvasRef, webcamRef);
       drawOnCanvas(predictions, canvasRef.current?.getContext('2d'));
   
       let isPersonDetected: boolean = false;
       let screenshot: string | null = null;
    let faceImageData: string | null = null;
    predictions.forEach(async (prediction) => {
      if (prediction.class === 'person') {
        isPersonDetected = true;
        screenshot = webcamRef.current.getScreenshot();
      }
    });
   
       if (isPersonDetected) {
         // Prepare the detection data
         setLastDetectionTime(new Date());
         const blob = base64toBlob(screenshot);
         // Send the detection data to the server
         
       if (isPersonDetected && autoRecordEnabled && mediaRecorderRef.current?.state !== 'recording') {
         // Start recording if a person is detected, auto-record is enabled, and not already recording
         const detectionData = {
          timestamp: new Date().toISOString(),
          userIdentifier: 'user123',
          screenshot: blob,
        };
  
        // Send the detection data to the server
        
        fetch('http://localhost:8080/detect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(detectionData),
        })
        .then(response => response.json())
        .then(data => console.log('Success:', data))
        .catch((error) => console.error('Error:', error));
         startRecording(true);
       } else if (!isPersonDetected && mediaRecorderRef.current?.state === 'recording') {
         // Stop recording if no person is detected and recording is in progress
         mediaRecorderRef.current.requestData();
         mediaRecorderRef.current.stop();
         toast('Recording stopped: No detections');
       }
       else if (lastDetectionTime) {
      // If no person is detected and there was a last detection time, stop recording after 5 seconds
      const fiveSecondsLater = new Date(lastDetectionTime.getTime() + 3000); // 5000 milliseconds = 5 seconds
      if (new Date() >= fiveSecondsLater) {
        // Stop recording if 5 seconds have passed since the last detection
        mediaRecorderRef.current?.requestData();
        mediaRecorderRef.current?.stop();
        toast('Recording stopped: No detections for 5 seconds');
      }
    }
    }
   } 
}
let chartInstance: Chart | undefined;



useEffect(() => {
  // Initialize the chart instance
  const ctx = document.getElementById('hourlyDetectionsChart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hourlyDetections.map(item => item.hour),
      datasets: [{
        label: 'Hourly Detections',
        data: hourlyDetections.map(item => item.detections_count),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // Cleanup function to destroy the chart instance
  return () => {
    if (chartInstance) {
      chartInstance.destroy();
    }
  };
}, [hourlyDetections]); // Re-run the effect when hourlyDetections changes


  useEffect(() => {
    interval = setInterval(() => {
      runPrediction();
    }, 100)

    return () => clearInterval(interval);
  }, [webcamRef.current, model, autoRecordEnabled, runPrediction])

  return (

    <div className='flex h-screen w-full'>
      {/* Left division - webcam and Canvas  */}
      <div className='relative'>
        <div className='relative h-screen'>
          <Webcam ref={webcamRef}
            className='h-full w-full object-contain p-2'
          />
          <canvas ref={canvasRef}
            className='absolute top-0 left-0 h-full w-full object-contain'
          ></canvas>
        </div>
      </div>  

      {/* Righ division - container for buttion panel and wiki secion  */}   
      <div className='flex flex-row flex-1 w-full'>
        <div className='border-primary/5 border-2 max-w-xs flex flex-col justify-between shadow-md rounded-md p-4'>
        {/* top secion  */}
        <div className='flex flex-col gap-2'>
            <ModeToggle />
            <Separator className='my-2' />
          </div>

          {/* Middle section  */}
          <div className='flex flex-col gap-2'>
            <Separator className='my-2' />
            <Button
              variant={'outline'} size={'icon'}
              onClick={userPromptScreenshot}
            >
              <Camera />
            </Button>
            <Button
              variant={isRecording ? 'destructive' : 'outline'} size={'icon'}
              onClick={userPromptRecord}
            >
              <Video />
            </Button>
            <Separator className='my-2' />
            <Button
              variant={autoRecordEnabled ? 'destructive' : 'outline'}
              size={'icon'}
              onClick={toggleAutoRecord}
            >
              {autoRecordEnabled ? <Rings color='white' height={45} /> : <PersonStanding />}

            </Button>
          </div>

          {/* Bottom Secion  */}
          <div className='flex flex-col gap-2'>
            <Separator className='my-2' />
            <Settings />
            
            <Separator className='my-2' />
            <Link href="/vfs">
            <Button
              
              size={'icon'}
            >
              
            </Button>
            </Link>
          </div>
      </div>

    <div className='overflow-y-scroll'>
    <div className="grid gap-4 md:col-span-5">
      <div className="grid gap-2">
        <Card className='w-80'>
          <CardHeader>
            <h2 className="text-lg font-semibold">Number of Detections</h2>
            <p className="text-sm font-medium leading-none text-gray-500 dark:text-gray-400">Past 24 hours</p>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-8">
          <span className="text-5xl font-semibold tracking-tighter">{detections}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <h2 className="text-lg font-semibold">Hourly Detections</h2>
            <p className="text-sm font-medium leading-none text-gray-500 dark:text-gray-400">Past 7 days</p>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-6">
          <canvas id="hourlyDetectionsChart" width="400" height="400"></canvas>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Detected People</h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            <div className="flex items-center p-4 space-x-4">
              
              <div className="flex-1">
                <div className="font-semibold">Placeholder</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Last detected: 2023-09-18 14:32:19</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Location: Entrance A</div>
              </div>
              <Button size="sm">View</Button>
            </div>
            <div className="flex items-center p-4 space-x-4">
              
              <div className="flex-1">
                <div className="font-semibold">Placeholder</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Last detected: 2023-09-18 14:28:45</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Location: Placeholder</div>
              </div>
              <Button size="sm">View</Button>
            </div>
            <div className="flex items-center p-4 space-x-4">
              
              <div className="flex-1">
                <div className="font-semibold">Placeholder</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Last detected: 2023-09-18 14:25:01</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Location: Placeholder</div>
              </div>
              <Button size="sm">View</Button>
            </div>
            <div className="flex items-center p-4 space-x-4">
              
              <div className="flex-1">
                <div className="font-semibold">Avery Clark</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Last detected: 2023-09-18 14:21:37</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Location: Office</div>
              </div>
              <Button size="sm">View</Button>
            </div>
            <div className="flex items-center p-4 space-x-4">
              
              <div className="flex-1">
                <div className="font-semibold">Placeholder</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Last detected: 2023-09-18 14:17:42</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Location: Placeholder</div>
              </div>
              <Button size="sm">View</Button>
            </div>
            <div className="flex items-center p-4 space-x-4">
              
              <div className="flex-1">
                <div className="font-semibold">Placeholder</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Last detected: 2023-09-18 14:12:59</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Location: Placeholder</div>
              </div>
              <Button size="sm">View</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

       </div>
    </div>

    {loading && <div className='z-50 absolute w-full h-full flex items-center justify-center bg-primary-foreground'>
        Getting things ready . . . <Rings height={50} color='red' />
      </div>}
  </div>
  )


  function userPromptScreenshot() {

    // take picture
    if(!webcamRef.current){
      toast('Camera not found. Please refresh');
    }else{
      const imgSrc = webcamRef.current.getScreenshot();
      console.log(imgSrc);
      const blob = base64toBlob(imgSrc);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formatDate(new Date())}.png`
      a.click();
    }
    // save it to downloads

  }

  function userPromptRecord() {

    if (!webcamRef.current) {
      toast('Camera is not found. Please refresh.')
    }

    if (mediaRecorderRef.current?.state == 'recording') {
      // check if recording
      // then stop recording 
      // and save to downloads
      mediaRecorderRef.current.requestData();
      clearTimeout(stopTimeout);
      mediaRecorderRef.current.stop();
      toast('Recording saved to downloads');

    } else {
      // if not recording
      // start recording 
      startRecording(false);
    }
  }

  function startRecording(doBeep: boolean) {
    if (webcamRef.current && mediaRecorderRef.current?.state !== 'recording') {
      mediaRecorderRef.current?.start();
      

      stopTimeout = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.requestData();
          mediaRecorderRef.current.stop();
        }

      }, 30000);
    }
  }

  function toggleAutoRecord() {
    if (autoRecordEnabled) {
      setAutoRecordEnabled(false);
      toast('Autorecord disabled');
      // Check if the app is currently recording and stop it
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current?.requestData();
        mediaRecorderRef.current?.stop();
        toast('Recording stopped: Autorecord disabled');
      }
    } else {
      setAutoRecordEnabled(true);
      toast('Autorecord enabled');
    }
  }
  
 
}

export default HomePage

function resizeCanvas(canvasRef: React.RefObject<HTMLCanvasElement>, webcamRef: React.RefObject<Webcam>) {
  const canvas = canvasRef.current;
  const video = webcamRef.current?.video;

  if ((canvas && video)) {
    const { videoWidth, videoHeight } = video;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
  }
}


function formatDate(d: Date) {
  const formattedDate =
    [
      (d.getMonth() + 1).toString().padStart(2, "0"),
      d.getDate().toString().padStart(2, "0"),
      d.getFullYear(),
    ]
      .join("-") +
    " " +
    [
      d.getHours().toString().padStart(2, "0"),
      d.getMinutes().toString().padStart(2, "0"),
      d.getSeconds().toString().padStart(2, "0"),
    ].join("-");
  return formattedDate;
}

function base64toBlob(base64Data: any) {
  const byteCharacters = atob(base64Data.split(",")[1]);
  const arrayBuffer = new ArrayBuffer(byteCharacters.length);
  const byteArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: "image/png" }); 
}