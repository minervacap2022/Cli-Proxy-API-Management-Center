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

interface ModelEntryDraft {
  model: string;
  priority: string;
}

interface EditState {
  open: boolean;
  original: ModelGroup | null;
  name: string;
  entries: ModelEntryDraft[];
}

const EMPTY_ENTRY: ModelEntryDraft = { model: '', priority: '1' };

const EMPTY_EDIT: EditState = {
  open: false,
  original: null,
  name: '',
  entries: [{ ...EMPTY_ENTRY }],
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

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEdit({ ...EMPTY_EDIT, entries: [{ ...EMPTY_ENTRY }] });
  };

  const openEdit = (group: ModelGroup) => {
    setEdit({
      open: true,
      original: group,
      name: group.name,
      entries: group.models.length > 0
        ? group.models.map((m) => ({ model: m.model, priority: String(m.priority) }))
        : [{ ...EMPTY_ENTRY }],
    });
  };

  const closeEdit = () => setEdit(EMPTY_EDIT);

  const addEntry = () =>
    setEdit((prev) => ({ ...prev, entries: [...prev.entries, { ...EMPTY_ENTRY }] }));

  const removeEntry = (index: number) =>
    setEdit((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index),
    }));

  const updateEntry = (index: number, field: keyof ModelEntryDraft, value: string) =>
    setEdit((prev) => ({
      ...prev,
      entries: prev.entries.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    }));

  const handleSave = async () => {
    const name = edit.name.trim();
    if (!name) {
      showNotification(t('model_groups.name_required'), 'warning');
      return;
    }
    const models: ModelGroupEntry[] = edit.entries
      .filter((e) => e.model.trim())
      .map((e) => ({
        model: e.model.trim(),
        priority: parseInt(e.priority, 10) || 1,
      }));
    if (models.length === 0) {
      showNotification(t('model_groups.models_required'), 'warning');
      return;
    }
    const value: ModelGroup = { name, models };
    setSaving(true);
    try {
      await modelGroupsApi.upsert(value);
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

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.pageTitle}>{t('model_groups.title')}</h1>
          {!loading && (
            <span className={styles.countBadge}>{groups.length}</span>
          )}
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
          {groups.map((group) => (
            <Card
              key={group.name}
              title={group.name}
              extra={
                <div className={styles.cardActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(group)}
                    disabled={disabled}
                  >
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(group)}
                    disabled={disabled}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              }
            >
              <div className={styles.modelList}>
                {[...group.models]
                  .sort((a, b) => b.priority - a.priority)
                  .map((entry, idx) => (
                    <div key={idx} className={styles.modelEntry}>
                      <span className={styles.priorityBadge}>{entry.priority}</span>
                      <span className={styles.modelName}>{entry.model}</span>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
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
              <div className={styles.entriesSection}>
                <div className={styles.entriesLabel}>{t('model_groups.field_models')}</div>
                {edit.entries.map((entry, idx) => (
                  <div key={idx} className={styles.entryRow}>
                    <div className={styles.entryModel}>
                      <AutocompleteInput
                        value={entry.model}
                        onChange={(val) => updateEntry(idx, 'model', val)}
                        options={availableModels}
                        placeholder={t('model_groups.model_placeholder')}
                      />
                    </div>
                    <div className={styles.entryPriority}>
                      <Input
                        value={entry.priority}
                        onChange={(e) => updateEntry(idx, 'priority', e.target.value)}
                        placeholder={t('model_groups.priority_placeholder')}
                        type="number"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(idx)}
                      disabled={edit.entries.length <= 1}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" onClick={addEntry}>
                  {t('model_groups.add_model_button')}
                </Button>
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
