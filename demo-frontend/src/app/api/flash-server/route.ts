import { NextRequest, NextResponse } from 'next/server'

const DEMO_SERVER_URL = 'http://localhost:3002'

// Helper function to forward relevant headers
function getForwardedHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': request.headers.get('Accept') || 'application/json',
    'Content-Type': request.headers.get('Content-Type') || 'application/json',
  }

  // Forward X402 payment headers
  const xPayment = request.headers.get('X-Payment')
  if (xPayment) {
    headers['X-Payment'] = xPayment
  }

  // Forward any other relevant headers
  const userAgent = request.headers.get('User-Agent')
  if (userAgent) {
    headers['User-Agent'] = userAgent
  }

  return headers
}

// Helper function to forward response headers
function getResponseHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {}
  
  // Always forward content-type
  const contentType = response.headers.get('Content-Type')
  if (contentType) {
    headers['Content-Type'] = contentType
  }

  // Forward X402 payment response headers
  const xPaymentResponse = response.headers.get('X-Payment-Response')
  if (xPaymentResponse) {
    headers['X-Payment-Response'] = xPaymentResponse
  }

  // Forward any other relevant response headers
  const cacheControl = response.headers.get('Cache-Control')
  if (cacheControl) {
    headers['Cache-Control'] = cacheControl
  }

  return headers
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathname = url.searchParams.get('path') || '/hello'
    
    console.log(`Proxying GET request to: ${DEMO_SERVER_URL}${pathname}`)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const response = await fetch(`${DEMO_SERVER_URL}${pathname}`, {
      method: 'GET',
      headers: getForwardedHeaders(request),
    })

    const data = await response.text()
    
    console.log(`Response status: ${response.status}`)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: getResponseHeaders(response),
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to demo server' },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathname = url.searchParams.get('path') || '/hello'
    const body = await request.text()
    
    console.log(`Proxying POST request to: ${DEMO_SERVER_URL}${pathname}`)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const response = await fetch(`${DEMO_SERVER_URL}${pathname}`, {
      method: 'POST',
      headers: getForwardedHeaders(request),
      body: body || undefined,
    })

    const data = await response.text()
    
    console.log(`Response status: ${response.status}`)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: getResponseHeaders(response),
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to demo server' },
      { status: 503 }
    )
  }
}