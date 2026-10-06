/**
 * Centralized Configuration Module
 * Strict separation between LIVE AWS MODE and LOCAL DEMO MODE.
 * Eliminates silent fallbacks and enforces transparency.
 */

const env = import.meta.env;

// LIVE AWS mode is explicitly active only when VITE_USE_MOCK is 'false' and AWS endpoints are configured
const isLiveAws = env.VITE_USE_MOCK === 'false' && Boolean(env.VITE_WS_API_URL);

export const config = {
  region: env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: env.VITE_COGNITO_USER_POOL_ID || '',
  clientId: env.VITE_COGNITO_CLIENT_ID || '',
  wsApiUrl: env.VITE_WS_API_URL || '',
  restApiUrl: env.VITE_REST_API_URL || '',
  s3BucketName: env.VITE_S3_BUCKET_NAME || '',
  
  // Explicit Application Modes
  mode: isLiveAws ? 'LIVE_AWS' : 'LOCAL_DEMO',
  isLiveAws: isLiveAws,
  isLocalDemo: !isLiveAws
};
