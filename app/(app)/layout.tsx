import { AuthGuard } from "@/components/auth/auth-guard";
import { getLayerCatalog } from "@/lib/api/layers";
import { LayerCatalogProvider } from "@/providers/layer-catalog-provider";
import { MapLayerVisibilityProvider } from "@/providers/map-layer-visibility-provider";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let catalog = null;
  let error: string | null = null;

  try {
    catalog = await getLayerCatalog();
  } catch (e) {
    error =
      e instanceof Error ? e.message : "Không kết nối được API backend";
  }

  return (
    <AuthGuard>
      <LayerCatalogProvider catalog={catalog} error={error}>
        <MapLayerVisibilityProvider>
          <AppShell>{children}</AppShell>
        </MapLayerVisibilityProvider>
      </LayerCatalogProvider>
    </AuthGuard>
  );
}
