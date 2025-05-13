export const transformCognitoUrl = (url: string | undefined) => {
  return url?.toLowerCase().replace('_', '')
}

