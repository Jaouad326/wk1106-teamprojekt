import { api } from '../../api.js';

export const getGroups = () => api('/groups');
export const createGroup = name => api('/groups', { method: 'POST', body: { name } });
export const getGroupMembers = groupId => api(`/groups/${groupId}/members`);
export const inviteGroupMember = (groupId, email) => api(`/groups/${groupId}/invitations`, {
  method: 'POST',
  body: { email }
});
export const removeGroupMember = (groupId, userId) => api(`/groups/${groupId}/members/${userId}`, {
  method: 'DELETE',
  body: {}
});
export const leaveGroup = (groupId, successorId) => api(
  `/groups/${groupId}/membership`,
  {
    method: 'DELETE',
    body: { successorId }
  }
);
export const getGroupInvitations = () => api('/groups/invitations');

export const acceptGroupInvitation = invitationId => api(
  `/groups/invitations/${invitationId}/accept`,
  {
    method: 'POST',
    body: {}
  }
);

export const declineGroupInvitation = invitationId => api(
  `/groups/invitations/${invitationId}/decline`,
  {
    method: 'POST',
    body: {}
  }
);