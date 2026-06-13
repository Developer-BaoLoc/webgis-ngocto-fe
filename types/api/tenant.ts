export interface TenantSettings {
  ward: string;
  district: string;
  province: string;
}

export interface Tenant {
  id: string;
  code: string;
  name: string;
  settings: TenantSettings;
}

export interface Organization {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
}
