import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useAuthStore, useNotificationStore } from '@/stores';
import { apiKeyConfigsApi, type APIKeyConfig } from '@/services/api/apiKeyConfigs';
import { modelGroupsApi } from '@/services/api/modelGroups';
import { apiKeysApi } from '@/services/api/apiKeys';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import styles from './ApiKeyConfigsPage.module.scss';

interface EditState {
  open: boolean;
  original: APIKeyConfig | null;
  key: string;
  label: string;
  modelGroup: string;
}

const EMPTY_EDIT: EditState = {
  open: false,
  original: null,
  key: '',
  label: '',
  modelGroup: '',
};

export function ApiKeyConfigsPage() {
  const { t } = useTranslation();
  const { showNotification, showConfirmation } = useNotificationStore();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const disabled = connectionStatus !== 'connected';

  const [configs, setConfigs] = useState<APIKeyConfig[]>([]);
  const [modelGroupNames, setModelGroupNames] = useState<string[]>([]);
  const [existingKeys, setExistingKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, groups, keys] = await Promise.all([apiKeyConfigsApi.list(), modelGroupsApi.list(), apiKeysApi.list()]);
      setConfigs(data);
      setModelGroupNames(groups.map((g) => g.name));
      setExistingKeys(keys);
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

  const openNew = () => setEdit({ ...EMPTY_EDIT, open: true });

  const openEdit = (cfg: APIKeyConfig) => {
    setEdit({
      open: true,
      original: cfg,
      key: cfg.key,
      label: cfg.label ?? '',
      modelGroup: cfg['model-group'] ?? '',
    });
  };

  const closeEdit = () => setEdit(EMPTY_EDIT);

  const handleSave = async () => {
    const key = edit.key.trim();
    if (!key) {
      showNotification(t('api_key_configs.key_required'), 'warning');
      return;
    }
    const value: APIKeyConfig = {
      key,
      label: edit.label.trim() || undefined,
      'model-group': edit.modelGroup.trim() || undefined,
    };
    setSaving(true);
    try {
      await apiKeyConfigsApi.upsert(value);
      showNotification(
        edit.original ? t('notification.api_key_updated') : t('notification.api_key_added'),
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

  const handleDelete = (cfg: APIKeyConfig) => {
    showConfirmation({
      title: t('api_key_configs.delete_title'),
      message: t('api_key_configs.delete_confirm', { key: cfg.key }),
      variant: 'danger',
      confirmText: t('common.delete'),
      onConfirm: async () => {
        try {
          await apiKeyConfigsApi.delete(cfg.key);
          showNotification(t('notification.api_key_deleted'), 'success');
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
          <h1 className={styles.pageTitle}>{t('api_key_configs.title')}</h1>
          {!loading && (
            <span className={styles.countBadge}>{configs.length}</span>
          )}
        </div>
        <p className={styles.description}>{t('api_key_configs.description')}</p>
      </div>

      <div className={styles.headerActions}>
        <Button onClick={openNew} disabled={disabled}>
          {t('api_key_configs.add_button')}
        </Button>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {loading ? (
        <div className={styles.loadingBox}>{t('common.loading')}</div>
      ) : configs.length === 0 ? (
        <div className={styles.emptyBox}>
          <div className={styles.emptyTitle}>{t('api_key_configs.empty_title')}</div>
          <div className={styles.emptyDesc}>{t('api_key_configs.empty_desc')}</div>
        </div>
      ) : (
        <div className={styles.grid}>
          {configs.map((cfg) => (
            <Card
              key={cfg.key}
              title={cfg.label || cfg.key}
              extra={
                <div className={styles.cardActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(cfg)}
                    disabled={disabled}
                  >
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(cfg)}
                    disabled={disabled}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              }
            >
              <div className={styles.cardBody}>
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{t('api_key_configs.field_key')}</span>
                  <span className={styles.fieldValue}>{cfg.key}</span>
                </div>
                {cfg['model-group'] && (
                  <div className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>{t('api_key_configs.field_model_group')}</span>
                    <span className={styles.fieldValue}>{cfg['model-group']}</span>
                  </div>
                )}
                {!cfg['model-group'] && (
                  <div className={styles.noRestriction}>{t('api_key_configs.no_restriction')}</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {edit.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>
              {edit.original ? t('api_key_configs.edit_modal_title') : t('api_key_configs.add_modal_title')}
            </h2>
            <div className={styles.modalBody}>
              <AutocompleteInput
                label={t('api_key_configs.field_key')}
                value={edit.key}
                onChange={(val) => setEdit((prev) => ({ ...prev, key: val }))}
                options={existingKeys}
                placeholder={t('api_key_configs.key_placeholder')}
                disabled={!!edit.original}
              />
              <Input
                label={t('api_key_configs.field_label')}
                value={edit.label}
                onChange={(e) => setEdit((prev) => ({ ...prev, label: e.target.value }))}
                placeholder={t('api_key_configs.label_placeholder')}
              />
              <AutocompleteInput
                label={t('api_key_configs.field_model_group')}
                hint={t('api_key_configs.model_group_hint')}
                value={edit.modelGroup}
                onChange={(val) => setEdit((prev) => ({ ...prev, modelGroup: val }))}
                options={modelGroupNames}
                placeholder={t('api_key_configs.model_group_placeholder')}
              />
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
