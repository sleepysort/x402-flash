import { NextRequest, NextResponse } from 'next/server'

const DEMO_SERVER_URL = 'http://localhost:3002'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathname = url.searchParams.get('path') || '/hello/exact'
    
    const response = await fetch(`${DEMO_SERVER_URL}${pathname}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
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
    const pathname = url.searchParams.get('path') || '/hello/exact'
    const body = await request.text()
    
    const response = await fetch(`${DEMO_SERVER_URL}${pathname}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: body || undefined,
    })

    const data = await response.text()
    
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to demo server' },
      { status: 503 }
    )
  }
}