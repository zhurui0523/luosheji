import { ExtensionPermission, RuntimeContext } from '../types';

const HIGH_RISK_PERMISSIONS: ExtensionPermission[] = [
  'run_code',
  'access_files',
  'manage_plugins',
  'use_network'
];

export interface PermissionGuardTarget {
  id: string;
  type: 'skill' | 'agent' | 'adapter' | 'plugin' | 'model';
  permissions?: ExtensionPermission[];
}

class PermissionGuardService {
  assertCanExecute(target: PermissionGuardTarget, context: RuntimeContext = {}) {
    const requested = target.permissions || [];
    if (requested.length === 0) {
      return;
    }

    const granted = new Set(context.permissions || []);
    const missing = requested.filter(permission => !granted.has(permission));
    const highRiskMissing = missing.filter(permission => HIGH_RISK_PERMISSIONS.includes(permission));

    if (highRiskMissing.length > 0) {
      throw new Error(
        `Permission denied: ${target.type} "${target.id}" requires ${highRiskMissing.join(', ')}.`
      );
    }
  }
}

export const PermissionGuard = new PermissionGuardService();

