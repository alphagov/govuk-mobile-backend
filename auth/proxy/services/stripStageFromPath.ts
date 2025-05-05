// removes stage i.e. dev/test/prod from the path to allow 
export const stripStageFromPath = (stage: string, path: string): string => {
  if (path.startsWith(`/${stage}`)) {
    return path.slice(stage.length + 1);
  }
  return path
}
