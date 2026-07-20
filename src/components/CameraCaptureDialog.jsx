import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';

const videoConstraints = {
  width: 480,
  height: 600,
  facingMode: 'user',
  aspectRatio: 0.8,
};

export default function CameraCaptureDialog({ open, onClose, onCapture }) {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [uploading, setUploading] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef]);

  const retake = () => setImgSrc(null);

  const handleSave = async () => {
    if (!imgSrc) return;
    setUploading(true);
    try {
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      const file = new File([blob], 'passport_photo.jpg', { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onCapture(file_url);
      handleClose();
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setImgSrc(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Capture Passport Photo
          </DialogTitle>
        </DialogHeader>

        {!imgSrc ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-full overflow-hidden rounded-lg border bg-black">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.92}
                videoConstraints={videoConstraints}
                className="w-full"
                mirrored
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Position your face within the frame. Passport photo aspect (4:5).
            </p>
            <Button onClick={capture} className="w-full bg-[#1e3a5f] hover:bg-[#2c4a6e]">
              <Camera className="w-4 h-4 mr-2" />
              Capture Photo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <img
              src={imgSrc}
              alt="captured"
              className="w-full max-w-[320px] object-cover rounded-lg border"
            />
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={retake}
                disabled={uploading}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={handleSave}
                disabled={uploading}
                className="flex-1 bg-[#1e3a5f] hover:bg-[#2c4a6e]"
              >
                <Check className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Use Photo'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}