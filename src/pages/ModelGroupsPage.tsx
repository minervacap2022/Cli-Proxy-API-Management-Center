import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useAvailableModels } from '@/hooks/useAvailableModels';
import { useAuthStore, useNotificationStore } from '@/stores';
import { modelGroupsApi, type ModelGroup, type ModelGroupEntry } from '@/services/api/modelGroups';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import styles from './ModelGroupsPage.module.scss';

interface TierDraft {
  uid: number;
  priority: string;
  models: string[];
  newModel: string;
}

interface EditState {
  open: boolean;
  original: ModelGroup | null;
  name: string;
  tiers: TierDraft[];
}

let uidCounter = 0;
const nextUid = () => ++uidCounter;

function entriesToTiers(models: ModelGroupEntry[]): TierDraft[] {
  const map = new Map<number, string[]>();
  for (const m of models) {
    const arr = map.get(m.priority) ?? [];
    arr.push(m.model);
    map.set(m.priority, arr);
  }
  return Array.from(map.entries())
    .map(([p, ms]) => ({ uid: nextUid(), priority: String(p), models: ms, newModel: '' }))
    .sort((a, b) => Number(b.priority) - Number(a.priority));
}

function tiersToEntries(tiers: TierDraft[]): ModelGroupEntry[] {
  const result: ModelGroupEntry[] = [];
  for (const tier of tiers) {
    const p = parseInt(tier.priority, 10);
    const priority = isNaN(p) || p < 1 ? 1 : p;
    for (const model of tier.models) {
      result.push({ model, priority });
    }
  }
  return result;
}

function groupByPriority(models: ModelGroupEntry[]): { priority: number; models: string[] }[] {
  const map = new Map<number, string[]>();
  for (const m of models) {
    const arr = map.get(m.priority) ?? [];
    arr.push(m.model);
    map.set(m.priority, arr);
  }
  return Array.from(map.entries())
    .map(([priority, ms]) => ({ priority, models: ms }))
    .sort((a, b) => b.priority - a.priority);
}

const EMPTY_EDIT: EditState = {
  open: false,
  original: null,
  name: '',
  tiers: [],
};

