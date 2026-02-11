import { Context, Next } from 'hono';

export async function errorHandler(c: Context, next: Next) {
  try {
    return await next();
  } catch (err) {
    const error = err as Error & { status?: number; cause?: string };
    
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    
    const statusCode = error.status || 500;
    return c.json({
      error: {
        message: error.message || 'Internal Server Error',
        cause: error.cause,
        status: statusCode,
      },
    }, statusCode as any);
  }
}

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.url} - ${c.res.status} - ${ms}ms`);
}

export async function rateLimiter(_c: Context, next: Next) {
  // Simple in-memory rate limiter (use Redis for production)
  // const ip = _c.req.header('CF-Connecting-IP') || 'unknown';
  // const now = Date.now();
  // const windowMs = 60000; // 1 minute
  // const maxRequests = 60; // 60 requests per minute
  
  // In production, use Redis or rate-limiter-flexible package
  // This is a simplified version for demo purposes
  return await next();
}

export async function cors(c: Context, next: Next) {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (c.req.method === 'OPTIONS') {
    return c.json({}, 204 as any);
  }
  
  return await next();
}

export async function helmet(c: Context, next: Next) {
  // Basic security headers
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  await next();
}
