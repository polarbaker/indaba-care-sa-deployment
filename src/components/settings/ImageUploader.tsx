import { useState, useRef, useCallback } from "react";
import { Button } from "~/components/ui/Button";
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useSyncStore } from "~/stores/syncStore";
import toast from "react-hot-toast";

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
    if (!imgRef.current || !completedCrop || !selectedFile) return null;
    
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
    
    return new Promise<File>(async (resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas to Blob conversion failed"));
              return;
            }
            
            // Create a new file from the blob
            const fileExtension = selectedFile.name.split('.').pop() || 'jpg';
            const fileName = `${imageType}_${Date.now()}.${fileExtension}`;
            const croppedFile = new File([blob], fileName, {
              type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
              lastModified: Date.now(),
            });
            
            resolve(croppedFile);
          },
          'image/jpeg',
          0.95
        );
      } catch (error) {
        reject(error);
      }
    });
  }, [completedCrop, imageType, selectedFile]);
  
  // Handle save button click
  const handleSave = async () => {
    if (!selectedFile || !completedCrop) return;
    
    setIsUploading(true);
    
    try {
      const croppedFile = await getCroppedImg();
      if (!croppedFile) {
        throw new Error("Failed to crop image");
      }
      
      if (isOnline) {
        // Create a FormData instance
        const formData = new FormData();
        formData.append('file', croppedFile);
        formData.append('type', imageType);
        
        // In a real implementation, you would upload to your server
        // For now, we'll simulate a successful upload after a delay
        // and return a mock URL
        
        // Simulate network request
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock response URL - in a real implementation, this would come from your server
        const uploadedImageUrl = URL.createObjectURL(croppedFile);
        
        // Call the callback with the new image URL
        onImageSaved(uploadedImageUrl);
        
        // Clean up
        setIsUploading(false);
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        // Offline mode - create a data URL to use temporarily
        const reader = new FileReader();
        reader.readAsDataURL(croppedFile);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          
          // Store the file for later upload when online
          // This would typically use the sync queue
          // For now, just use the data URL
          onImageSaved(base64data);
          
          // Show message about offline mode
          toast.info("You're offline. The image will be uploaded when you reconnect.", {
            duration: 4000,
          });
          
          setIsUploading(false);
          setSelectedFile(null);
          setPreviewUrl(null);
        };
      }
    } catch (error) {
      console.error("Error saving image:", error);
      toast.error("Failed to save image. Please try again.");
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
          {isUploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div className="bg-blue-600 h-2.5 rounded-full w-3/4 animate-pulse"></div>
            </div>
          )}
          
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
      
      {!isOnline && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-700">
            You're currently offline. {selectedFile 
              ? "Images will be saved locally and uploaded when you're back online." 
              : "Image uploads are limited while offline."}
          </p>
        </div>
      )}
    </div>
  );
}
