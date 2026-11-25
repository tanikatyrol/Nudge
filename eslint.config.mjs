import nextConfig from 'eslint-config-next'

// eslint-config-next@16 exports its flat configs as an array
// (core rules + typescript rules + ignores).
const eslintConfig = [
  ...(Array.isArray(nextConfig) ? nextConfig : [nextConfig]),
  {
    ignores: ['.next/', 'node_modules/', 'public/', 'scripts/', 'next-env.d.ts'],
  },
]

export default eslintConfig
