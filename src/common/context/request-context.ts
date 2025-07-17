import { AsyncLocalStorage } from 'async_hooks';

type Store = {
  user?: any;
};

export const requestContext = new AsyncLocalStorage<Store>();

export function getLoginUser() {
  const userInfo = requestContext.getStore()?.user;
  if (!userInfo) {
    throw new Error('User not found');
  }
  return {
    ...userInfo,
    id: userInfo?.sub,
  };
}
