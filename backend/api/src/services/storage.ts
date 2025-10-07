import { supabase } from '../index';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

interface UploadOptions {
  bucket: string;
  folder: string;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export class StorageService {
  // Upload image to Supabase Storage
  async uploadImage(
    imageBuffer: Buffer,
    userId: string,
    options: UploadOptions
  ): Promise<{ url: string; path: string }> {
    try {
      const { bucket, folder, quality = 85, maxWidth = 1920, maxHeight = 1080 } = options;

      // Process image
      const processedImage = await sharp(imageBuffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toBuffer();

      // Generate unique filename
      const filename = `${folder}/${userId}/${uuidv4()}.jpg`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage.from(bucket).upload(filename, processedImage, {
        contentType: 'image/jpeg',
        upsert: false,
      });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filename);

      return {
        url: publicUrl,
        path: filename,
      };
    } catch (error: unknown) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  // Delete image from storage
  async deleteImage(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) {
        throw new Error(`Storage deletion failed: ${error.message}`);
      }
    } catch (error: unknown) {
      console.error('Image deletion error:', error);
      throw error;
    }
  }

  // Generate signed URL for private images
  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

      if (error || !data) {
        throw new Error(`Failed to create signed URL: ${error?.message}`);
      }

      return data.signedUrl;
    } catch (error: unknown) {
      console.error('Signed URL error:', error);
      throw error;
    }
  }

  // Upload multiple images (batch upload)
  async uploadBatch(
    images: Buffer[],
    userId: string,
    options: UploadOptions
  ): Promise<Array<{ url: string; path: string }>> {
    const uploadPromises = images.map((imageBuffer) =>
      this.uploadImage(imageBuffer, userId, options)
    );

    return Promise.all(uploadPromises);
  }
}

export const storageService = new StorageService();
