import { useState, useRef, useCallback } from "react";
import { Button } from "~/components/ui/Button";
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useSyncStore } from "~/stores/syncStore";

export type ImageType = "avatar" | "cover";

interface ImageUploaderProps {
  imageType: ImageType;
  currentImageUrl?: string;
  onImageSaved: (imageUrl: string) => void;
  aspectRatio?: number;
}

export function ImageUploader({
  imageType,
  currentImageUrl,
  onImageSaved,
  aspectRatio = 1
}: ImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const { isOnline } = useSyncStore();

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      
      // Create preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Reset crop
      setCrop({
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0
      });
      
      // Clean up
      return () => URL.revokeObjectURL(objectUrl);
    }
  };
  
  // Handle image load
  const onImageLoad = useCallback((img: HTMLImageElement) => {
    imgRef.current = img;
    
    // Set initial crop based on aspect ratio
    const width = aspectRatio >= 1 ? 100 : aspectRatio * 100;
    const height = aspectRatio <= 1 ? 100 : (1 / aspectRatio) * 100;
    
    setCrop({
      unit: '%',
      width,
      height,
      x: (100 - width) / 2,
      y: (100 - height) / 2
    });
  }, [aspectRatio]);
  
  // Generate cropped image
  const getCroppedImg = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return null;
    
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    const pixelRatio = window.devicePixelRatio;
    
    canvas.width = completedCrop.width * scaleX * pixelRatio;
    canvas.height = completedCrop.height * scaleY * pixelRatio;
    
    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';
    
    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;
    
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );
    
    return new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
        },
        'image/jpeg',
        0.95
      );
    });
  }, [completedCrop]);
  
  // Handle save button click
  const handleSave = async () => {
    if (!selectedFile || !completedCrop) return;
    
    setIsUploading(true);
    
    try {
      const croppedImage = await getCroppedImg();
      if (!croppedImage) {
        throw new Error("Failed to crop image");
      }
      
      // In a real implementation, you would upload the image to your server or cloud storage
      // For this demo, we'll just create a data URL
      const reader = new FileReader();
      reader.readAsDataURL(croppedImage);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        
        // Simulate upload delay
        setTimeout(() => {
          onImageSaved(base64data);
          setIsUploading(false);
          setSelectedFile(null);
          setPreviewUrl(null);
        }, 1000);
      };
    } catch (error) {
      console.error("Error saving image:", error);
      setIsUploading(false);
    }
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          {imageType === "avatar" ? "Profile Picture" : "Cover Photo"}
        </h3>
        
        {!selectedFile && (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id={`${imageType}-upload`}
              disabled={!isOnline}
            />
            <label htmlFor={`${imageType}-upload`}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                as="span"
                disabled={!isOnline}
              >
                {currentImageUrl ? "Change" : "Upload"} {imageType === "avatar" ? "Avatar" : "Cover"}
              </Button>
            </label>
          </div>
        )}
      </div>
      
      {/* Display current image if no file is selected */}
      {!selectedFile && currentImageUrl && (
        <div className={`${imageType === "avatar" ? "w-24 h-24 rounded-full" : "w-full h-32 rounded-md"} overflow-hidden`}>
          <img
            src={currentImageUrl}
            alt={imageType === "avatar" ? "Profile" : "Cover"}
            className={`${imageType === "avatar" ? "w-24 h-24 object-cover" : "w-full h-32 object-cover"}`}
          />
        </div>
      )}
      
      {/* Display image cropper when file is selected */}
      {selectedFile && previewUrl && (
        <div className="space-y-4">
          <div className="max-w-md mx-auto">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              circularCrop={imageType === "avatar"}
            >
              <img
                src={previewUrl}
                alt="Upload preview"
                onLoad={(e) => onImageLoad(e.currentTarget)}
              />
            </ReactCrop>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              isLoading={isUploading}
              disabled={!completedCrop}
            >
              Save {imageType === "avatar" ? "Avatar" : "Cover"}
            </Button>
          </div>
        </div>
      )}
      
      {!isOnline && !selectedFile && (
        <p className="text-sm text-amber-600">
          Image upload is disabled while offline. Please connect to the internet to change your {imageType === "avatar" ? "profile picture" : "cover photo"}.
        </p>
      )}
    </div>
  );
}
