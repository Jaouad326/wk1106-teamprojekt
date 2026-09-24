import { api } from '../../api.js';

export const getGroups = () => api('/groups');
export const createGroup = name => api('/groups', { method: 'POST', body: { name } });
export const getGroupMembers = groupId => api(`/groups/${groupId}/members`);
export const addGroupMember = (groupId, email) => api(`/groups/${groupId}/members`, {
  method: 'POST',
  body: { email }
});
export const removeGroupMember = (groupId, userId) => api(`/groups/${groupId}/members/${userId}`, {
  method: 'DELETE',
  body: {}
});
