export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'CookCam API',
    version: '1.0.0',
    description: 'Mock swagger spec for testing',
  },
  paths: {
    '/test': {
      get: {
        summary: 'Test endpoint',
        responses: {
          '200': {
            description: 'Success',
          },
        },
      },
    },
  },
};