import { listBranches, syncRef } from '@/server/ds-git';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ branches: await listBranches() });
}

export async function POST(request: Request) {
  const { ref } = (await request.json()) as { ref: string };
  const result = await syncRef(ref);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
