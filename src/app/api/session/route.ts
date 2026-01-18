import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/jwt';
import { MIN_CUSTOM_DURATION, MAX_CUSTOM_DURATION, DURATION_67_REPS } from '@/types/game';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { duration_ms } = body;

    // Validate duration
    if (typeof duration_ms !== 'number') {
      return NextResponse.json(
        { error: 'duration_ms is required and must be a number' },
        { status: 400 }
      );
    }

    // Allow DURATION_67_REPS (-1) or valid custom durations
    const is67RepsMode = duration_ms === DURATION_67_REPS;
    if (!is67RepsMode && (duration_ms < MIN_CUSTOM_DURATION || duration_ms > MAX_CUSTOM_DURATION)) {
      return NextResponse.json(
        { error: `duration_ms must be ${DURATION_67_REPS} (67 reps mode) or between ${MIN_CUSTOM_DURATION}ms and ${MAX_CUSTOM_DURATION}ms` },
        { status: 400 }
      );
    }

    // Create session token
    const token = await createSessionToken({
      mode: 'normal',
      duration_ms
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
