import { nativeAppConfiguration, nativeNoStoreHeaders } from '@/lib/server/nativeApp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const configuration = nativeAppConfiguration();

  return Response.json({
    contract_version: configuration.contractVersion,
    status: configuration.maintenanceMode ? 'maintenance' : 'available',
    minimum_supported_app_version: configuration.minimumAppVersion,
    maintenance_mode: configuration.maintenanceMode,
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_RELEASE || 'development',
    server_time: new Date().toISOString(),
  }, { headers: nativeNoStoreHeaders() });
}
