import { z } from 'zod';

const GITHUB_URL_REGEX = /^(https?:\/\/)?(www\.)?github\.com\/[\w\-]+\/[\w\-\.]+\/?$/;

export const githubCloneSchema = z.object({
  url: z.string({
    required_error: 'GitHub URL is required'
  })
  .url({ message: 'Must be a valid web URL' })
  .refine(val => GITHUB_URL_REGEX.test(val), {
    message: 'Must be a valid GitHub repository URL (e.g. https://github.com/user/repo)'
  })
});
