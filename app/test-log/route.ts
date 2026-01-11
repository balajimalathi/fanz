
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET() {
  await logger.info('Test Info Log from API');
  await logger.error('Test Error Log from API');
  return NextResponse.json({ status: 'Logged' });
}
