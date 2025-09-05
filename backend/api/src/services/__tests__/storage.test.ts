import { StorageService, storageService } from '../storage';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('sharp');
jest.mock('uuid');
jest.mock('../../index', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/test.jpg' },
        }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/signed-url' },
          error: null,
        }),
      }),
    },
  },
}));

const mockSharp = sharp as jest.MockedFunction<typeof sharp>;
const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('StorageService', () => {
  let service: StorageService;
  let mockSupabaseStorage: any;
  let mockSharpInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();

    service = new StorageService();
    mockSupabaseStorage = require('../../index').supabase.storage;
    
    // Reset the mock implementation properly
    mockSupabaseStorage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/test.jpg' },
      }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://storage.example.com/signed-url' },
        error: null,
      }),
    });

    // Mock sharp instance with chainable methods
    mockSharpInstance = {
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image-data')),
    };

    mockSharp.mockReturnValue(mockSharpInstance);
    mockUuidv4.mockReturnValue('test-uuid-123');
  });

  describe('Image Upload', () => {
    const mockImageBuffer = Buffer.from('test-image-data');
    const mockOptions = {
      bucket: 'images',
      folder: 'recipes',
      quality: 90,
      maxWidth: 1200,
      maxHeight: 800,
    };

    it('should upload image successfully with custom options', async () => {
      const result = await service.uploadImage(mockImageBuffer, 'user123', mockOptions);

      expect(mockSharp).toHaveBeenCalledWith(mockImageBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1200, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 90 });
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();

      expect(mockSupabaseStorage.from).toHaveBeenCalledWith('images');
      expect(mockSupabaseStorage.from().upload).toHaveBeenCalledWith(
        'recipes/user123/test-uuid-123.jpg',
        Buffer.from('processed-image-data'),
        {
          contentType: 'image/jpeg',
          upsert: false,
        }
      );

      expect(mockSupabaseStorage.from().getPublicUrl).toHaveBeenCalledWith(
        'recipes/user123/test-uuid-123.jpg'
      );

      expect(result).toEqual({
        url: 'https://storage.example.com/test.jpg',
        path: 'recipes/user123/test-uuid-123.jpg',
      });
    });

    it('should upload image with default options', async () => {
      const basicOptions = {
        bucket: 'images',
        folder: 'scans',
      };

      await service.uploadImage(mockImageBuffer, 'user456', basicOptions);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 85 });

      expect(mockSupabaseStorage.from().upload).toHaveBeenCalledWith(
        'scans/user456/test-uuid-123.jpg',
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'image/jpeg',
          upsert: false,
        })
      );
    });

    it('should handle sharp image processing errors', async () => {
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Sharp processing failed'));

      await expect(
        service.uploadImage(mockImageBuffer, 'user123', mockOptions)
      ).rejects.toThrow('Sharp processing failed');

      expect(console.error).toHaveBeenCalledWith('Image upload error:', expect.any(Error));
    });

    it('should handle storage upload errors', async () => {
      mockSupabaseStorage.from().upload.mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });

      await expect(
        service.uploadImage(mockImageBuffer, 'user123', mockOptions)
      ).rejects.toThrow('Storage upload failed: Upload failed');

      expect(console.error).toHaveBeenCalledWith('Image upload error:', expect.any(Error));
    });

    it('should handle file path generation correctly', async () => {
      mockUuidv4.mockReturnValue('unique-file-id-456');

      await service.uploadImage(mockImageBuffer, 'user789', {
        bucket: 'profile-images',
        folder: 'avatars',
      });

      expect(mockSupabaseStorage.from().upload).toHaveBeenCalledWith(
        'avatars/user789/unique-file-id-456.jpg',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should handle different image qualities', async () => {
      await service.uploadImage(mockImageBuffer, 'user123', {
        bucket: 'images',
        folder: 'test',
        quality: 100,
      });

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 100 });
    });

    it('should handle different image dimensions', async () => {
      await service.uploadImage(mockImageBuffer, 'user123', {
        bucket: 'images',
        folder: 'test',
        maxWidth: 500,
        maxHeight: 300,
      });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(500, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    });
  });

  describe('Image Deletion', () => {
    it('should delete image successfully', async () => {
      await service.deleteImage('images', 'recipes/user123/test-image.jpg');

      expect(mockSupabaseStorage.from).toHaveBeenCalledWith('images');
      expect(mockSupabaseStorage.from().remove).toHaveBeenCalledWith(['recipes/user123/test-image.jpg']);
    });

    it('should handle deletion errors', async () => {
      mockSupabaseStorage.from().remove.mockResolvedValue({
        data: null,
        error: { message: 'Deletion failed' },
      });

      await expect(
        service.deleteImage('images', 'test-path.jpg')
      ).rejects.toThrow('Storage deletion failed: Deletion failed');

      expect(console.error).toHaveBeenCalledWith('Image deletion error:', expect.any(Error));
    });

    it('should handle unexpected errors during deletion', async () => {
      mockSupabaseStorage.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(
        service.deleteImage('images', 'test-path.jpg')
      ).rejects.toThrow('Unexpected error');

      expect(console.error).toHaveBeenCalledWith('Image deletion error:', expect.any(Error));
    });
  });

  describe('Signed URL Generation', () => {
    it('should generate signed URL with default expiration', async () => {
      const signedUrl = await service.getSignedUrl('private-images', 'user123/private.jpg');

      expect(mockSupabaseStorage.from).toHaveBeenCalledWith('private-images');
      expect(mockSupabaseStorage.from().createSignedUrl).toHaveBeenCalledWith(
        'user123/private.jpg',
        3600
      );
      expect(signedUrl).toBe('https://storage.example.com/signed-url');
    });

    it('should generate signed URL with custom expiration', async () => {
      await service.getSignedUrl('private-images', 'test-path.jpg', 7200);

      expect(mockSupabaseStorage.from().createSignedUrl).toHaveBeenCalledWith(
        'test-path.jpg',
        7200
      );
    });

    it('should handle signed URL creation errors', async () => {
      mockSupabaseStorage.from().createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Signed URL creation failed' },
      });

      await expect(
        service.getSignedUrl('private-images', 'test-path.jpg')
      ).rejects.toThrow('Failed to create signed URL: Signed URL creation failed');

      expect(console.error).toHaveBeenCalledWith('Signed URL error:', expect.any(Error));
    });

    it('should handle missing data in signed URL response', async () => {
      mockSupabaseStorage.from().createSignedUrl.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        service.getSignedUrl('private-images', 'test-path.jpg')
      ).rejects.toThrow('Failed to create signed URL: undefined');
    });

    it('should handle unexpected errors during signed URL generation', async () => {
      mockSupabaseStorage.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      await expect(
        service.getSignedUrl('private-images', 'test-path.jpg')
      ).rejects.toThrow('Network error');

      expect(console.error).toHaveBeenCalledWith('Signed URL error:', expect.any(Error));
    });
  });

  describe('Batch Upload', () => {
    const mockImageBuffers = [
      Buffer.from('image1-data'),
      Buffer.from('image2-data'),
      Buffer.from('image3-data'),
    ];

    const mockOptions = {
      bucket: 'images',
      folder: 'batch-upload',
    };

    it('should upload multiple images successfully', async () => {
      mockUuidv4
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2')
        .mockReturnValueOnce('uuid-3');

      const results = await service.uploadBatch(mockImageBuffers, 'user123', mockOptions);

      expect(results).toHaveLength(3);
      expect(results).toEqual([
        {
          url: 'https://storage.example.com/test.jpg',
          path: 'batch-upload/user123/uuid-1.jpg',
        },
        {
          url: 'https://storage.example.com/test.jpg',
          path: 'batch-upload/user123/uuid-2.jpg',
        },
        {
          url: 'https://storage.example.com/test.jpg',
          path: 'batch-upload/user123/uuid-3.jpg',
        },
      ]);

      expect(mockSharp).toHaveBeenCalledTimes(3);
      expect(mockSupabaseStorage.from().upload).toHaveBeenCalledTimes(3);
    });

    it('should handle empty image array', async () => {
      const results = await service.uploadBatch([], 'user123', mockOptions);

      expect(results).toEqual([]);
      expect(mockSharp).not.toHaveBeenCalled();
      expect(mockSupabaseStorage.from().upload).not.toHaveBeenCalled();
    });

    it('should handle partial failures in batch upload', async () => {
      // Mock one upload to fail
      let uploadCallCount = 0;
      mockSupabaseStorage.from().upload.mockImplementation(() => {
        uploadCallCount++;
        if (uploadCallCount === 2) {
          return Promise.resolve({ data: null, error: { message: 'Upload failed' } });
        }
        return Promise.resolve({ data: null, error: null });
      });

      mockUuidv4
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2')
        .mockReturnValueOnce('uuid-3');

      // Should throw error due to Promise.all behavior
      await expect(
        service.uploadBatch(mockImageBuffers, 'user123', mockOptions)
      ).rejects.toThrow('Storage upload failed: Upload failed');
    });

    it('should handle single image in batch', async () => {
      const singleImageBuffer = [Buffer.from('single-image-data')];
      mockUuidv4.mockReturnValue('single-uuid');

      const results = await service.uploadBatch(singleImageBuffer, 'user123', mockOptions);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        url: 'https://storage.example.com/test.jpg',
        path: 'batch-upload/user123/single-uuid.jpg',
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-Error objects in catch blocks', async () => {
      mockSharp.mockImplementation(() => {
        throw 'String error'; // Non-Error object
      });

      await expect(
        service.uploadImage(Buffer.from('test'), 'user123', {
          bucket: 'test',
          folder: 'test',
        })
      ).rejects.toBe('String error');

      expect(console.error).toHaveBeenCalledWith('Image upload error:', 'String error');
    });

    it('should handle very large image buffers', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB buffer

      await service.uploadImage(largeBuffer, 'user123', {
        bucket: 'images',
        folder: 'large-images',
        maxWidth: 4000,
        maxHeight: 3000,
      });

      expect(mockSharp).toHaveBeenCalledWith(largeBuffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(4000, 3000, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    });

    it('should handle zero quality setting', async () => {
      await service.uploadImage(Buffer.from('test'), 'user123', {
        bucket: 'images',
        folder: 'test',
        quality: 0,
      });

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 0 });
    });

    it('should handle maximum quality setting', async () => {
      await service.uploadImage(Buffer.from('test'), 'user123', {
        bucket: 'images',
        folder: 'test',
        quality: 100,
      });

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 100 });
    });

    it('should handle empty folder names', async () => {
      await service.uploadImage(Buffer.from('test'), 'user123', {
        bucket: 'images',
        folder: '',
      });

      expect(mockSupabaseStorage.from().upload).toHaveBeenCalledWith(
        '/user123/test-uuid-123.jpg',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should handle special characters in user IDs', async () => {
      await service.uploadImage(Buffer.from('test'), 'user@123.com', {
        bucket: 'images',
        folder: 'uploads',
      });

      expect(mockSupabaseStorage.from().upload).toHaveBeenCalledWith(
        'uploads/user@123.com/test-uuid-123.jpg',
        expect.any(Buffer),
        expect.any(Object)
      );
    });

    it('should handle empty path in deletion', async () => {
      await service.deleteImage('images', '');

      expect(mockSupabaseStorage.from().remove).toHaveBeenCalledWith(['']);
    });

    it('should handle signed URL with zero expiration', async () => {
      await service.getSignedUrl('private-images', 'test.jpg', 0);

      expect(mockSupabaseStorage.from().createSignedUrl).toHaveBeenCalledWith('test.jpg', 0);
    });
  });

  describe('Module Export', () => {
    it('should export singleton storage service instance', () => {
      expect(storageService).toBeInstanceOf(StorageService);
    });
  });

  describe('Sharp Configuration', () => {
    it('should configure sharp with correct resize options', async () => {
      await service.uploadImage(Buffer.from('test'), 'user123', {
        bucket: 'test',
        folder: 'test',
        maxWidth: 800,
        maxHeight: 600,
      });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(800, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    });

    it('should configure sharp with correct JPEG options', async () => {
      await service.uploadImage(Buffer.from('test'), 'user123', {
        bucket: 'test',
        folder: 'test',
        quality: 95,
      });

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 95 });
    });

    it('should chain sharp operations correctly', async () => {
      await service.uploadImage(Buffer.from('test'), 'user123', {
        bucket: 'test',
        folder: 'test',
      });

      expect(mockSharpInstance.resize).toHaveReturnedWith(mockSharpInstance);
      expect(mockSharpInstance.jpeg).toHaveReturnedWith(mockSharpInstance);
    });
  });

  describe('UUID Generation', () => {
    it('should generate unique filenames for each upload', async () => {
      mockUuidv4
        .mockReturnValueOnce('uuid-first')
        .mockReturnValueOnce('uuid-second');

      await service.uploadImage(Buffer.from('test1'), 'user123', {
        bucket: 'test',
        folder: 'test',
      });

      await service.uploadImage(Buffer.from('test2'), 'user123', {
        bucket: 'test',
        folder: 'test',
      });

      expect(mockSupabaseStorage.from().upload).toHaveBeenCalledWith(
        'test/user123/uuid-first.jpg',
        expect.any(Buffer),
        expect.any(Object)
      );

      expect(mockSupabaseStorage.from().upload).toHaveBeenCalledWith(
        'test/user123/uuid-second.jpg',
        expect.any(Buffer),
        expect.any(Object)
      );
    });
  });
});