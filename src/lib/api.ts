import type { Application, AdminUser, UserProfile } from "../types/database";
import * as appSvc from "../services/applicationService";
import * as profileSvc from "../services/profileService";
import * as adminSvc from "../services/adminService";

// =====================
// APPLICATIONS
// =====================

export async function listApplications(): Promise<{ applications: Application[]; error?: string }> {
  const res = await appSvc.fetchApplications();
  return { applications: res.data ?? [], error: res.error };
}

export async function createApplication(
  name: string,
  type: string
): Promise<{ application?: Application; error?: string; next_allowed_at?: string }> {
  const res = await appSvc.createApplication(name, type);
  return { application: res.data, error: res.error, next_allowed_at: res.next_allowed_at };
}

export async function deleteApplication(id: string): Promise<{ success?: boolean; error?: string }> {
  const res = await appSvc.removeApplication(id);
  return { success: res.success, error: res.error };
}

// =====================
// PROFILE
// =====================

export async function getProfile(): Promise<{ profile?: UserProfile; error?: string }> {
  const res = await profileSvc.fetchProfile();
  return { profile: res.data, error: res.error };
}

export async function updateProfile(
  updates: Partial<UserProfile> & { newPassword?: string; newEmail?: string }
): Promise<{ success?: boolean; profile?: UserProfile; error?: string }> {
  const res = await profileSvc.saveProfile(updates);
  return { success: res.success, profile: res.data, error: res.error };
}

// =====================
// ADMIN
// =====================

export async function adminListUsers(): Promise<{ users: AdminUser[]; error?: string }> {
  const res = await adminSvc.fetchAllUsers();
  return { users: res.data ?? [], error: res.error };
}

export async function adminUpdateUser(
  userId: string,
  updates: { newPassword?: string; newEmail?: string }
): Promise<{ success?: boolean; error?: string }> {
  const res = await adminSvc.updateUser(userId, updates);
  return { success: res.success, error: res.error };
}

export async function adminDeleteUser(userId: string): Promise<{ success?: boolean; error?: string }> {
  const res = await adminSvc.deleteUser(userId);
  return { success: res.success, error: res.error };
}

export async function adminUpdateApplication(
  appId: string,
  newName: string
): Promise<{ success?: boolean; error?: string }> {
  const res = await adminSvc.updateApplication(appId, newName);
  return { success: res.success, error: res.error };
}

export async function adminDeleteApplication(appId: string): Promise<{ success?: boolean; error?: string }> {
  const res = await adminSvc.deleteApplication(appId);
  return { success: res.success, error: res.error };
}

export async function adminRotatePassword(
  appId: string
): Promise<{ success?: boolean; new_password?: string; new_url?: string; error?: string }> {
  const res = await adminSvc.rotatePassword(appId);
  return { success: res.success, new_password: res.data?.new_password, new_url: res.data?.new_url, error: res.error };
}