export function ModelGroupsPage() {
  const { t } = useTranslation();
  const { showNotification, showConfirmation } = useNotificationStore();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const disabled = connectionStatus !== 'connected';
  const availableModels = useAvailableModels();

  const [groups, setGroups] = useState<ModelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await modelGroupsApi.list();
      setGroups(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('notification.refresh_failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useHeaderRefresh(load);
  useEffect(() => { load(); }, [load]);

  const openNew = () =>
    setEdit({
      open: true,
      original: null,
      name: '',
      tiers: [{ uid: nextUid(), priority: '2', models: [], newModel: '' }],
    });

  const openEdit = (group: ModelGroup) =>
    setEdit({
      open: true,
      original: group,
      name: group.name,
      tiers: group.models.length > 0
        ? entriesToTiers(group.models)
        : [{ uid: nextUid(), priority: '2', models: [], newModel: '' }],
    });

  const closeEdit = () => setEdit(EMPTY_EDIT);

  const addTier = () => {
    const maxPriority = edit.tiers.reduce((m, tier) => Math.max(m, parseInt(tier.priority, 10) || 0), 0);
    setEdit((prev) => ({
      ...prev,
      tiers: [
        { uid: nextUid(), priority: String(maxPriority + 1), models: [], newModel: '' },
        ...prev.tiers,
      ],
    }));
  };

  const removeTier = (uid: number) =>
    setEdit((prev) => ({ ...prev, tiers: prev.tiers.filter((t) => t.uid !== uid) }));

  const updateTierPriority = (uid: number, value: string) =>
    setEdit((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.uid === uid ? { ...t, priority: value } : t)),
    }));

  const updateTierNewModel = (uid: number, value: string) =>
    setEdit((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.uid === uid ? { ...t, newModel: value } : t)),
    }));

  const addModelToTier = (uid: number) =>
    setEdit((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => {
        if (t.uid !== uid) return t;
        const model = t.newModel.trim();
        if (!model || t.models.includes(model)) return { ...t, newModel: '' };
        return { ...t, models: [...t.models, model], newModel: '' };
      }),
    }));

  const removeModelFromTier = (uid: number, model: string) =>
    setEdit((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) =>
        t.uid === uid ? { ...t, models: t.models.filter((m) => m !== model) } : t
      ),
    }));

  const handleSave = async () => {
    const name = edit.name.trim();
    if (!name) {
      showNotification(t('model_groups.name_required'), 'warning');
      return;
    }
    const models = tiersToEntries(edit.tiers);
    if (models.length === 0) {
      showNotification(t('model_groups.models_required'), 'warning');
      return;
    }
    setSaving(true);
    try {
      await modelGroupsApi.upsert({ name, models });
      showNotification(
        edit.original ? t('notification.model_group_updated') : t('notification.model_group_added'),
        'success'
      );
      closeEdit();
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('notification.update_failed');
      showNotification(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (group: ModelGroup) => {
    showConfirmation({
      title: t('model_groups.delete_title'),
      message: t('model_groups.delete_confirm', { name: group.name }),
      variant: 'danger',
      confirmText: t('common.delete'),
      onConfirm: async () => {
        try {
          await modelGroupsApi.delete(group.name);
          showNotification(t('notification.model_group_deleted'), 'success');
          await load();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : t('notification.delete_failed');
          showNotification(msg, 'error');
        }
      },
    });
  };

  const sortedEditTiers = [...edit.tiers].sort((a, b) => Number(b.priority) - Number(a.priority));

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.pageTitle}>{t('model_groups.title')}</h1>
          {!loading && <span className={styles.countBadge}>{groups.length}</span>}
        </div>
        <p className={styles.description}>{t('model_groups.description')}</p>
      </div>

      <div className={styles.headerActions}>
        <Button onClick={openNew} disabled={disabled}>
          {t('model_groups.add_button')}
        </Button>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {loading ? (
        <div className={styles.loadingBox}>{t('common.loading')}</div>
      ) : groups.length === 0 ? (
        <div className={styles.emptyBox}>
          <div className={styles.emptyTitle}>{t('model_groups.empty_title')}</div>
          <div className={styles.emptyDesc}>{t('model_groups.empty_desc')}</div>
        </div>
      ) : (
        <div className={styles.grid}>
          {groups.map((group) => {
            const tiers = groupByPriority(group.models);
            return (
              <Card
                key={group.name}
                title={group.name}
                extra={
                  <div className={styles.cardActions}>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(group)} disabled={disabled}>
                      {t('common.edit')}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(group)} disabled={disabled}>
                      {t('common.delete')}
                    </Button>
                  </div>
                }
              >
                <div className={styles.tierList}>
                  {tiers.map((tier, idx) => (
                    <div key={tier.priority}>
                      {idx > 0 && (
                        <div className={styles.failoverArrow}>↓ {t('model_groups.failover_label')}</div>
                      )}
                      <div className={styles.cardTier}>
                        <div className={styles.cardTierHeader}>
                          <span className={styles.priorityBadge}>P{tier.priority}</span>
                          {tier.models.length > 1 && (
                            <span className={styles.lbBadge}>{t('model_groups.load_balanced_badge')}</span>
                          )}
                          {idx > 0 && (
                            <span className={styles.fallbackBadge}>{t('model_groups.fallback_badge')}</span>
                          )}
                        </div>
                        <div className={styles.cardChips}>
                          {tier.models.map((m) => (
                            <span key={m} className={styles.cardChip}>{m}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {edit.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>
              {edit.original ? t('model_groups.edit_modal_title') : t('model_groups.add_modal_title')}
            </h2>
            <div className={styles.modalBody}>
              <Input
                label={t('model_groups.field_name')}
                value={edit.name}
                onChange={(e) => setEdit((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('model_groups.name_placeholder')}
                disabled={!!edit.original}
              />
              <div className={styles.tiersSection}>
                <div className={styles.tiersSectionHeader}>
                  <span className={styles.tiersLabel}>{t('model_groups.field_tiers')}</span>
                  <Button variant="secondary" size="sm" onClick={addTier}>
                    {t('model_groups.add_tier_button')}
                  </Button>
                </div>
                {sortedEditTiers.map((tier, idx) => (
                  <div key={tier.uid}>
                    {idx > 0 && (
                      <div className={styles.failoverArrow}>↓ {t('model_groups.failover_label')}</div>
                    )}
                    <div className={styles.tierCard}>
                      <div className={styles.tierHeader}>
                        <div className={styles.tierPriorityRow}>
                          <span className={styles.tierPriorityLabel}>{t('model_groups.tier_priority_label')}</span>
                          <input
                            className={styles.tierPriorityInput}
                            type="number"
                            value={tier.priority}
                            onChange={(e) => updateTierPriority(tier.uid, e.target.value)}
                            min="1"
                          />
                          {tier.models.length > 1 && (
                            <span className={styles.lbBadge}>{t('model_groups.load_balanced_badge')}</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTier(tier.uid)}
                          disabled={edit.tiers.length <= 1}
                        >
                          ×
                        </Button>
                      </div>
                      {tier.models.length > 0 && (
                        <div className={styles.modelChips}>
                          {tier.models.map((m) => (
                            <span key={m} className={styles.modelChip}>
                              {m}
                              <button
                                className={styles.chipRemove}
                                onClick={() => removeModelFromTier(tier.uid, m)}
                                aria-label={`Remove ${m}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className={styles.tierAddRow}>
                        <div className={styles.tierAddInput}>
                          <AutocompleteInput
                            value={tier.newModel}
                            onChange={(val) => updateTierNewModel(tier.uid, val)}
                            options={availableModels}
                            placeholder={t('model_groups.model_placeholder')}
                          />
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => addModelToTier(tier.uid)}>
                          {t('model_groups.tier_add_model_button')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <Button variant="secondary" onClick={closeEdit} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
