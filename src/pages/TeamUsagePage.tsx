import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { apiKeyConfigsApi, type APIKeyConfig } from '@/services/api/apiKeyConfigs';
import { teamUsageApi, type TeamUsageRow } from '@/services/api/teamUsage';
import { aggregateTeamUsage } from '@/features/teamUsage/aggregate';
import styles from './TeamUsagePage.module.scss';

type RangeMode = '24h' | '7d' | '30d' | 'all' | 'custom';

const COLORS = ['#c65746', '#5b8def', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'];

const toDateTimeInput = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const formatCount = (value: number) => new Intl.NumberFormat().format(value);

const rangeStart = (mode: RangeMode): Date | undefined => {
  const now = Date.now();
  if (mode === '24h') return new Date(now - 24 * 60 * 60 * 1000);
  if (mode === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (mode === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return undefined;
};

const defaultCustomRange = (): [string, string] => {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return [toDateTimeInput(start), toDateTimeInput(end)];
};

function ModelBar({
  models,
  total,
  emptyText,
  ariaLabel,
}: {
  models: Array<{ model: string; totalTokens: number }>;
  total: number;
  emptyText: string;
  ariaLabel: string;
}) {
  if (total <= 0 || models.length === 0) return <span className={styles.empty}>{emptyText}</span>;
  return (
    <>
      <div className={styles.bar} aria-label={ariaLabel}>
        {models.map((model, index) => (
          <span
            className={styles.barSegment}
            key={model.model}
            style={{
              width: `${Math.max(1, (model.totalTokens / total) * 100)}%`,
              background: COLORS[index % COLORS.length],
            }}
            title={`${model.model}: ${formatCount(model.totalTokens)} tokens`}
          />
        ))}
      </div>
      <div className={styles.modelLegend}>
        {models.slice(0, 6).map((model, index) => (
          <span className={styles.modelLegendItem} key={model.model}>
            <i className={styles.dot} style={{ background: COLORS[index % COLORS.length] }} />
            {model.model} · {formatCount(model.totalTokens)}
          </span>
        ))}
      </div>
    </>
  );
}

export function TeamUsagePage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<RangeMode>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [rows, setRows] = useState<TeamUsageRow[]>([]);
  const [configs, setConfigs] = useState<APIKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const start = range === 'custom' && customStart ? new Date(customStart) : rangeStart(range);
    const end = range === 'custom' && customEnd ? new Date(customEnd) : undefined;
    try {
      const [usageRows, apiKeyConfigs] = await Promise.all([
        teamUsageApi.getSummary(start, end),
        apiKeyConfigsApi.list(),
      ]);
      setRows(usageRows);
      setConfigs(apiKeyConfigs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('team.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [customEnd, customStart, range, t]);

  useHeaderRefresh(load);
  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => aggregateTeamUsage(rows, configs), [configs, rows]);
  const topModel = summary.models[0]?.model ?? '—';

  const selectRange = (nextRange: RangeMode) => {
    setRange(nextRange);
    if (nextRange === 'custom' && !customStart) {
      const [start, end] = defaultCustomRange();
      setCustomStart(start);
      setCustomEnd(end);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{t('team.eyebrow')}</p>
          <h1 className={styles.title}>{t('team.title')}</h1>
          <p className={styles.hint}>{t('team.description')}</p>
        </div>
        <Button onClick={() => void load()} loading={loading}>
          {t('common.refresh')}
        </Button>
      </section>

      <section className={`${styles.panel} ${styles.filters}`}>
        <div className={styles.rangeButtons}>
          {(['24h', '7d', '30d', 'all', 'custom'] as const).map((mode) => (
            <button
              className={`${styles.rangeButton} ${range === mode ? styles.rangeButtonActive : ''}`}
              key={mode}
              type="button"
              onClick={() => selectRange(mode)}
            >
              {t(`team.ranges.${mode}`)}
            </button>
          ))}
        </div>
        {range === 'custom' ? (
          <div className={styles.customRange}>
            <label className={styles.dateField}>
              {t('team.start')}
              <input
                type="datetime-local"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
              />
            </label>
            <label className={styles.dateField}>
              {t('team.end')}
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </label>
            <button className={styles.applyButton} type="button" onClick={() => void load()}>
              {t('team.apply')}
            </button>
          </div>
        ) : null}
      </section>

      {error ? <section className={`${styles.panel} ${styles.error}`}>{error}</section> : null}

      <section className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('team.key_labels')}</span>
          <strong className={styles.statValue}>{formatCount(summary.labels.length)}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('team.total_tokens')}</span>
          <strong className={styles.statValue}>{formatCount(summary.totalTokens)}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('team.requests')}</span>
          <strong className={styles.statValue}>{formatCount(summary.requests)}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('team.top_model')}</span>
          <strong className={styles.statValue}>{topModel}</strong>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>{t('team.model_composition')}</h2>
          <span>{loading ? t('common.loading') : t('team.live')}</span>
        </div>
        <ModelBar
          models={summary.models}
          total={summary.totalTokens}
          emptyText={t('team.no_token_data')}
          ariaLabel={t('team.model_composition')}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>{t('team.by_label')}</h2>
          <span>{t('team.label_count', { count: formatCount(summary.labels.length) })}</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('team.label')}</th>
                <th>{t('team.total_tokens')}</th>
                <th>{t('team.requests')}</th>
                <th>{t('team.top_model')}</th>
                <th>{t('team.model_composition')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.labels.map((label) => (
                <tr key={label.label}>
                  <td>
                    <strong>{label.label}</strong>
                    <div className={styles.rowMetrics}>
                      {label.failed > 0 ? (
                        <span>
                          {t('team.failed')}: {formatCount(label.failed)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{formatCount(label.totalTokens)}</td>
                  <td>{formatCount(label.requests)}</td>
                  <td>{label.models[0]?.model ?? '—'}</td>
                  <td>
                    <ModelBar
                      models={label.models}
                      total={label.totalTokens}
                      emptyText={t('team.no_token_data')}
                      ariaLabel={t('team.model_composition')}
                    />
                  </td>
                </tr>
              ))}
              {!loading && summary.labels.length === 0 ? (
                <tr>
                  <td className={styles.empty} colSpan={5}>
                    {t('team.empty')}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
