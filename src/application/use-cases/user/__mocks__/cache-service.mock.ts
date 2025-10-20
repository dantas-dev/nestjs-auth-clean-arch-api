import { ICacheService } from 'src/domain/services';

export const mockCacheService: ICacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  deleteByPrefix: jest.fn().mockResolvedValue(undefined),
};
