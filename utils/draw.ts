import { DetectedObject } from "@tensorflow-models/coco-ssd";

// mirrored, predictions, canvasRef.current?.getContext('2d')
export function drawOnCanvas(
  predictions: DetectedObject[],
  ctx: CanvasRenderingContext2D | null | undefined
) {
  predictions.forEach((detectedObject: DetectedObject) => {
    const { class: name, bbox, score } = detectedObject;
    const [x, y, width, height] = bbox;

    if (ctx) {
      ctx.beginPath();

      // styling
      if (name === "person"){
      ctx.fillStyle = "#FF0F0F";
      ctx.globalAlpha = 0.4;
      

      // draw stroke or fill
      ctx.roundRect(x , y , width , height , 8);
      ctx.fill();

      ctx.font = "12px Courier New";
      ctx.globalAlpha = 1;

      ctx.fillText(name, x + 10 , y + 20);
      }

    }
  });
}