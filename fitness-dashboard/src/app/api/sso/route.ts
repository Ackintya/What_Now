import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('target');
  
  if (!target) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (token) {
     const dest = new URL(target);
     dest.searchParams.set('token', token);
     return NextResponse.redirect(dest.toString());
  }

  return NextResponse.redirect(target);
}
