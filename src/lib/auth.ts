
export const assignUserRole = (email: string) => {
  if (email && email.endsWith('@admin.com')) {
    return 'admin';
  }
  return 'shop';
};
