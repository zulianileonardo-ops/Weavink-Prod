// app/dashboard/(dashboard pages)/appearance/elements/ImageCropModal.jsx
"use client";

import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { FaTimes, FaUndo, FaRedo, FaMagic, FaSearchPlus, FaSearchMinus } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import {
    getCroppedImg,
    getAutoCrop,
    createImage,
    getAspectRatio,
    calculateCropForAspectRatio,
} from '../utils/imageCropUtils';
import imageCompression from 'browser-image-compression';

export default function ImageCropModal({ imageFile, onClose, onSave }) {
    const [imageSrc, setImageSrc] = useState('');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [aspectRatio, setAspectRatio] = useState(null); // Will be set to image ratio
    const [imageDimensions, setImageDimensions] = useState(null); // Store image dimensions
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingAutoCrop, setIsLoadingAutoCrop] = useState(false);

    // Load image from file and get dimensions
    useEffect(() => {
        if (imageFile) {
            const reader = new FileReader();
            reader.addEventListener('load', async () => {
                const dataUrl = reader.result?.toString() || '';
                setImageSrc(dataUrl);

                // Load image to get dimensions
                try {
                    const img = await createImage(dataUrl);
                    const dimensions = { width: img.width, height: img.height };
                    setImageDimensions(dimensions);
                    // Set initial aspect ratio to image's natural ratio (free form)
                    setAspectRatio(dimensions.width / dimensions.height);
                } catch (error) {
                    console.error('Failed to load image dimensions:', error);
                    // Fallback to 4:3 if we can't get dimensions
                    setAspectRatio(4 / 3);
                }
            });
            reader.readAsDataURL(imageFile);
        }
    }, [imageFile]);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleAutoCrop = async () => {
        if (!imageFile) return;

        setIsLoadingAutoCrop(true);
        try {
            const image = await createImage(imageFile);

            // Get auto crop suggestion
            const autoCropArea = await getAutoCrop(image, 800, 600);

            // Convert pixel crop to percentage crop for react-easy-crop
            const percentageCrop = {
                x: (autoCropArea.x / image.width) * 100,
                y: (autoCropArea.y / image.height) * 100,
            };

            setCrop(percentageCrop);
            setZoom(1);
            toast.success('Auto crop applied! Adjust if needed.');
        } catch (error) {
            console.error('Auto crop failed:', error);
            toast.error('Auto crop failed. Try manual adjustments.');
        } finally {
            setIsLoadingAutoCrop(false);
        }
    };

    const handleSave = async () => {
        if (!croppedAreaPixels) {
            toast.error('No crop area selected');
            return;
        }

        setIsProcessing(true);
        try {
            // Get cropped image blob
            const croppedBlob = await getCroppedImg(
                imageSrc,
                croppedAreaPixels,
                rotation
            );

            // Compress the cropped image
            const options = {
                maxSizeMB: 5,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                initialQuality: 0.9,
            };

            const compressedFile = await imageCompression(croppedBlob, options);

            // Convert blob to file with original name
            const file = new File(
                [compressedFile],
                imageFile.name || 'cropped-image.jpg',
                { type: 'image/jpeg' }
            );

            onSave(file);
            toast.success('Image processed successfully!');
        } catch (error) {
            console.error('Error processing image:', error);
            toast.error('Failed to process image');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRotate = (degrees) => {
        setRotation((prev) => (prev + degrees) % 360);
    };

    const handleAspectRatioChange = (preset) => {
        if (preset === 'free') {
            // Use image's natural aspect ratio for free form
            if (imageDimensions) {
                setAspectRatio(imageDimensions.width / imageDimensions.height);
            }
        } else {
            const ratio = getAspectRatio(preset);
            setAspectRatio(ratio);
        }
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.1, 3));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.1, 1));
    };

    if (!imageSrc) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Edit Image</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        disabled={isProcessing}
                    >
                        <FaTimes className="text-xl" />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="relative w-full h-96 bg-gray-100">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        style={{
                            containerStyle: {
                                width: '100%',
                                height: '100%',
                            },
                        }}
                    />
                </div>

                {/* Controls */}
                <div className="p-4 space-y-4">
                    {/* Zoom Slider */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Zoom
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleZoomOut}
                                className="p-2 rounded hover:bg-gray-100 transition-colors"
                                disabled={zoom <= 1}
                            >
                                <FaSearchMinus />
                            </button>
                            <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.1"
                                value={zoom}
                                onChange={(e) => setZoom(parseFloat(e.target.value))}
                                className="flex-1"
                            />
                            <button
                                onClick={handleZoomIn}
                                className="p-2 rounded hover:bg-gray-100 transition-colors"
                                disabled={zoom >= 3}
                            >
                                <FaSearchPlus />
                            </button>
                            <span className="text-sm text-gray-600 min-w-12 text-right">
                                {zoom.toFixed(1)}x
                            </span>
                        </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Aspect Ratio
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['free', 'square', '4:3', '16:9', '3:4', '9:16'].map((preset) => {
                                const isActive = preset === 'free'
                                    ? imageDimensions && Math.abs(aspectRatio - (imageDimensions.width / imageDimensions.height)) < 0.01
                                    : getAspectRatio(preset) === aspectRatio;

                                return (
                                    <button
                                        key={preset}
                                        onClick={() => handleAspectRatioChange(preset)}
                                        className={`px-3 py-1 rounded text-sm transition-colors ${
                                            isActive
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {preset === 'free' ? 'Free' : preset}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rotation */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rotation
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleRotate(-90)}
                                className="flex items-center gap-2 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                            >
                                <FaUndo />
                                Rotate Left
                            </button>
                            <button
                                onClick={() => handleRotate(90)}
                                className="flex items-center gap-2 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                            >
                                <FaRedo />
                                Rotate Right
                            </button>
                            <span className="text-sm text-gray-600 ml-auto">
                                {rotation}°
                            </span>
                        </div>
                    </div>

                    {/* Auto Crop Button */}
                    <div className="pt-2 border-t">
                        <button
                            onClick={handleAutoCrop}
                            disabled={isLoadingAutoCrop || isProcessing}
                            className="flex items-center gap-2 px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FaMagic />
                            {isLoadingAutoCrop ? 'Analyzing...' : 'Auto Crop (AI)'}
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                            Let AI suggest the best crop for your image
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 p-4 border-t">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Processing...' : 'Save & Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
}
