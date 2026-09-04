import { nativeAppConfiguration, nativeNoStoreHeaders } from '@/lib/server/nativeApp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const configuration = nativeAppConfiguration();

  return Response.json({
    contract_version: configuration.contractVersion,
    minimum_supported_app_version: configuration.minimumAppVersion,
    maintenance_mode: configuration.maintenanceMode,
    features: configuration.features,
    server_time: new Date().toISOString(),
  }, { headers: nativeNoStoreHeaders() });
}
