export const scriptParameters = [
  { nxScope: 'run-many', nxCommand: 'nx show projects', npmSuffix: 'all' },
  {
    nxScope: 'affected',
    nxCommand: 'nx show projects --affected',
    npmSuffix: 'affected',
  },
];
