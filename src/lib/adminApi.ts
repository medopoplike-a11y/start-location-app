const handleResponse = async (response: Response) => {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || response.statusText || 'API request failed');
  }

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const fetchAdminOrders = async () => {
  return await handleResponse(await fetch('/api/admin/orders'));
};

export const fetchAdminProfiles = async () => {
  return await handleResponse(await fetch('/api/admin/profiles'));
};

export const resetUserDataAdmin = async (targetUserId: string) => {
  return await handleResponse(
    await fetch('/api/admin/reset-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: targetUserId })
    })
  );
};

export const resetAllSystemDataAdmin = async () => {
  return await handleResponse(
    await fetch('/api/admin/reset-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
  );
};

export const fetchAdminAppConfig = async () => {
  return await handleResponse(await fetch('/api/admin/app-config'));
};

export const updateAdminAppConfig = async (config: Record<string, unknown>) => {
  return await handleResponse(
    await fetch('/api/admin/app-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
  );
};
