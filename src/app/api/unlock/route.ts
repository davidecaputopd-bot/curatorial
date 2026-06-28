import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    const expectedPassword = process.env.GROW_PASSWORD
    const accessToken = process.env.GROW_ACCESS_TOKEN

    if (!expectedPassword || !accessToken) {
      return NextResponse.json(
        { error: 'Configurazione server mancante' },
        { status: 500 }
      )
    }

    if (!password || password !== expectedPassword) {
      return NextResponse.json(
        { error: 'Password non corretta' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ ok: true })

    response.cookies.set('grow_session', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Richiesta non valida' },
      { status: 400 }
    )
  }
}
