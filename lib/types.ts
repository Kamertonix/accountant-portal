// The exact, finite set of categories — must stay identical to:
//   - ACCOUNTANT_CATEGORIES in supabase/functions/_accountant_shared.ts
//   - AccountantCategory enum in lib/services/accountant_access_service.dart
//   - the check constraint in 015_accountant_access_foundation.sql
export const ACCOUNTANT_CATEGORIES = [
  'transactions',
  'invoices',
  'expenses',
  'vat',
  'cis',
  'mileage',
  'documents',
  'self_assessment',
  'business_profile',
  'deadlines',
  'tasks',
  'mtd_report',
  'vat_return',
  'vat_statement',
  'report',
  'dashboard',
] as const;

export type AccountantCategory = (typeof ACCOUNTANT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<AccountantCategory, string> = {
  transactions: 'Transactions',
  invoices: 'Invoices',
  expenses: 'Expenses',
  vat: 'VAT',
  cis: 'CIS',
  mileage: 'Mileage',
  documents: 'Documents',
  self_assessment: 'Self Assessment',
  business_profile: 'Business Profile',
  deadlines: 'Deadlines',
  tasks: 'Tasks',
  mtd_report: 'MTD Report',
  vat_return: 'VAT Return',
  vat_statement: 'VAT Statement',
  report: 'Report',
  dashboard: 'Dashboard',
};

export interface AccountantLinkRow {
  id: string;
  user_id: string;
  accountant_id: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  invite_code: string | null;
  client_label: string;
  can_view_transactions: boolean;
  can_view_invoices: boolean;
  can_view_expenses: boolean;
  can_view_vat: boolean;
  can_view_cis: boolean;
  can_view_mileage: boolean;
  can_view_documents: boolean;
  can_view_self_assessment: boolean;
  can_view_business_profile: boolean;
  can_view_deadlines: boolean;
  can_view_tasks: boolean;
  can_view_mtd_report: boolean;
  can_view_vat_return: boolean;
  can_view_vat_statement: boolean;
  can_view_report: boolean;
  can_view_dashboard: boolean;
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountantDataSnapshotRow {
  id: string;
  user_id: string;
  category: AccountantCategory;
  period_from: string | null;
  period_to: string | null;
  business_only: boolean;
  payload: { items?: unknown[] } & Record<string, unknown>;
  synced_at: string;
}

export function permissionColumnFor(category: AccountantCategory): keyof AccountantLinkRow {
  return `can_view_${category}` as keyof AccountantLinkRow;
}

export function grantedCategories(link: AccountantLinkRow): AccountantCategory[] {
  return ACCOUNTANT_CATEGORIES.filter((category) => Boolean(link[permissionColumnFor(category)]));
}
