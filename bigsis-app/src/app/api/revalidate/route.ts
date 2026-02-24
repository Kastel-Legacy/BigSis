import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST() {
    revalidatePath('/fiches', 'page');
    revalidatePath('/fiches/[slug]', 'page');
    return NextResponse.json({ revalidated: true });
}
