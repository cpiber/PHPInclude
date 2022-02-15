declare module 'rollup/dist/loadConfigFile' {
  const loadAndParseConfigFile: (fileName: string, commandOptions?: any) => Promise<{ options: import('rollup').MergedRollupOptions[]; warnings: { warningOccurred: boolean }; }>;
  export default loadAndParseConfigFile;
}
