const onlineUsers = new Map<string, string>();

export const markOnline = (userId: string, socketId: string) => onlineUsers.set(userId, socketId);
export const getSocketId = (userId: string) => onlineUsers.get(userId);

