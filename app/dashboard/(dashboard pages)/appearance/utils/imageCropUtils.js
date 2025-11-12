// app/dashboard/(dashboard pages)/appearance/utils/imageCropUtils.js
// Image cropping and processing utilities

import smartcrop from 'smartcrop';

/**
 * Creates an Image element from a URL or File
 * @param {string|File} url - Image URL or File object
 * @returns {Promise<HTMLImageElement>}
 */
export const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));

        // Only set crossOrigin for remote HTTP/HTTPS URLs
        // Setting it for data URLs or blob URLs taints the canvas
        if (typeof url === 'string') {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                image.setAttribute('crossOrigin', 'anonymous');
            }
            image.src = url;
        } else {
            // File objects create blob URLs which don't need CORS
            image.src = URL.createObjectURL(url);
        }
    });

/**
 * Gets radians from degrees
 * @param {number} degrees
 * @returns {number} radians
 */
export function getRadianAngle(degreeValue) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Rotates image size to get correct dimensions after rotation
 * @param {number} width
 * @param {number} height
 * @param {number} rotation
 * @returns {Object} rotated dimensions
 */
export function rotateSize(width, height, rotation) {
    const rotRad = getRadianAngle(rotation);

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

/**
 * Crops and rotates an image, returns a Blob
 * @param {string} imageSrc - Image source URL
 * @param {Object} pixelCrop - Crop area in pixels
 * @param {number} rotation - Rotation angle in degrees
 * @param {boolean} flip - Whether to flip horizontally
 * @returns {Promise<Blob>}
 */
export async function getCroppedImg(
    imageSrc,
    pixelCrop,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
) {
    const image = await createImage(imageSrc);

    // Validate crop dimensions
    if (!pixelCrop || pixelCrop.width <= 0 || pixelCrop.height <= 0) {
        console.error('Invalid crop dimensions:', pixelCrop);
        throw new Error(`Invalid crop dimensions: width=${pixelCrop?.width}, height=${pixelCrop?.height}`);
    }

    // Ensure crop area is within image bounds
    const safePixelCrop = {
        x: Math.max(0, Math.min(pixelCrop.x, image.width)),
        y: Math.max(0, Math.min(pixelCrop.y, image.height)),
        width: Math.max(1, Math.min(pixelCrop.width, image.width)),
        height: Math.max(1, Math.min(pixelCrop.height, image.height)),
    };

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    const rotRad = getRadianAngle(rotation);

    // Calculate bounding box of the rotated crop area
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        safePixelCrop.width,
        safePixelCrop.height,
        rotation
    );

    // Set canvas size to match the bounding box of the rotated crop
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate to center of canvas
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);

    // Apply rotation
    ctx.rotate(rotRad);

    // Apply flip
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);

    // Translate back to draw centered
    ctx.translate(-safePixelCrop.width / 2, -safePixelCrop.height / 2);

    // Draw the cropped portion of the image directly
    // drawImage with 9 params: (image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    ctx.drawImage(
        image,
        safePixelCrop.x,
        safePixelCrop.y,
        safePixelCrop.width,
        safePixelCrop.height,
        0,
        0,
        safePixelCrop.width,
        safePixelCrop.height
    );

    // Return as blob
    return new Promise((resolve, reject) => {
        canvas.toBlob((file) => {
            if (file) {
                resolve(file);
            } else {
                reject(new Error('Canvas is empty'));
            }
        }, 'image/jpeg', 0.95);
    });
}

/**
 * Get automatic smart crop suggestion using smartcrop.js
 * @param {HTMLImageElement|File} image - Image element or File
 * @param {number} width - Desired crop width
 * @param {number} height - Desired crop height
 * @returns {Promise<Object>} Crop coordinates
 */
export async function getAutoCrop(image, width = 800, height = 600) {
    try {
        let imageElement;

        if (image instanceof File) {
            imageElement = await createImage(image);
        } else {
            imageElement = image;
        }

        const result = await smartcrop.crop(imageElement, {
            width,
            height,
            minScale: 1.0,
        });

        if (result && result.topCrop) {
            const crop = result.topCrop;
            return {
                x: crop.x,
                y: crop.y,
                width: crop.width,
                height: crop.height,
            };
        }

        // Fallback to center crop if smartcrop fails
        return {
            x: (imageElement.width - width) / 2,
            y: (imageElement.height - height) / 2,
            width,
            height,
        };
    } catch (error) {
        console.error('Auto crop error:', error);
        throw error;
    }
}

/**
 * Convert degrees to valid rotation values (0, 90, 180, 270)
 * @param {number} degrees
 * @returns {number}
 */
export function normalizeRotation(degrees) {
    let normalized = degrees % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
}

/**
 * Get aspect ratio from preset name
 * @param {string} preset - Preset name (free, square, 4:3, 16:9)
 * @returns {number|null}
 */
export function getAspectRatio(preset) {
    const ratios = {
        free: null,
        square: 1,
        '4:3': 4 / 3,
        '16:9': 16 / 9,
        '3:4': 3 / 4,
        '9:16': 9 / 16,
    };
    return ratios[preset] || null;
}

/**
 * Calculate crop area for aspect ratio
 * @param {Object} imageSize - {width, height}
 * @param {number|null} aspectRatio
 * @returns {Object} crop area
 */
export function calculateCropForAspectRatio(imageSize, aspectRatio) {
    if (!aspectRatio) {
        return { x: 0, y: 0, width: imageSize.width, height: imageSize.height };
    }

    let cropWidth, cropHeight;
    const imageAspect = imageSize.width / imageSize.height;

    if (imageAspect > aspectRatio) {
        // Image is wider than desired aspect ratio
        cropHeight = imageSize.height;
        cropWidth = cropHeight * aspectRatio;
    } else {
        // Image is taller than desired aspect ratio
        cropWidth = imageSize.width;
        cropHeight = cropWidth / aspectRatio;
    }

    return {
        x: (imageSize.width - cropWidth) / 2,
        y: (imageSize.height - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
    };
}
