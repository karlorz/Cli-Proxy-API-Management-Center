/**
 * Poe 额度渲染体：compute-points 余额 + 授予计划。
 * Number-forward 布局，无水位条（Poe 无硬上限，只有授予计划）。
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PoeQuotaState } from '@/types';
import { normalizeNumberValue, parseUnixToMs, formatInstantShort } from '@/utils/quota';
import { useNow } from '@/hooks/useNow';
import { buildResetDisplay } from '@/utils/quota';
import { QuotaResetLabel } from '../../components/QuotaResetLabel';
import type { QuotaBodyProps } from '../../types';

const formatPointCount = (value: number): string =>
  new Intl.NumberFormat(undefined).format(value);

const formatUsd = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value);

export function PoeQuotaBody({ quota, classes }: QuotaBodyProps<PoeQuotaState>) {
  const { t, i18n } = useTranslation();
  // Ahead of the early return below — hooks cannot be conditional.
  const now = useNow();
  const locale = i18n.resolvedLanguage;
  const balance = quota.balance;

  const nextGrantMs = useMemo(
    () => parseUnixToMs(balance?.next_daily_grant_time ?? 0),
    [balance?.next_daily_grant_time]
  );
  const nextGrantAtMs = nextGrantMs === null ? null : nextGrantMs;
  const nextGrantDisplay = buildResetDisplay(
    nextGrantAtMs === null ? null : formatInstantShort(nextGrantAtMs),
    nextGrantAtMs,
    now,
    locale
  );
  const nextGrantAmount = normalizeNumberValue(balance?.next_daily_grant_amount);
  const cycleStartMs = parseUnixToMs(balance?.points_cycle_start_time ?? 0);

  if (!balance) {
    return <div className={classes.quotaMessage}>{t('poe_quota.empty_data')}</div>;
  }

  const currentPoints = normalizeNumberValue(balance.current_point_balance);
  const planPoints = normalizeNumberValue(balance.plan_points_balance);
  const addonPoints = normalizeNumberValue(balance.addon_point_balance);
  const totalUsd = normalizeNumberValue(balance.total_balance_usd);
  const planUsd = normalizeNumberValue(balance.plan_balance_usd);

  return (
    <>
      {currentPoints !== null && (
        <div className={classes.quotaRow}>
          <div className={classes.quotaRowHeader}>
            <span className={classes.quotaModel}>{t('poe_quota.balance_label')}</span>
            <div className={classes.quotaMeta}>
              <span className={classes.quotaPercent}>{formatPointCount(currentPoints)}</span>
            </div>
          </div>
        </div>
      )}
      {planPoints !== null && (
        <div className={classes.codexPlan}>
          <span className={classes.codexPlanLabel}>{t('poe_quota.plan_points')}</span>
          <span className={classes.codexPlanValue}>{formatPointCount(planPoints)}</span>
        </div>
      )}
      {addonPoints !== null && addonPoints > 0 && (
        <div className={classes.codexPlan}>
          <span className={classes.codexPlanLabel}>{t('poe_quota.addon_points')}</span>
          <span className={classes.codexPlanValue}>{formatPointCount(addonPoints)}</span>
        </div>
      )}
      {(totalUsd !== null || planUsd !== null) && (
        <div className={classes.codexPlan}>
          <span className={classes.codexPlanLabel}>{t('poe_quota.usd_equivalent')}</span>
          <span className={classes.codexPlanValue}>
            {totalUsd !== null ? formatUsd(totalUsd) : formatUsd(planUsd ?? 0)}
          </span>
        </div>
      )}
      {nextGrantAtMs !== null && nextGrantDisplay && (
        <div className={classes.quotaRow}>
          <div className={classes.quotaRowHeader}>
            <span className={classes.quotaModel}>
              {nextGrantAmount !== null && nextGrantAmount > 0
                ? t('poe_quota.next_grant_amount', { amount: formatPointCount(nextGrantAmount) })
                : t('poe_quota.next_grant')}
            </span>
            <div className={classes.quotaMeta}>
              <QuotaResetLabel display={nextGrantDisplay} classes={classes} />
            </div>
          </div>
        </div>
      )}
      {cycleStartMs !== null && (
        <div className={classes.quotaMessage}>{t('poe_quota.cycle_started')}</div>
      )}
    </>
  );
}
