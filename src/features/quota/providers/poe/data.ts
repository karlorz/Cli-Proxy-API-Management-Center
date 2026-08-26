/**
 * Poe 额度数据层：compute-points 余额 + 授予计划。
 * React-free / SCSS-free。
 */

import type { TFunction } from 'i18next';
import type { AuthFileItem, PoeBalancePayload, PoeQuotaState } from '@/types';
import { apiCallApi, getApiCallErrorMessage } from '@/services/api';
import {
  POE_BALANCE_URL,
  POE_REQUEST_HEADERS,
  createStatusError,
  isDisabledAuthFile,
  isPoeFile,
} from '@/utils/quota';
import { normalizeAuthIndex } from '@/utils/authIndex';
import type { QuotaProviderData } from '../types';

const toRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const normalizeOptionalScalar = (value: unknown): string | number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return undefined;
};

export const parsePoeBalancePayload = (value: unknown): PoeBalancePayload | null => {
  const record = toRecord(value);
  if (!record) return null;
  if (!('current_point_balance' in record) && !('plan_points_balance' in record)) return null;
  return {
    current_point_balance: normalizeOptionalScalar(record.current_point_balance),
    plan_points_balance: normalizeOptionalScalar(record.plan_points_balance),
    addon_point_balance: normalizeOptionalScalar(record.addon_point_balance),
    plan_balance_usd: normalizeOptionalScalar(record.plan_balance_usd),
    addon_balance_usd: normalizeOptionalScalar(record.addon_balance_usd),
    total_balance_usd: normalizeOptionalScalar(record.total_balance_usd),
    points_cycle_start_time: normalizeOptionalScalar(record.points_cycle_start_time),
    next_daily_grant_time: normalizeOptionalScalar(record.next_daily_grant_time),
    next_monthly_grant_time: normalizeOptionalScalar(record.next_monthly_grant_time),
    next_daily_grant_amount: normalizeOptionalScalar(record.next_daily_grant_amount),
    next_monthly_grant_amount: normalizeOptionalScalar(record.next_monthly_grant_amount),
    auto_recharge: record.auto_recharge === undefined ? undefined : record.auto_recharge,
  };
};

const fetchPoeQuota = async (file: AuthFileItem, t: TFunction): Promise<PoeBalancePayload> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('poe_quota.missing_auth_index'));
  }

  const result = await apiCallApi.request({
    authIndex,
    method: 'GET',
    url: POE_BALANCE_URL,
    header: { ...POE_REQUEST_HEADERS },
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw createStatusError(getApiCallErrorMessage(result), result.statusCode);
  }

  const payload = parsePoeBalancePayload(result.body ?? result.bodyText);
  if (!payload) {
    throw new Error(t('poe_quota.empty_data'));
  }

  return payload;
};

export const POE_CONFIG: QuotaProviderData<PoeQuotaState, PoeBalancePayload> = {
  type: 'poe',
  i18nPrefix: 'poe_quota',
  filterFn: (file) => isPoeFile(file) && !isDisabledAuthFile(file),
  fetchQuota: fetchPoeQuota,
  storeSelector: (state) => state.poeQuota,
  storeSetter: 'setPoeQuota',
  buildLoadingState: () => ({ status: 'loading', balance: null }),
  buildSuccessState: (balance) => ({ status: 'success', balance }),
  buildErrorState: (message, status) => ({
    status: 'error',
    balance: null,
    error: message,
    errorStatus: status,
  }),
};
