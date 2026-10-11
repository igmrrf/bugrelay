import tseslint from 'typescript-eslint';
export default tseslint.config(
 {ignores:['**/node_modules/**','**/.next/**','**/.open-next/**','**/dist/**','**/.wrangler/**']},
 ...tseslint.configs.recommended,
 {files:['**/*.{ts,tsx}'],rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}}
);
