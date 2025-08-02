import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

export const createMockRequest = (options: any = {}): Partial<Request> => ({
  headers: {},
  body: {},
  params: {},
  query: {},
  ...options
});

export const createMockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

export const createAuthenticatedRequest = (userId = '123', email = 'test@example.com'): Partial<AuthenticatedRequest> => ({
  headers: { authorization: 'Bearer valid-token' },
  user: { id: userId, email },
  body: {},
  params: {},
  query: {}
});

export const createMockNext = () => jest.fn();

export const expectErrorResponse = (res: any, statusCode: number, errorMessage?: string) => {
  expect(res.status).toHaveBeenCalledWith(statusCode);
  if (errorMessage) {
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining(errorMessage)
      })
    );
  }
};

export const expectSuccessResponse = (res: any, statusCode = 200, data?: any) => {
  expect(res.status).toHaveBeenCalledWith(statusCode);
  if (data) {
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining(data)
    );
  }
};