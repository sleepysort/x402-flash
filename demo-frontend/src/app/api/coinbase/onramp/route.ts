import { NextRequest, NextResponse } from 'next/server';
import { createAuthHeaders } from '@/lib/coinbase-jwt';

const COINBASE_API_BASE_URL = process.env.COINBASE_API_BASE_URL || 'https://api.developer.coinbase.com';
const COINBASE_API_KEY_NAME = process.env.COINBASE_API_KEY_NAME;
const COINBASE_PRIVATE_KEY = process.env.COINBASE_PRIVATE_KEY;

interface CreateTokenRequest {
  addresses: Array<{
    address: string;
    blockchains: string[];
  }>;
  assets?: string[];
}

interface TokenResponse {
  token: string;
  channel_id: string;
}

async function validateEnvironment() {
  if (!COINBASE_API_KEY_NAME || !COINBASE_PRIVATE_KEY) {
    throw new Error('Missing required environment variables: COINBASE_API_KEY_NAME or COINBASE_PRIVATE_KEY');
  }
}

export async function POST(request: NextRequest) {
  try {
    await validateEnvironment();
    
    const body: CreateTokenRequest = await request.json();
    
    if (!body.addresses || body.addresses.length === 0) {
      return NextResponse.json(
        { error: 'addresses is required' },
        { status: 400 }
      );
    }

    const url = new URL('/onramp/v1/token', COINBASE_API_BASE_URL);
    const headers = await createAuthHeaders(
      'POST',
      url.host,
      url.pathname,
      COINBASE_API_KEY_NAME!,
      COINBASE_PRIVATE_KEY!
    );

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Coinbase API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create session token', details: errorText },
        { status: response.status }
      );
    }

    const data: TokenResponse = await response.json();
    
    // Generate the onramp URL with the session token
    const onrampUrl = `https://pay.coinbase.com/buy/select-asset?sessionToken=${data.token}`;
    
    return NextResponse.json({
      token: data.token,
      channel_id: data.channel_id,
      onrampUrl
    });
    
  } catch (error) {
    console.error('Token creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'GET method not supported for token creation. Use POST to create session tokens.' },
    { status: 405 }
  );
}