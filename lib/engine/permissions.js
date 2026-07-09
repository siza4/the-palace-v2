'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Check if a member has a specific permission
 * @param {string} memberId - Member UUID
 * @param {string} permissionName - Permission name to check
 * @returns {Promise<boolean>} True if member has permission
 */
export async function hasPermission(memberId, permissionName) {
  try {
    // Get member's roles
    const { data: memberRoles, error: rolesError } = await supabase
      .from('member_roles')
      .select('role_id')
      .eq('member_id', memberId);

    if (rolesError) throw rolesError;
    if (!memberRoles || memberRoles.length === 0) return false;

    const roleIds = memberRoles.map(mr => mr.role_id);

    // Check if any of the roles have this permission
    const { data: rolePerms, error: permsError } = await supabase
      .from('role_permissions')
      .select('role_id')
      .in('role_id', roleIds)
      .eq('permission_id', 
        await getPermissionId(permissionName)
      );

    if (permsError) throw permsError;
    return rolePerms && rolePerms.length > 0;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get permission ID by name
 * @param {string} permissionName - Permission name
 * @returns {Promise<string>} Permission UUID
 */
async function getPermissionId(permissionName) {
  const { data: perm, error } = await supabase
    .from('permissions')
    .select('id')
    .eq('name', permissionName)
    .single();

  if (error) throw error;
  return perm?.id;
}

/**
 * Get all permissions for a role
 * @param {string} roleId - Role UUID
 * @returns {Promise<Array>} Permission objects
 */
export async function getRolePermissions(roleId) {
  try {
    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select(`
        permission_id,
        permission:permission_id (
          name,
          description,
          category
        )
      `)
      .eq('role_id', roleId);

    if (error) throw error;
    return permissions?.map(rp => rp.permission) || [];
  } catch (error) {
    console.error('Error getting role permissions:', error);
    throw error;
  }
}

/**
 * Get all permissions for a member (via roles)
 * @param {string} memberId - Member UUID
 * @returns {Promise<Array>} Permission objects
 */
export async function getMemberPermissions(memberId) {
  try {
    const { data: memberRoles, error: rolesError } = await supabase
      .from('member_roles')
      .select('role_id')
      .eq('member_id', memberId);

    if (rolesError) throw rolesError;
    if (!memberRoles || memberRoles.length === 0) return [];

    const roleIds = memberRoles.map(mr => mr.role_id);

    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select(`
        permission:permission_id (
          id,
          name,
          description,
          category
        )
      `)
      .in('role_id', roleIds);

    if (error) throw error;
    
    // Deduplicate permissions
    const uniquePerms = {};
    permissions?.forEach(rp => {
      if (rp.permission) {
        uniquePerms[rp.permission.id] = rp.permission;
      }
    });

    return Object.values(uniquePerms);
  } catch (error) {
    console.error('Error getting member permissions:', error);
    throw error;
  }
}

import { canAccessChamber as checkChamberAccess } from '../services/chamber.service';

/**
 * Check if member can access a specific chamber.
 * Delegates to lib/services/chamber.service.js — the single source of
 * truth for Chamber access, which checks both member_chambers listing
 * AND required_office (Charter 21.10). This function previously had its
 * own divergent logic that ignored required_office entirely and fell
 * back to a 'view_chamber' permission nobody was ever assigned.
 * @param {string} memberId - Member UUID
 * @param {string} chamberId - Chamber UUID
 * @returns {Promise<boolean>} True if member has access
 */
export async function canAccessChamber(memberId, chamberId) {
  return await checkChamberAccess(memberId, chamberId);
}

/**
 * Grant a permission to a role
 * @param {string} roleId - Role UUID
 * @param {string} permissionName - Permission name
 * @returns {Promise<Object>} Created role_permission
 */
export async function grantPermissionToRole(roleId, permissionName) {
  try {
    const permId = await getPermissionId(permissionName);

    const { data: rolePermission, error } = await supabase
      .from('role_permissions')
      .insert({
        role_id: roleId,
        permission_id: permId
      })
      .select()
      .single();

    if (error) throw error;
    return rolePermission;
  } catch (error) {
    console.error('Error granting permission:', error);
    throw error;
  }
}

/**
 * Revoke a permission from a role
 * @param {string} roleId - Role UUID
 * @param {string} permissionName - Permission name
 * @returns {Promise<void>}
 */
export async function revokePermissionFromRole(roleId, permissionName) {
  try {
    const permId = await getPermissionId(permissionName);

    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permId);

    if (error) throw error;
  } catch (error) {
    console.error('Error revoking permission:', error);
    throw error;
  }
}

/**
 * Check if member can perform an action in a chamber
 * @param {string} memberId - Member UUID
 * @param {string} chamberId - Chamber UUID
 * @param {string} action - Action name (post_in_chamber, create_chamber, etc)
 * @returns {Promise<boolean>} True if member can perform action
 */
export async function canPerformChamberAction(memberId, chamberId, action) {
  try {
    // First check if has access to chamber
    const hasAccess = await canAccessChamber(memberId, chamberId);
    if (!hasAccess) return false;

    // Then check if has permission for action
    return await hasPermission(memberId, action);
  } catch (error) {
    console.error('Error checking chamber action:', error);
    return false;
  }
}
