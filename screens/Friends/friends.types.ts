export type UserResult = {
  id: string;
  name: string;
  email: string;
};

export type FriendRequest = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  requesterName?: string;
  requesterEmail?: string;
};
