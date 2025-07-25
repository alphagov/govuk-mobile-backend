import { defineProject, mergeConfig } from 'vitest/config';
// eslint-disable-next-line @nx/enforce-module-boundaries
import configShared from '../vitest.config';

export default mergeConfig(configShared, defineProject({}));
