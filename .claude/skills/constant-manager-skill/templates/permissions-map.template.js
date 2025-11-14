import { TEAM_ROLES } from '../core/constants.js';

/**
 * [DOMAIN] permission definitions
 * @type {Object}
 * @constant
 */
export const [DOMAIN]_PERMISSIONS = {
  CAN_VIEW_[RESOURCE]: 'can_view_[resource]',
  CAN_CREATE_[RESOURCE]: 'can_create_[resource]',
  CAN_EDIT_[RESOURCE]: 'can_edit_[resource]',
  CAN_DELETE_[RESOURCE]: 'can_delete_[resource]',
  CAN_MANAGE_[RESOURCE]: 'can_manage_[resource]',
  CAN_EXPORT_[RESOURCE]: 'can_export_[resource]'
};

/**
 * Default permissions by team role for [domain]
 * @type {Object}
 * @constant
 */
export const DEFAULT_[DOMAIN]_PERMISSIONS_BY_ROLE = {
  [TEAM_ROLES.MANAGER]: {
    [PERMISSIONS.CAN_VIEW_[RESOURCE]]: true,
    [PERMISSIONS.CAN_CREATE_[RESOURCE]]: true,
    [PERMISSIONS.CAN_EDIT_[RESOURCE]]: true,
    [PERMISSIONS.CAN_DELETE_[RESOURCE]]: true,
    [PERMISSIONS.CAN_MANAGE_[RESOURCE]]: true,
    [PERMISSIONS.CAN_EXPORT_[RESOURCE]]: true
  },
  [TEAM_ROLES.EMPLOYEE]: {
    [PERMISSIONS.CAN_VIEW_[RESOURCE]]: true,
    [PERMISSIONS.CAN_CREATE_[RESOURCE]]: true,
    [PERMISSIONS.CAN_EDIT_[RESOURCE]]: true,
    [PERMISSIONS.CAN_DELETE_[RESOURCE]]: false,
    [PERMISSIONS.CAN_MANAGE_[RESOURCE]]: false,
    [PERMISSIONS.CAN_EXPORT_[RESOURCE]]: false
  },
  [TEAM_ROLES.CONTRACTOR]: {
    [PERMISSIONS.CAN_VIEW_[RESOURCE]]: true,
    [PERMISSIONS.CAN_CREATE_[RESOURCE]]: true,
    [PERMISSIONS.CAN_EDIT_[RESOURCE]]: false,
    [PERMISSIONS.CAN_DELETE_[RESOURCE]]: false,
    [PERMISSIONS.CAN_MANAGE_[RESOURCE]]: false,
    [PERMISSIONS.CAN_EXPORT_[RESOURCE]]: false
  },
  [TEAM_ROLES.INTERN]: {
    [PERMISSIONS.CAN_VIEW_[RESOURCE]]: true,
    [PERMISSIONS.CAN_CREATE_[RESOURCE]]: false,
    [PERMISSIONS.CAN_EDIT_[RESOURCE]]: false,
    [PERMISSIONS.CAN_DELETE_[RESOURCE]]: false,
    [PERMISSIONS.CAN_MANAGE_[RESOURCE]]: false,
    [PERMISSIONS.CAN_EXPORT_[RESOURCE]]: false
  },
  [TEAM_ROLES.VIEW_ONLY]: {
    [PERMISSIONS.CAN_VIEW_[RESOURCE]]: true,
    [PERMISSIONS.CAN_CREATE_[RESOURCE]]: false,
    [PERMISSIONS.CAN_EDIT_[RESOURCE]]: false,
    [PERMISSIONS.CAN_DELETE_[RESOURCE]]: false,
    [PERMISSIONS.CAN_MANAGE_[RESOURCE]]: false,
    [PERMISSIONS.CAN_EXPORT_[RESOURCE]]: false
  }
};

/**
 * Example Usage:
 *
 * import { [DOMAIN]_PERMISSIONS, DEFAULT_[DOMAIN]_PERMISSIONS_BY_ROLE } from '@/lib/services/constants';
 *
 * const permissions = DEFAULT_[DOMAIN]_PERMISSIONS_BY_ROLE[userRole];
 *
 * if (permissions[PERMISSIONS.CAN_DELETE_[RESOURCE]]) {
 *   // User can delete resource
 * }
 */
